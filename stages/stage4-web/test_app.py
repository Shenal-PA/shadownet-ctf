import sqlite3
from contextlib import closing
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

from app import create_app


class PortalTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.db = str(Path(self.temp.name) / 'portal.sqlite3')
        self.flag = 'SHADOWNET{test_only_record}'
        self.app = create_app({'TESTING': True, 'DATABASE': self.db,
                               'SECRET_KEY': 'test-only-key', 'FLAG': self.flag})
        self.client = self.app.test_client()

    def tearDown(self):
        self.temp.cleanup()

    def login(self, username, password='anything'):
        return self.client.post('/login', data={'username': username, 'password': password},
                                follow_redirects=True)

    def test_public_routes_do_not_disclose_flag(self):
        for path in ['/', '/login', '/dashboard', '/health', '/static/portal.css',
                     '/app.py', '/portal.sqlite3', '/templates/dashboard.html']:
            response = self.client.get(path, follow_redirects=True)
            self.assertNotIn(self.flag.encode(), response.data)
            response.close()
        self.assertEqual(self.client.get('/app.py').status_code, 404)
        self.assertEqual(self.client.get('/portal.sqlite3').status_code, 404)

    def test_bad_credentials_and_query_error(self):
        self.assertEqual(self.login('admin', 'wrong').status_code, 401)
        self.assertEqual(self.login("'").status_code, 400)
        self.assertNotIn(self.flag.encode(), self.client.get('/dashboard', follow_redirects=True).data)

    def test_normal_staff_login_cannot_read_record(self):
        response = self.login('jordan.lee', 'WelcomeToNexa2026!')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Administrator access required', response.data)
        self.assertNotIn(self.flag.encode(), response.data)

    def test_intended_admin_username_bypass(self):
        response = self.login("admin' -- ")
        self.assertEqual(response.status_code, 200)
        self.assertIn(self.flag.encode(), response.data)
        self.assertIn(b'Internal access record', response.data)

    def test_password_tautology_bypass(self):
        self.assertIn(self.flag.encode(), self.login('admin', "' OR 1=1 -- ").data)

    def test_staff_injection_still_has_staff_role(self):
        response = self.login("jordan.lee' -- ")
        self.assertNotIn(self.flag.encode(), response.data)
        self.assertIn(b'Administrator access required', response.data)

    def test_logout_revokes_access(self):
        self.login("admin' -- ")
        self.client.post('/logout')
        response = self.client.get('/dashboard')
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.headers['Location'].endswith('/login'))

    def test_invalid_inputs_and_oversized_requests(self):
        self.assertEqual(self.login('').status_code, 400)
        self.assertEqual(self.login('x' * 257).status_code, 400)
        self.assertEqual(self.client.post('/login', data=b'x' * 9000).status_code, 413)

    def test_no_env_flag_generates_persistent_runtime_flag(self):
        flag_file = Path(self.temp.name) / 'runtime.flag'
        config = {'TESTING': True, 'DATABASE': self.db, 'FLAG': None}
        with patch.dict('os.environ', {'FLAG_FILE': str(flag_file)}):
            first = create_app(config)
            second = create_app(config)
        self.assertTrue(first.config['FLAG'].startswith('SHADOWNET{portal_'))
        self.assertEqual(first.config['FLAG'], second.config['FLAG'])
        self.assertEqual(flag_file.read_text(), first.config['FLAG'])

    def test_restart_preserves_existing_data(self):
        create_app({'TESTING': True, 'DATABASE': self.db,
                    'SECRET_KEY': 'test-only-key', 'FLAG': 'replacement'})
        with closing(sqlite3.connect(self.db)) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM users').fetchone()[0], 3)
            self.assertEqual(db.execute('SELECT value FROM internal_records').fetchone()[0], self.flag)


if __name__ == '__main__':
    unittest.main()
