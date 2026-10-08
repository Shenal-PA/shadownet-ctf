"""ShadowNet Stage 5: intentionally predictable local-lab reset tokens."""
import json
import os
import secrets
import socket
import socketserver
import threading
import time
from pathlib import Path

A = 1103515245
C = 12345
M = 2 ** 31
TOKEN_MODULUS = 100000000
MAX_LINE = 128
MAX_TOKENS = 32
MAX_ATTEMPTS = 3
IDLE_TIMEOUT = 60


def next_state(state):
    return (A * state + C) % M


def load_flag(configured=None, path='/tmp/nexacorp-stage5/challenge.flag'):
    if configured:
        return configured
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with path.open('x') as file:
            file.write('SHADOWNET{token_' + secrets.token_hex(16) + '}')
        path.chmod(0o600)
    except FileExistsError:
        pass
    value = path.read_text().strip()
    if not value:
        raise RuntimeError('Stored challenge flag is empty.')
    return value


def log_event(event, peer, **fields):
    # Do not put tokens, seeds, submitted values, or flags in access logs.
    print(json.dumps({'event': event, 'peer': peer, **fields}), flush=True)


class TokenHandler(socketserver.StreamRequestHandler):
    def send_line(self, text):
        self.wfile.write((text + '\n').encode('utf-8'))
        self.wfile.flush()

    def handle(self):
        self.request.settimeout(IDLE_TIMEOUT)
        peer = self.client_address[0]
        state = self.server.seed_factory() % M
        issued = attempts = 0
        log_event('connected', peer)
        try:
            self.send_line('NexaCorp Reset Gateway / v1.5')
            self.send_line('Each connection has an independent token sequence.')
            self.send_line('Commands: NEXT | PREDICT <8-digit-token> | HELP | QUIT')
            self.send_line('READY')
            for _ in range(128):
                raw = self.rfile.readline(MAX_LINE + 1)
                if not raw:
                    break
                if len(raw) > MAX_LINE:
                    self.send_line('ERROR line too long; closing session')
                    break
                try:
                    parts = raw.decode('ascii').strip().split()
                except UnicodeDecodeError:
                    self.send_line('ERROR use ASCII commands')
                    continue
                if not parts:
                    self.send_line('ERROR empty command; use HELP')
                    continue
                command = parts[0].upper()
                if command == 'NEXT' and len(parts) == 1:
                    if issued >= MAX_TOKENS:
                        self.send_line('ERROR token limit reached; use PREDICT or reconnect')
                        continue
                    state = next_state(state)
                    issued += 1
                    self.send_line(f'TOKEN {state % TOKEN_MODULUS:08d}')
                    log_event('token_issued', peer, count=issued)
                elif command == 'PREDICT' and len(parts) == 2:
                    token = parts[1]
                    if len(token) != 8 or not token.isascii() or not token.isdigit():
                        self.send_line('ERROR prediction must contain exactly 8 digits')
                        continue
                    if not issued:
                        self.send_line('ERROR request tokens with NEXT first')
                        continue
                    state = next_state(state)
                    attempts += 1
                    if int(token) == state % TOKEN_MODULUS:
                        log_event('prediction_correct', peer, attempt=attempts)
                        self.send_line('SUCCESS prediction accepted')
                        self.send_line('FLAG ' + self.server.flag)
                        break
                    log_event('prediction_incorrect', peer, attempt=attempts)
                    self.send_line('WRONG next token consumed; collect more samples or reconnect')
                    if attempts >= MAX_ATTEMPTS:
                        self.send_line('CLOSED prediction attempt limit reached')
                        break
                elif command == 'HELP' and len(parts) == 1:
                    self.send_line('NEXT returns one token. PREDICT consumes the next token.')
                    self.send_line('Collect consecutive samples on this same connection.')
                    self.send_line(f'Limits: {MAX_TOKENS} samples, {MAX_ATTEMPTS} predictions, {IDLE_TIMEOUT}s idle.')
                    self.send_line('END HELP')
                elif command in ('QUIT', 'EXIT') and len(parts) == 1:
                    self.send_line('BYE')
                    break
                else:
                    self.send_line('ERROR unknown command; use HELP')
            else:
                self.send_line('CLOSED command limit reached')
        except (socket.timeout, OSError):
            log_event('connection_ended', peer)
        finally:
            log_event('disconnected', peer)


class TokenServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

    def __init__(self, address, flag, seed_factory=None, max_clients=32):
        self.flag = flag
        self.seed_factory = seed_factory or (lambda: time.time_ns() % M)
        self.slots = threading.BoundedSemaphore(max_clients)
        super().__init__(address, TokenHandler)

    def process_request(self, request, client_address):
        if not self.slots.acquire(blocking=False):
            try:
                request.settimeout(1)
                request.sendall(b'BUSY retry later\n')
            except OSError:
                pass
            finally:
                self.shutdown_request(request)
            return
        try:
            super().process_request(request, client_address)
        except Exception:
            self.slots.release()
            raise

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            self.slots.release()


if __name__ == '__main__':
    flag = load_flag(os.environ.get('FLAG'), os.environ.get('FLAG_FILE', '/tmp/nexacorp-stage5/challenge.flag'))
    host = os.environ.get('HOST', '127.0.0.1')
    port = int(os.environ.get('PORT', '5005'))
    with TokenServer((host, port), flag) as server:
        print(f'NexaCorp Reset Gateway listening on {host}:{port}', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
