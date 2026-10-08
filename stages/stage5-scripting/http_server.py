"""Private Docker HTTP adapter for the intentionally predictable Stage 5 lab."""
import hmac
import json
import os
import secrets
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from server import load_flag, next_state, M, TOKEN_MODULUS

TTL = 900


def load_service_key(configured=None, path='/data/service.key'):
    if configured:
        if len(configured) < 32:
            raise ValueError('STAGE5_SERVICE_KEY must contain at least 32 characters')
        return configured
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        with target.open('x') as output:
            output.write(secrets.token_hex(32))
        target.chmod(0o600)
    except FileExistsError:
        pass
    value = target.read_text().strip()
    if len(value) < 32:
        raise ValueError('Stored service key is invalid')
    return value


class ChallengeHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, address, flag, service_key, clock=time.time, seed_factory=time.time_ns):
        self.flag, self.service_key = flag, service_key
        self.clock, self.seed_factory = clock, seed_factory
        self.sessions = {}
        self.lock = threading.Lock()
        self.workers = threading.BoundedSemaphore(32)
        super().__init__(address, ChallengeHandler)

    def process_request(self, request, client_address):
        if not self.workers.acquire(blocking=False):
            self.shutdown_request(request)
            return
        try:
            super().process_request(request, client_address)
        except Exception:
            self.workers.release()
            raise

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            self.workers.release()


class ChallengeHandler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(10)

    def log_message(self, format, *args):
        # Do not log bearer credentials, samples, predictions or flags.
        pass

    def reply(self, status, value):
        payload = json.dumps(value).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Connection', 'close')
        self.end_headers()
        self.wfile.write(payload)
        self.close_connection = True

    def do_GET(self):
        self.reply(200 if self.path == '/health' else 404,
                   {'status': 'ok'} if self.path == '/health' else {'error': 'Not found.'})

    def do_POST(self):
        actual = self.headers.get('Authorization', '')
        expected = 'Bearer ' + self.server.service_key
        if not hmac.compare_digest(actual.encode(), expected.encode()):
            return self.reply(401, {'error': 'Service authentication required.'})
        if self.path not in ('/start', '/predict'):
            return self.reply(404, {'error': 'Not found.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if self.headers.get('Transfer-Encoding') or length < 0 or length > 4096:
                return self.reply(413, {'error': 'Request too large.'})
            value = json.loads(self.rfile.read(length) or b'{}')
            if not isinstance(value, dict):
                raise ValueError()
        except (ValueError, UnicodeError):
            return self.reply(400, {'error': 'Send a JSON object.'})
        if self.path == '/start':
            return self.start_challenge(value)
        return self.predict(value)

    def start_challenge(self, value):
        user = value.get('user')
        if not isinstance(user, str) or not user or len(user) > 200:
            return self.reply(400, {'error': 'Player identity required.'})
        now = self.server.clock()
        state = self.server.seed_factory() % M
        tokens = []
        for _ in range(15):
            state = next_state(state)
            tokens.append(f'{state % TOKEN_MODULUS:08d}')
        expected = f'{next_state(state) % TOKEN_MODULUS:08d}'
        session = secrets.token_urlsafe(32)
        with self.server.lock:
            self.server.sessions = {key: data for key, data in self.server.sessions.items() if data['expires'] > now}
            if len(self.server.sessions) >= 2048:
                return self.reply(503, {'error': 'Challenge is busy. Try again later.'})
            self.server.sessions[session] = {'user': user, 'expected': expected, 'expires': now + TTL, 'attempts': 0}
        expires = datetime.fromtimestamp(now + TTL, timezone.utc).isoformat()
        self.reply(200, {'session': session, 'tokens': tokens, 'expiresAt': expires})

    def predict(self, value):
        session, prediction = value.get('session'), value.get('prediction')
        if not isinstance(session, str) or not 1 <= len(session) <= 128:
            return self.reply(400, {'error': 'Invalid challenge session.'})
        if not isinstance(prediction, str) or len(prediction) != 8 or not prediction.isascii() or not prediction.isdigit():
            return self.reply(400, {'error': 'Prediction must be an eight-digit string.'})
        with self.server.lock:
            data = self.server.sessions.get(session)
            if not data or data['expires'] <= self.server.clock():
                self.server.sessions.pop(session, None)
                return self.reply(410, {'error': 'Challenge expired or restarted. Start a new session.'})
            if data['attempts'] >= 3:
                return self.reply(429, {'error': 'Attempt limit reached. Start a new session.'})
            data['attempts'] += 1
            if not hmac.compare_digest(prediction, data['expected']):
                return self.reply(422, {'error': 'Incorrect prediction. Review your script and try again.'})
            # Retain successful sessions until expiry so a lost HTTP response can be retried.
            data['attempts'] -= 1
        self.reply(200, {'message': 'Prediction accepted. Submit this flag to the main dashboard.', 'flag': self.server.flag})


if __name__ == '__main__':
    flag = load_flag(os.environ.get('FLAG'), os.environ.get('FLAG_FILE', '/data/challenge.flag'))
    key = load_service_key(os.environ.get('STAGE5_SERVICE_KEY'), os.environ.get('SERVICE_KEY_FILE', '/data/service.key'))
    with ChallengeHTTPServer((os.environ.get('HOST', '127.0.0.1'), int(os.environ.get('PORT', '5005'))), flag, key) as service:
        print('Stage 5 private HTTP service ready', flush=True)
        service.serve_forever()
