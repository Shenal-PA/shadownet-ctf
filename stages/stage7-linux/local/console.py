#!/usr/bin/env python3
"""Organizer-only local demo access using an owner-only gateway configuration."""
import argparse
import http.client
import json
import os
import secrets
import stat
import time
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--user', required=True, help='Explicit organizer-approved local demo user ID')
    parser.add_argument('action', choices=('start', 'status', 'reset', 'stop'))
    args = parser.parse_args()
    path = Path(os.environ.get('STAGE7_LOCAL_CONFIG') or Path.home() / '.local/share/shadownet-stage7/config.json')
    mode = path.lstat()
    if not stat.S_ISREG(mode.st_mode) or mode.st_uid != os.getuid() or mode.st_mode & 0o077:
        parser.error('Use an owner-only regular private configuration file.')
    config = json.loads(path.read_text())
    if args.user not in config['allowed_users']:
        parser.error('User is not in the organizer demo allowlist.')
    port = config.get('port', 5007)
    if not isinstance(port, int) or not 1024 <= port <= 65535:
        parser.error('Invalid local gateway port.')
    def call(action):
        connection = http.client.HTTPConnection('127.0.0.1', port, timeout=15)
        try:
            connection.request('POST', '/v1/stage7/lab', json.dumps({'userId': args.user, 'action': action}), {
                'Content-Type': 'application/json', 'Authorization': 'Bearer ' + config['gateway_key'],
                'Idempotency-Key': secrets.token_hex(16),
            })
            response = connection.getresponse()
            body = response.read(16385)
            if response.status != 200 or len(body) > 16384:
                raise RuntimeError('Gateway refused the request; check capacity, access or current lab state.')
            return json.loads(body)
        finally:
            connection.close()
    try:
        lab = call(args.action)
        deadline = time.monotonic() + 180
        while lab['state'] in ('starting', 'stopping') and args.action != 'status':
            if time.monotonic() >= deadline:
                raise RuntimeError('Lab is still changing state; use status to check again.')
            time.sleep(1)
            lab = call('status')
        print('Lab state: ' + lab['state'])
        if lab['state'] == 'ready':
            from urllib.parse import urlparse
            url = urlparse(lab['terminalUrl'])
            if url.scheme != 'http' or url.netloc != f'127.0.0.1:{port}' or not url.path.startswith('/connect/') or url.query or url.fragment:
                raise RuntimeError('Invalid terminal address.')
            print('Open in your local browser within 60 seconds (single use; keep private):')
            print(lab['terminalUrl'])
        return 1 if lab['state'] == 'error' else 0
    except (OSError, ValueError, KeyError, RuntimeError, http.client.HTTPException):
        print('Local lab request failed. Check the gateway, VM state and private configuration.')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
