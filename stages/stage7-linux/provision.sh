#!/usr/bin/env bash
# Install ONLY inside a disposable, dedicated Ubuntu Stage 7 virtual machine.
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
umask 077

fail() { printf '%s\n' "$*" >&2; exit 1; }
[[ "${1:-}" == '--dedicated-lab-vm' && "$#" == 1 ]] || fail 'Usage inside the dedicated VM: sudo ./provision.sh --dedicated-lab-vm'
[[ "$EUID" -eq 0 ]] || fail 'Run from a root console or sudo inside the lab VM.'
[[ -f /etc/os-release ]] || fail 'Cannot identify guest operating system.'
# shellcheck disable=SC1091
source /etc/os-release
[[ "$ID" == ubuntu && "$VERSION_ID" == 22.04 ]] || fail 'This installer targets a dedicated Ubuntu 22.04 VM.'
/usr/bin/systemd-detect-virt --vm >/dev/null || fail 'Refusing to configure a physical host or container. Use the dedicated lab VM.'

stage_source="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
state_dir=/var/lib/shadownet-stage7
marker="$state_dir/installed"
exists() { [[ -e "$1" || -L "$1" ]]; }
# Fresh installation only. Re-running must never silently repair/overwrite a lab.
if exists "$state_dir"; then
    fail 'Stage 7 state already exists (complete or partial). Review it and restore the clean VM snapshot before retrying.'
fi
for required in maintenance/nexa-audit.c guest/nexa-report guest/shift-notes.txt guest/motd; do
    [[ -f "$stage_source/$required" && ! -L "$stage_source/$required" ]] || fail "Missing or symlinked source: $required"
done
if id analyst >/dev/null 2>&1 || getent group analyst >/dev/null; then
    fail 'An analyst account/group already exists. Use a fresh dedicated VM.'
fi
# Refuse any existing destination, including dangling links.
for target in /root/flag.txt /home/analyst /opt/nexacorp /usr/local/bin/nexa-report \
    /etc/profile.d/nexacorp-stage7.sh /etc/ssh/sshd_config.d/00-shadownet-stage7.conf; do
    exists "$target" && fail "Existing destination requires review: $target"
