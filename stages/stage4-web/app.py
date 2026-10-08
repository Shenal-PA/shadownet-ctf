"""Intentionally vulnerable SQL injection lab; use only dummy lab accounts."""
import os
import secrets
import sqlite3
from pathlib import Path
from contextlib import contextmanager

from flask import Flask, redirect, render_template, request, session, url_for


@contextmanager
def connect(app):
    db = sqlite3.connect(app.config['DATABASE'])
    db.row_factory = sqlite3.Row
    try:
        with db:
            yield db
    finally:
        db.close()


def initialize_database(app):
    path = Path(app.config['DATABASE'])
    path.parent.mkdir(parents=True, exist_ok=True)
    with connect(app) as db:
        db.executescript('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL, display_name TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('admin', 'staff'))
            );
            CREATE TABLE IF NOT EXISTS internal_records (
                name TEXT PRIMARY KEY, value TEXT NOT NULL
            );
        ''')
        db.executemany(
            'INSERT OR IGNORE INTO users VALUES (?, ?, ?, ?, ?)',
            [(1, 'admin', secrets.token_urlsafe(32), 'Portal Administrator', 'admin'),
             (2, 'jordan.lee', 'WelcomeToNexa2026!', 'Jordan Lee', 'staff'),
             (3, 'daniel.brooks', secrets.token_urlsafe(24), 'Daniel Brooks', 'staff')],
        )
        db.execute('INSERT OR IGNORE INTO internal_records VALUES (?, ?)',
                   ('front_door_access', app.config['FLAG']))


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.update(
        SECRET_KEY=os.environ.get('SESSION_SECRET') or secrets.token_hex(32),
        DATABASE=os.environ.get('DATABASE_PATH', '/tmp/nexacorp-stage4/portal.sqlite3'),
        FLAG=os.environ.get('FLAG'),
        MAX_CONTENT_LENGTH=8192,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax',
        SESSION_COOKIE_NAME='nexacorp_stage4',
    )
    if test_config:
        app.config.update(test_config)
    if not app.config.get('FLAG'):
        raise RuntimeError('Set FLAG in the environment before starting the challenge.')
    initialize_database(app)

    @app.after_request
    def headers(response):
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; style-src 'self'; img-src 'self'; "
            "form-action 'self'; frame-ancestors 'none'; base-uri 'self'"
        )
        return response

    @app.get('/')
    def index():
        return redirect(url_for('login'))

    @app.route('/login', methods=['GET', 'POST'])
    def login():
        error = None
        status = 200
        if request.method == 'POST':
            session.clear()
            username = request.form.get('username', '')
            password = request.form.get('password', '')
            if not username.strip() or not password:
                error, status = 'Enter your username and password.', 400
            elif len(username) > 256 or len(password) > 256:
                error, status = 'Credentials must be 256 characters or fewer.', 400
            else:
                # INTENTIONAL CTF FLAW. Never copy this query into the platform.
                query = (
                    "SELECT id FROM users WHERE username = '" + username
                    + "' AND password = '" + password + "'"
                )
                try:
                    with connect(app) as db:
                        user = db.execute(query).fetchone()
                    if user:
                        session['user_id'] = user['id']
                        return redirect(url_for('dashboard'))
                    error, status = 'Invalid username or password.', 401
                except sqlite3.Error:
                    error, status = 'The account lookup query could not be processed.', 400
        return render_template('login.html', error=error), status

    @app.get('/dashboard')
    def dashboard():
        user_id = session.get('user_id')
        if not isinstance(user_id, int):
            return redirect(url_for('login'))
        with connect(app) as db:
            user = db.execute(
                'SELECT username, display_name, role FROM users WHERE id = ?',
                (user_id,),
            ).fetchone()
            if not user:
                session.clear()
                return redirect(url_for('login'))
            flag = None
            if user['role'] == 'admin':
                flag = db.execute(
                    'SELECT value FROM internal_records WHERE name = ?',
                    ('front_door_access',),
                ).fetchone()['value']
        return render_template('dashboard.html', user=user, flag=flag)

    @app.post('/logout')
    def logout():
        session.clear()
        return redirect(url_for('login'))

    @app.get('/health')
    def health():
        with connect(app) as db:
            db.execute('SELECT 1').fetchone()
        return {'status': 'ok'}

    @app.errorhandler(413)
    def too_large(_error):
        return render_template('login.html', error='Request too large. Please try again.'), 413

    return app


if __name__ == '__main__':
    create_app().run(host='127.0.0.1', port=8084, debug=False)
