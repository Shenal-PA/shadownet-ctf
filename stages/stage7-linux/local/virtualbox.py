"""Manage explicitly configured, disposable Stage 7 VMs only. No host setup."""
import re
import subprocess
import time
import threading
from pathlib import Path


class VirtualBox:
    boot_lock = threading.Lock()
    def __init__(self, config, run=subprocess.run, sleep=time.sleep):
        self.config, self.run, self.sleep = config, run, sleep
        self.started = False
        for field in ('vm_uuid', 'snapshot_uuid'):
            if not re.fullmatch(r'[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}', config[field]):
                raise ValueError('Use explicit VM and clean snapshot UUIDs.')
        if config.get('dedicated_stage7_vm') is not True:
            raise ValueError('Require dedicated_stage7_vm confirmation for each disposable slot.')
        if not re.fullmatch(r'vboxnet[0-9]+', config['hostonly_adapter']):
            raise ValueError('Require an explicitly configured Linux host-only adapter.')

    def command(self, *args):
        result = self.run(['/usr/bin/VBoxManage', *args], check=True, capture_output=True,
                          text=True, timeout=90)
        return result.stdout

    @staticmethod
    def parse(value):
        return dict((key, val.strip('"')) for line in value.splitlines()
                    if '=' in line for key, val in [line.split('=', 1)])

    def info(self):
        return self.parse(self.command('showvminfo', self.config['vm_uuid'], '--machinereadable'))

    def validate(self, info):
        if info.get('UUID', '').lower() != self.config['vm_uuid'].lower():
            raise ValueError('VM identity mismatch.')
        if info.get('nic1') != 'hostonly' or info.get('hostonlyadapter1') != self.config['hostonly_adapter']:
            raise ValueError('Require the designated isolated host-only adapter.')
        for i in range(2, 9):
            if info.get(f'nic{i}', 'none') != 'none':
                raise ValueError('Extra network adapters are prohibited.')
        if info.get('clipboard', info.get('clipboardmode')) != 'disabled' or info.get('draganddrop') != 'disabled':
            raise ValueError('Disable shared clipboard and drag-and-drop.')
        if any(k.startswith(('SharedFolderName', 'SharedFolderPath', 'USBFilter')) for k in info):
            raise ValueError('Shared folders and USB filters are prohibited.')
        if info.get('usb', 'off') != 'off' or info.get('ehci', 'off') != 'off' or info.get('xhci', 'off') != 'off':
            raise ValueError('Disable USB controllers for the lab.')
        if info.get('vrde', 'off') != 'off':
            raise ValueError('Remote display is prohibited.')

    def restore_and_boot(self):
        info = self.info()
        self.validate(info)
        if info.get('VMState') != 'poweroff':
            raise ValueError('New allocation requires a powered-off dedicated VM. Review it manually.')
        snapshots = self.parse(self.command('snapshot', self.config['vm_uuid'], 'list', '--machinereadable'))
        if self.config['snapshot_uuid'].lower() not in [v.lower() for k, v in snapshots.items() if k.startswith('SnapshotUUID')]:
            raise ValueError('Configured clean snapshot was not found.')
        self.command('snapshot', self.config['vm_uuid'], 'restore', self.config['snapshot_uuid'])
        restored = self.info()
        self.validate(restored)
        if restored.get('VMState') != 'poweroff':
            raise ValueError('Require a powered-off clean snapshot, not a saved running state.')
        with self.boot_lock:
            available = next(int(line.split()[1]) // 1024 for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemAvailable:'))
            if available < int(restored.get('memory', '2048')) + 768:
                raise ValueError('Insufficient available host RAM for another VM plus host reserve.')
            self.started = True
            self.command('startvm', self.config['vm_uuid'], '--type', 'headless')

    def poweroff(self):
        if not self.started:
            return  # Never stop a VM this controller did not start.
        info = self.info()
        if info.get('UUID', '').lower() != self.config['vm_uuid'].lower():
            raise ValueError('VM identity mismatch.')
        state = info.get('VMState')
        if state == 'poweroff':
            self.started = False
            return
        if state not in ('running', 'paused'):
            raise ValueError('Unexpected VM state; organizer review required.')
        self.command('controlvm', self.config['vm_uuid'], 'poweroff')
        for _ in range(20):
            if self.info().get('VMState') == 'poweroff':
                self.started = False
                return
            self.sleep(0.5)
        raise ValueError('VM did not power off.')