done
# Reject redirected or user-writable destination ancestors before root writes.
for target in "$state_dir" /root/flag.txt /home/analyst /opt/nexacorp /usr/local/bin/nexa-report \
    /etc/profile.d/nexacorp-stage7.sh /etc/ssh/sshd_config.d/00-shadownet-stage7.conf; do
    parent="$(dirname -- "$target")"
    while [[ "$parent" != / ]]; do
        [[ ! -L "$parent" ]] || fail "Symlinked destination ancestor: $parent"
        if [[ -e "$parent" ]]; then
            [[ -d "$parent" && "$(stat -c %u "$parent")" == 0 ]] || fail "Untrusted destination ancestor: $parent"
            mode="$(stat -c %a "$parent")"
            (( (8#$mode & 0022) == 0 )) || fail "Writable destination ancestor: $parent"
        fi
        parent="$(dirname -- "$parent")"
    done
done
for command in gcc python3 ssh-keygen chpasswd useradd install; do
    command -v "$command" >/dev/null || fail "Missing prerequisite: $command. Install guest dependencies separately, then retry."
done
[[ -x /usr/sbin/sshd && -d /run/sshd && -d /etc/ssh/sshd_config.d && -d /run/systemd/system ]] || fail 'Install and start OpenSSH in the guest before provisioning.'

compiled_binary=''
ssh_candidate=''
ssh_check_config=''
ssh_baseline=''
install_started=0
cleanup() {
    result=$?
    trap - EXIT
    for temporary in "$compiled_binary" "$ssh_candidate" "$ssh_check_config" "$ssh_baseline"; do
        [[ -z "$temporary" ]] || rm -f -- "$temporary"
    done
    if (( result != 0 && install_started == 1 )); then
        printf 'failed\n' > "$state_dir/status"
        printf '%s\n' 'Installation stopped after changes began. Do not retry or use this VM for players; restore its clean snapshot.' >&2
    fi
    exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Validate a supplied flag before making system changes; it is never printed.
if [[ -n "${SHADOWNET_STAGE7_FLAG:-}" ]]; then
    [[ "$SHADOWNET_STAGE7_FLAG" =~ ^SHADOWNET\{[a-z0-9_]+\}$ ]] || fail 'Invalid flag format.'
fi
if [[ -n "${SHADOWNET_STAGE7_PLAYER_PUBLIC_KEY_FILE:-}" ]]; then
    [[ -f "$SHADOWNET_STAGE7_PLAYER_PUBLIC_KEY_FILE" ]] || fail 'Player public-key file does not exist.'
    ssh-keygen -l -f "$SHADOWNET_STAGE7_PLAYER_PUBLIC_KEY_FILE" >/dev/null || fail 'Invalid player public-key file.'
fi

# Compile and validate SSH policy BEFORE modifying guest accounts or destinations.
compiled_binary="$(mktemp)"
gcc -std=c11 -O2 -Wall -Wextra -Werror -fstack-protector-strong -D_FORTIFY_SOURCE=2 -fPIE -pie -Wl,-z,relro,-z,now "$stage_source/maintenance/nexa-audit.c" -o "$compiled_binary"
ssh_candidate="$(mktemp)"
cat > "$ssh_candidate" <<'SSH'
# ShadowNet Stage 7: analyst-only lab access. Added after existing global policy.
Match User analyst
    PasswordAuthentication yes
    PubkeyAuthentication yes
    KbdInteractiveAuthentication no
    AllowTcpForwarding no
    DisableForwarding yes
    PermitUserRC no
    X11Forwarding no
    PermitTunnel no
    Banner /opt/nexacorp/ops/login-banner.txt
Match all
SSH
ssh_check_config="$(mktemp)"
# Match blocks belong after the existing global settings, not in an early drop-in.
[[ -f /etc/ssh/sshd_config && ! -L /etc/ssh/sshd_config ]] || fail 'SSH main configuration must be a regular, non-symlinked file.'
[[ "$(stat -c %u /etc/ssh/sshd_config)" == 0 ]] || fail 'SSH main configuration must be root-owned.'
ssh_mode="$(stat -c %a /etc/ssh/sshd_config)"
(( (8#$ssh_mode & 0022) == 0 )) || fail 'SSH main configuration must not be group/world writable.'
ssh_baseline="$(mktemp)"
cat /etc/ssh/sshd_config > "$ssh_baseline"
cat "$ssh_baseline" > "$ssh_check_config"
printf '\n' >> "$ssh_check_config"
cat "$ssh_candidate" >> "$ssh_check_config"
/usr/sbin/sshd -t -f "$ssh_check_config"
check_analyst_policy() {
    local config="$1" policy expected
    policy="$(/usr/sbin/sshd -T -f "$config" -C user=analyst,host=localhost,addr=127.0.0.1)"
    for expected in 'passwordauthentication yes' 'pubkeyauthentication yes' \
        'kbdinteractiveauthentication no' 'allowtcpforwarding no' \
        'disableforwarding yes' 'permituserrc no' 'x11forwarding no' \
        'permittunnel no' 'banner /opt/nexacorp/ops/login-banner.txt'; do
        grep -qxF -- "$expected" <<< "$policy" || fail 'Existing SSH policy overrides Stage 7 access restrictions. Review it before provisioning.'
    done
}
check_analyst_policy "$ssh_check_config"

# Detect concurrent configuration edits before making any system changes.
cmp -s -- "$ssh_baseline" /etc/ssh/sshd_config || fail 'SSH configuration changed during preflight. Review it and retry.'

# Atomic directory creation also prevents two installers from proceeding together.
mkdir -m 0700 -- "$state_dir"
install_started=1
printf 'installing\n' > "$state_dir/status"
install -m 0600 -o root -g root "$ssh_baseline" "$state_dir/sshd_config.original"
useradd --create-home --shell /bin/bash analyst
chmod 0700 /home/analyst

python3 - <<'PY'
import json, os, secrets, subprocess
from pathlib import Path
state = Path('/var/lib/shadownet-stage7')
access = state / 'access.json'
if not access.exists():
    password = secrets.token_urlsafe(24)
    subprocess.run(['chpasswd'], input=f'analyst:{password}\n', text=True, check=True)
    access.write_text(json.dumps({'username': 'analyst', 'password': password}, indent=2) + '\n')
    access.chmod(0o600)
flag = Path('/root/flag.txt')
configured = os.environ.get('SHADOWNET_STAGE7_FLAG')
if configured or not flag.exists():
    flag.write_text((configured or 'SHADOWNET{linux_' + secrets.token_hex(16) + '}') + '\n')
flag.chmod(0o600)
PY
chown root:root /root/flag.txt "$state_dir/access.json"
if [[ -n "${SHADOWNET_STAGE7_PLAYER_PUBLIC_KEY_FILE:-}" ]]; then
    install -d -m 0700 -o analyst -g analyst /home/analyst/.ssh
    install -m 0600 -o analyst -g analyst "$SHADOWNET_STAGE7_PLAYER_PUBLIC_KEY_FILE" /home/analyst/.ssh/authorized_keys
fi

install -d -m 0755 -o root -g root /opt/nexacorp/bin /opt/nexacorp/ops
install -m 4755 -o root -g root "$compiled_binary" /opt/nexacorp/bin/nexa-audit
install -m 0755 -o root -g root "$stage_source/guest/nexa-report" /usr/local/bin/nexa-report
install -m 0644 -o root -g root "$stage_source/guest/shift-notes.txt" /opt/nexacorp/ops/shift-notes.txt
install -m 0644 -o root -g root "$stage_source/guest/motd" /opt/nexacorp/ops/login-banner.txt
cat > /etc/profile.d/nexacorp-stage7.sh <<'PROFILE'
if [ "$(id -un)" = analyst ]; then
    PATH="/opt/nexacorp/bin:/usr/local/bin:/usr/bin:/bin"
    export PATH
fi
PROFILE
chmod 0644 /etc/profile.d/nexacorp-stage7.sh

# Append the reviewed Match block, preserving existing settings and a private backup.
# Refuse to append if an administrator changed the configuration during installation.
cmp -s -- "$ssh_baseline" /etc/ssh/sshd_config || fail 'SSH configuration changed during installation. Restore the clean snapshot and review the changes.'
printf '\n' >> /etc/ssh/sshd_config
cat "$ssh_candidate" >> /etc/ssh/sshd_config
/usr/sbin/sshd -t
check_analyst_policy /etc/ssh/sshd_config
[[ -d /run/systemd/system ]] || fail 'A running systemd VM is required to activate SSH.'
systemctl enable ssh
systemctl restart ssh

printf 'stage7-v1\n' > "$marker"
chmod 0600 "$marker"
printf 'complete\n' > "$state_dir/status"
printf '%s\n' 'Stage 7 installed. Credentials: /var/lib/shadownet-stage7/access.json (root only).' 'Flag: /root/flag.txt (root only). Record privately in the dashboard admin panel.' 'Before player access: isolate the VM network, verify SSH, remove provisioning sources and take a clean snapshot.'
