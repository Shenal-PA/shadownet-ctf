#!/usr/bin/env python3
"""Read-only readiness report. Never creates, restores, boots or stops a VM."""
import json
import os
from pathlib import Path
from gateway import Pool, validate_routing


def main():
    checks = []
    def check(name, passed, detail):
        checks.append({'check': name, 'passed': bool(passed), 'detail': detail})
    check('VirtualBox device', Path('/dev/vboxdrv').exists(), 'Run this check in the actual host environment.')
    memory = next(int(line.split()[1]) // 1024 for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemAvailable:'))
    check('Two-slot memory budget', memory >= 4864, 'Suggested minimum available RAM: 4096 MiB for two guests plus 768 MiB reserve.')
    isolation_confirmed = False
    config = os.environ.get('STAGE7_LOCAL_CONFIG')
    if config:
        path = Path(config)
        private = path.is_file() and not path.is_symlink() and path.stat().st_uid == os.getuid() and not path.stat().st_mode & 0o077
        check('Private configuration permissions', private, 'Owner-only regular file required.')
        if private:
            try:
                pool = Pool(json.loads(path.read_text()))
                isolation_confirmed = pool.config.get('network_isolation_verified') is True
                try:
                    validate_routing(pool.config)
                    check('Dedicated adapter routing', True, 'IPv4 and IPv6 forwarding disabled on every dedicated adapter.')
                except ValueError:
                    check('Dedicated adapter routing', False, 'Disable forwarding on dedicated lab adapters; unrelated host routing may remain enabled.')
                for index, guest in enumerate(pool.labs, 1):
                    controller = pool.controllers[id(guest)]
                    try:
                        info = controller.info()
                        controller.validate(info)
                        check(f'Slot {index} VM isolation and power', info.get('VMState') == 'poweroff', 'Dedicated VM must be powered off before allocation.')
                        snapshots = controller.parse(controller.command('snapshot', controller.config['vm_uuid'], 'list', '--machinereadable'))
                        found = controller.config['snapshot_uuid'].lower() in [v.lower() for k, v in snapshots.items() if k.startswith('SnapshotUUID')]
                        check(f'Slot {index} clean snapshot', found, 'Exact configured snapshot UUID must exist.')
                    except Exception:
                        check(f'Slot {index} VM readiness', False, 'Review VM identity, adapters, sharing settings and snapshot through VirtualBox.')
            except Exception:
                check('Configuration schema', False, 'Invalid configuration; secrets and raw exceptions are intentionally not printed.')
    else:
        check('Private configuration', False, 'Set STAGE7_LOCAL_CONFIG after preparing the dedicated VM slots.')
    check('Organizer isolation confirmation', isolation_confirmed, 'Recorded manual confirmation only; this preflight does not probe firewall rules. Revalidate guest-to-host, other-slot and internet isolation after network/firewall changes.')
    print(json.dumps({'ready': all(c['passed'] for c in checks), 'checks': checks}, indent=2))
    return 0 if all(c['passed'] for c in checks) else 1


if __name__ == '__main__':
    raise SystemExit(main())
