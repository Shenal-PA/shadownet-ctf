'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.get('username'), password: form.get('password') }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed.');
      window.location.assign('/dashboard/challenges/5');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Login unavailable.'); }
    finally { setBusy(false); }
  }
  async function localLogin() {
    setError(''); setBusy(true);
    try {
      const response = await fetch('/api/auth/local', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Local login unavailable.');
      window.location.assign(data.redirect);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Local login unavailable.'); }
    finally { setBusy(false); }
  }
  return <main style={{ maxWidth: 460, margin: '60px auto', fontFamily: 'sans-serif', padding: 24 }}>
    <h1>ShadowNet login</h1>
    <form onSubmit={login} style={{ display: 'grid', gap: 16 }}>
      <label>Username <input name="username" autoComplete="username" required /></label>
      <label>Password <input name="password" type="password" autoComplete="current-password" required /></label>
      <button disabled={busy}>Log in</button>
    </form>
    {process.env.NODE_ENV === 'development' && <section>
      <h2>Local Stage 5 review</h2>
      <p>Use a temporary local account to test Stage 5 without a platform database. This option is available only in development on localhost.</p>
      <button onClick={localLogin} disabled={busy}>Continue to Stage 5 locally</button>
    </section>}
    {error && <p role="alert">{error}</p>}
  </main>;
}
