#!/usr/bin/env python3
"""Loopback-only gateway to separate disposable VirtualBox Stage 7 slots.

No cloud integration or public hosting; no host driver/network modifications.
Private configuration is supplied outside Git using STAGE7_LOCAL_CONFIG.
"""
import hmac
import ipaddress
import json
import os
import pty
import re
import secrets
import select
import signal
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from virtualbox import VirtualBox


class Lab:
    def __init__(self, config):
        self.config = config
        ip = ipaddress.IPv4Address(config['guest_ip'])
        if not any(ip in ipaddress.ip_network(n) for n in ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16')):
            raise ValueError('Require an isolated RFC1918 guest IPv4 address.')
        if len(config['gateway_key']) < 32 or config['gateway_key'].startswith('REPLACE_') or not config['allowed_users']:
            raise ValueError('Require a private gateway key and organizer-approved local demo users.')
        if not all(isinstance(u, str) and u and len(u) <= 200 for u in config['allowed_users']):
            raise ValueError('Invalid approved user list.')
        for field in ('ssh_key', 'known_hosts'):
            path = Path(config[field])
            if not path.is_absolute() or not path.is_file() or path.is_symlink():
                raise ValueError('Require absolute regular SSH key/known-hosts paths.')
            if path.stat().st_uid != os.getuid() or path.stat().st_mode & 0o077:
                raise ValueError('SSH key and known-hosts files must be owner-only.')
        self.port = int(config.get('port', 5007))
        if not 1024 <= self.port <= 65535:
            raise ValueError('Invalid local gateway port.')
        self.origin = f'http://127.0.0.1:{self.port}'
        dashboard = urlparse(config['dashboard_origin'])
        if dashboard.scheme != 'http' or dashboard.hostname != '127.0.0.1' or dashboard.path not in ('', '/') or dashboard.query or dashboard.fragment or dashboard.username or dashboard.password or dashboard.port == self.port:
            raise ValueError('Use a separate http://127.0.0.1 dashboard origin.')
        self.dashboard = f'http://127.0.0.1:{dashboard.port or 80}'
        self.lock = threading.RLock()
        self.owner = self.id = self.process = self.fd = None
        self.state = 'unassigned'
        self.expiry = 0
        self.buffer = ''
        self.tickets = {}
        self.sessions = {}
        self.operations = {}

    def revoke(self, state):
        if self.process is not None and self.process.poll() is None:
            try:
                os.killpg(self.process.pid, signal.SIGTERM)
                self.process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                os.killpg(self.process.pid, signal.SIGKILL)
                self.process.wait()
            except ProcessLookupError:
                pass
        if self.fd is not None:
            try:
                os.close(self.fd)
            except OSError:
                pass
        self.process = self.fd = None
        self.tickets.clear()
        self.sessions.clear()
        self.state = state
        self.buffer = ''

    def tick(self):
        if self.state == 'ready':
            if time.time() >= self.expiry:
                self.revoke('expired')
            elif self.process.poll() is not None:
                self.revoke('error')
        now = time.time()
        self.tickets = {k: v for k, v in self.tickets.items() if v[1] > now}
        self.operations = {k: v for k, v in self.operations.items() if v[1] > now}

    def reader(self, fd, process):
        import codecs
        decoder = codecs.getincrementaldecoder('utf-8')('replace')
        while True:
            try:
                if not select.select([fd], [], [], 1)[0]:
                    if process.poll() is not None:
                        return
                    continue
                data = os.read(fd, 4096)
                if not data:
                    return
            except (OSError, ValueError):
                return
            with self.lock:
                if self.process is not process:
                    return
                self.buffer = (self.buffer + decoder.decode(data))[-65536:]

    def start(self, user):
        if self.owner and self.owner != user:
            raise PermissionError('The single local lab is assigned to another user.')
        if self.state == 'ready':
            return
        self.revoke('stopped')
        master, slave = pty.openpty()
        os.set_blocking(master, False)
        command = ['/usr/bin/ssh', '-F', '/dev/null', '-tt', '-p', '22', '-i', self.config['ssh_key'],
                   '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=yes',
                   '-o', 'UserKnownHostsFile=' + self.config['known_hosts'], '-o', 'GlobalKnownHostsFile=/dev/null',
                   '-o', 'ConnectTimeout=5', '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=2',
                   '-o', 'ForwardAgent=no', '-o', 'ClearAllForwardings=yes',
                   'analyst@' + self.config['guest_ip']]
        try:
            process = subprocess.Popen(command, stdin=slave, stdout=slave, stderr=slave,
                                       start_new_session=True, env={'PATH': '/usr/bin:/bin', 'TERM': 'dumb'})
        except Exception:
            os.close(master)
            raise
        finally:
            os.close(slave)
        self.owner, self.id = user, secrets.token_hex(16)
        self.fd, self.process, self.state = master, process, 'ready'
        self.expiry = time.time() + 1800
        threading.Thread(target=self.reader, args=(master, process), daemon=True).start()

    def probe(self):
        # Only the configured private guest is contacted; never execute a host shell.
        command = ['/usr/bin/ssh', '-F', '/dev/null', '-p', '22', '-i', self.config['ssh_key'],
                   '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=yes',
                   '-o', 'UserKnownHostsFile=' + self.config['known_hosts'], '-o', 'GlobalKnownHostsFile=/dev/null',
                   '-o', 'ConnectTimeout=3', '-o', 'ForwardAgent=no', '-o', 'ClearAllForwardings=yes',
                   'analyst@' + self.config['guest_ip'], '/usr/bin/true']
        result = subprocess.run(command, capture_output=True, timeout=5, env={'PATH': '/usr/bin:/bin'})
        return result.returncode == 0

    def snapshot(self, user):
        if self.owner != user:
            return {'id': None, 'state': 'unassigned', 'expiresAt': None, 'terminalUrl': None}
        url = None
        if self.state == 'ready':
            token = secrets.token_urlsafe(32)
            self.tickets[token] = (self.id, time.time() + 60)
            url = self.origin + '/connect/' + token
        return {'id': self.id, 'state': self.state,
                'expiresAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(self.expiry)), 'terminalUrl': url}


class CapacityError(Exception):
    pass


class Pool:
    def __init__(self, config, controller_factory=VirtualBox):
        slots = config.get('slots', [])
        if not isinstance(slots, list) or not 1 <= len(slots) <= 8:
            raise ValueError('Configure 1–8 separate dedicated VM slots.')
        self.config = config
        self.lock = threading.RLock()
        self.labs = []
        self.operations = {}
        self.controllers = {}
        for field in ('vm_uuid', 'guest_ip', 'hostonly_adapter', 'ssh_key'):
            values = [slot[field].lower() if field == 'vm_uuid' else slot[field] for slot in slots]
            if len(set(values)) != len(values):
                raise ValueError('Each slot needs a distinct VM, private IP, network adapter and SSH key.')
        for slot in slots:
            if set(slot) - {'vm_uuid', 'snapshot_uuid', 'guest_ip', 'hostonly_adapter', 'ssh_key', 'known_hosts', 'dedicated_stage7_vm'}:
                raise ValueError('Unexpected slot configuration field.')
            combined = {**config, **slot}
            guest = Lab(combined)
            guest.lock = self.lock
            self.labs.append(guest)
            self.controllers[id(guest)] = controller_factory(combined)
        self.port, self.origin, self.dashboard = self.labs[0].port, self.labs[0].origin, self.labs[0].dashboard
        self.closing = False
        self.workers = []

    def owned(self, user):
        return next((lab for lab in self.labs if lab.owner == user), None)

    def snapshot(self, user):
        guest = self.owned(user)
        return guest.snapshot(user) if guest else {'id': None, 'state': 'unassigned', 'expiresAt': None, 'terminalUrl': None}

    def tick(self):
        for guest in self.labs:
            if guest.state == 'ready' and (time.time() >= guest.expiry or guest.process.poll() is not None):
                self.cleanup(guest, 'expired' if time.time() >= guest.expiry else 'error')
            now = time.time()
            guest.tickets = {k: v for k, v in guest.tickets.items() if v[1] > now}
        self.operations = {k: v for k, v in self.operations.items() if v[1] > time.time()}

    def launch(self, guest, reset=False):
        guest.revoke('starting')
        guest.id = secrets.token_hex(16)
        guest.expiry = time.time() + 1800
        self.spawn(self.prepare, guest, reset)

    def spawn(self, function, *args):
        self.workers = [worker for worker in self.workers if worker.is_alive()]
        worker = threading.Thread(target=function, args=args, daemon=True)
        self.workers.append(worker)
        worker.start()

    def prepare(self, guest, reset):
        controller = self.controllers[id(guest)]
        try:
            if reset:
                controller.poweroff()
            controller.restore_and_boot()
            deadline = time.time() + 120
            while time.time() < deadline:
                with self.lock:
                    if self.closing:
                        raise RuntimeError('Gateway closing.')
                try:
                    if guest.probe():
                        break
                except (OSError, subprocess.SubprocessError):
                    pass
                time.sleep(2)
            else:
                raise RuntimeError('Guest SSH not ready.')
            with self.lock:
                if self.closing:
                    raise RuntimeError('Gateway closing.')
                guest.start(guest.owner)
        except Exception:
            # Failed slots remain quarantined; do not allocate them to another user.
            with self.lock:
                guest.revoke('error')

    def cleanup(self, guest, final_state):
        guest.revoke('stopping')
        self.spawn(self.finish_cleanup, guest, final_state)

    def finish_cleanup(self, guest, final_state):
        try:
            self.controllers[id(guest)].poweroff()
            with self.lock:
                guest.state = final_state
                if final_state != 'error':
                    guest.owner = None
        except Exception:
            with self.lock:
                guest.state = 'error'

    def action(self, user, action, operation):
        if action not in ('status', 'start', 'stop', 'reset'):
            raise ValueError('Invalid action.')
        if action != 'status':
            if not re.fullmatch(r'[A-Za-z0-9_-]{16,128}', operation):
                raise ValueError('Operation key required.')
            previous = self.operations.get((user, operation))
            if previous:
                if previous[0] != action:
                    raise PermissionError('Operation key reused.')
                return self.snapshot(user)
            if len(self.operations) >= 1024:
                raise CapacityError()
        guest = self.owned(user)
        if guest and guest.state in ('starting', 'stopping') and action not in ('status', 'start'):
            raise PermissionError('Lab state is changing.')
        if action == 'start':
            if not guest:
                guest = next((g for g in self.labs if g.owner is None and g.state in ('unassigned', 'stopped', 'expired')), None)
                if guest is None:
                    raise CapacityError()
                guest.owner = user
                self.launch(guest)
            elif guest.state in ('error', 'expired', 'stopped'):
                raise PermissionError('Organizer review required before restarting this slot.')
        elif action == 'reset':
            if not guest or guest.state != 'ready':
                raise PermissionError('No ready lab to reset.')
            self.launch(guest, reset=True)
        elif action == 'stop':
            if guest:
                self.cleanup(guest, 'stopped')
        if action != 'status':
            self.operations[(user, operation)] = (action, time.time() + 3600)
        return self.snapshot(user)

    def ticket(self, token):
        for guest in self.labs:
            value = guest.tickets.pop(token, None)
            if value and value[0] == guest.id and value[1] > time.time() and guest.state == 'ready':
                cookie = secrets.token_urlsafe(32)
                guest.sessions[cookie] = guest.id
                return cookie
        return None

    def session(self, token):
        return next((g for g in self.labs if g.state == 'ready' and g.sessions.get(token) == g.id), None)


PAGE = b'''<!doctype html><meta charset="utf-8"><title>Stage 7 local terminal</title>
<style>body{background:#101820;color:#b5ff27;font:14px monospace;margin:16px}pre{white-space:pre-wrap;overflow-wrap:anywhere}input{width:75%;background:#182332;color:white}button{margin:5px}</style>
<p>Isolated Ubuntu lab console. Commands run as analyst in the assigned VM.</p>
<pre id="output"></pre><form id="console"><input id="command" autocomplete="off" aria-label="VM command"><button>Send</button></form><button id="interrupt">Ctrl+C</button>
<script src="/terminal/client.js"></script>'''
CLIENT = b'''const output=document.getElementById('output');
async function send(input){let r=await fetch('/terminal/input',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({input})});if(!r.ok)output.textContent='Connection closed. Reconnect from the lab page.';}
document.getElementById('console').onsubmit=e=>{e.preventDefault();let c=document.getElementById('command');send(c.value+'\\n');c.value='';};
document.getElementById('interrupt').onclick=()=>send('\\x03');
async function poll(){try{let r=await fetch('/terminal/output',{cache:'no-store'});if(!r.ok){output.textContent='Connection closed. Reconnect from the lab page.';return;}let d=await r.json();output.textContent=d.output;setTimeout(poll,750);}catch{output.textContent='Local gateway unavailable.';}}poll();'''


def handler(lab):
    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(5)

        def log_message(self, *args):
            pass  # Never record tickets, credentials, command input or output.

        def reply(self, status, value, content_type='application/json', extra=None):
            payload = json.dumps(value).encode() if content_type == 'application/json' else value
            self.send_response(status)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(payload)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Referrer-Policy', 'no-referrer')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors " + lab.dashboard)
            for key, val in (extra or {}).items():
                self.send_header(key, val)
            self.end_headers()
            self.wfile.write(payload)

        def body(self):
            if self.headers.get('Transfer-Encoding'):
                raise ValueError('Chunked requests are not supported.')
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 4096:
                raise ValueError('Invalid body size.')
            value = json.loads(self.rfile.read(length))
            if not isinstance(value, dict):
                raise ValueError('Require JSON object.')
            return value

        def session(self):
            cookies = dict(item.strip().split('=', 1) for item in self.headers.get('Cookie', '').split(';') if '=' in item)
            return lab.session(cookies.get('stage7_terminal'))

        def do_GET(self):
            self.dispatch(False)

        def do_POST(self):
            self.dispatch(True)

        def dispatch(self, post):
            try:
                if self.headers.get('Host') != f'127.0.0.1:{lab.port}':
                    return self.reply(403, {'error': 'Invalid local host.'})
                with lab.lock:
                    lab.tick()
                    path = self.path
                    if path.startswith('/v1/stage7/') and post:
                        supplied = self.headers.get('Authorization', '')
                        if not hmac.compare_digest(supplied, 'Bearer ' + lab.config['gateway_key']):
                            return self.reply(401, {'error': 'Unauthorized.'})
                        data = self.body()
                        user = data.get('userId')
                        if user not in lab.config['allowed_users']:
                            return self.reply(403, {'error': 'Local demo access not approved.'})
                        if path == '/v1/stage7/access':
                            return self.reply(200, {'allowed': True})
                        if path != '/v1/stage7/lab':
                            return self.reply(404, {'error': 'Unknown endpoint.'})
                        return self.reply(200, lab.action(user, data.get('action'), self.headers.get('Idempotency-Key', '')))
                    if post and self.headers.get('Origin') != lab.origin:
                        return self.reply(403, {'error': 'Invalid terminal origin.'})
                    if not post and path.startswith('/connect/'):
                        token = lab.ticket(path.removeprefix('/connect/'))
                        if not token:
                            return self.reply(410, {'error': 'Ticket expired. Reconnect from your lab page.'})
                        return self.reply(303, b'', 'text/plain', {'Location': '/terminal/', 'Set-Cookie': 'stage7_terminal=' + token + '; HttpOnly; SameSite=Strict; Path=/terminal/; Max-Age=1800'})
                    guest = self.session()
                    if not guest:
                        return self.reply(401, {'error': 'Terminal session closed.'})
                    if not post and path == '/terminal/':
                        return self.reply(200, PAGE, 'text/html; charset=utf-8')
                    if not post and path == '/terminal/client.js':
                        return self.reply(200, CLIENT, 'text/javascript; charset=utf-8')
                    if not post and path == '/terminal/output':
                        return self.reply(200, {'output': guest.buffer})
                    if post and path == '/terminal/input':
                        data = self.body()
                        value = data.get('input')
                        if not isinstance(value, str) or len(value.encode()) > 2048:
                            raise ValueError()
                        os.write(guest.fd, value.encode())
                        return self.reply(200, {'ok': True})
                    return self.reply(404, {'error': 'Unknown endpoint.'})
            except CapacityError:
                self.reply(429, {'error': 'All local lab slots are busy. Try again after a session ends.'})
            except PermissionError:
                self.reply(409, {'error': 'Lab is changing state or requires organizer review.'})
            except (ValueError, TypeError, KeyError):
                self.reply(400, {'error': 'Invalid request.'})
            except (OSError, subprocess.SubprocessError):
                self.reply(503, {'error': 'Local VM connection unavailable.'})
    return Handler


def validate_routing(config):
    """Check the dedicated interfaces without disrupting unrelated host routing."""
    for slot in config['slots']:
        adapter = slot['hostonly_adapter']
        if not re.fullmatch(r'vboxnet[0-9]+', adapter):
            raise ValueError('Invalid dedicated adapter.')
        for family in ('ipv4', 'ipv6'):
            path = Path(f'/proc/sys/net/{family}/conf/{adapter}/forwarding')
            if not path.is_file() or path.read_text().strip() != '0':
                raise ValueError(f'Disable {family} forwarding on dedicated adapter {adapter}.')


def main():
    path = Path(os.environ['STAGE7_LOCAL_CONFIG'])
    if not path.is_file() or path.is_symlink() or path.stat().st_uid != os.getuid() or path.stat().st_mode & 0o077:
        raise ValueError('Private configuration must be an owner-only regular file.')
    lab = Pool(json.loads(path.read_text()))
    if lab.config.get('network_isolation_verified') is not True:
        raise ValueError('Organizer must verify external firewall and lab network isolation before enabling VM lifecycle actions.')
    validate_routing(lab.config)
    server = ThreadingHTTPServer(('127.0.0.1', lab.port), handler(lab))
    server.daemon_threads = True
    server.timeout = 1
    print('Stage 7 local gateway: ' + lab.origin + ' (' + str(len(lab.labs)) + ' isolated VM slots)', flush=True)
    try:
        while True:
            server.handle_request()
            with lab.lock:
                lab.tick()
    except KeyboardInterrupt:
        pass
    finally:
        with lab.lock:
            lab.closing = True
            for guest in lab.labs:
                guest.revoke('stopped')
        for worker in lab.workers:
            worker.join(timeout=210)
        for controller in lab.controllers.values():
            try:
                controller.poweroff()
            except Exception:
                print('A dedicated VM requires organizer shutdown review.', flush=True)
        server.server_close()


if __name__ == '__main__':
    main()
