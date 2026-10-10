'use client';

import { useState } from 'react';
import styles from './Stage5Page.module.css';

type Challenge = { session: string; tokens: string[]; expiresAt: string };

export default function Stage5Page() {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [prediction, setPrediction] = useState('');
  const [flag, setFlag] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function request(path: string, input: object) {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed. Try again.');
    return data;
  }

  async function start() {
    setBusy(true); setError(''); setFlag(''); setChallenge(null); setPrediction('');
    try { setChallenge(await request('/api/stage5/start', {})); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Cannot start challenge.'); }
    finally { setBusy(false); }
  }

  function download() {
    if (!challenge) return;
    const file = { ...challenge, predictUrl: `${window.location.origin}/api/stage5/predict` };
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'stage5-challenge.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function predict(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!challenge) return;
    setBusy(true); setError(''); setFlag('');
    try { setFlag((await request('/api/stage5/predict', { session: challenge.session, prediction })).flag); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Prediction failed.'); }
    finally { setBusy(false); }
  }

  return <main className={styles.page}>
    <div className={styles.content}>
      <a href="/dashboard/challenges" className={styles.back}>← Challenges</a>
      <p className={styles.eyebrow}>SHADOWNET / STAGE 05 / SCRIPTING</p>
      <h1>Automate It</h1>
      <p>NexaCorp generates access tokens using a predictable generator. Analyse fifteen consecutive samples, recover the pattern and predict token sixteen.</p>
      <section className={styles.panel}>
        <h2>Your mission</h2>
        <ol>
          <li>Log in and start a session. Download your challenge data and the Python starter.</li>
          <li>Implement <code>predict_next(tokens)</code> in the starter using the observed samples.</li>
          <li>Run your script to recover the flag, then submit it in the main dashboard.</li>
        </ol>
        <p>Tokens have eight digits, including leading zeroes. Your challenge file is private and expires after 15 minutes. You have three prediction attempts. Start a new session if it expires or the lab restarts.</p>
        <button onClick={start} disabled={busy}>{busy ? 'Please wait…' : challenge ? 'Start new session' : 'Start challenge'}</button>
      </section>
      {error && <p role="alert" className={styles.error}>{error} {(/log in|login/i).test(error) && <a href="/login">Open login</a>}</p>}
      {challenge && <section className={styles.panel}>
        <h2>Captured tokens</h2>
        <div className={styles.tokens}>{challenge.tokens.map((token, index) => <code key={index}><span>{String(index + 1).padStart(2, '0')}</span> {token}</code>)}</div>
        <p>Expires: <time dateTime={challenge.expiresAt}>{challenge.expiresAt}</time></p>
        <button onClick={download}>Download challenge data</button>
        <a className={styles.download} href="/api/stage5/download" download>Download Python starter</a>
        <pre>python3 stage5-starter.py --challenge stage5-challenge.json</pre>
        <p>Python 3 and an internet connection are sufficient. You can also test a prediction below.</p>
        <form onSubmit={predict}>
          <label htmlFor="prediction">Predicted next token</label>
          <input id="prediction" value={prediction} onChange={event => setPrediction(event.target.value)} inputMode="numeric" pattern="[0-9]{8}" maxLength={8} required placeholder="00000000" autoComplete="off" />
          <button disabled={busy}>Test prediction</button>
        </form>
      </section>}
      {flag && <section className={styles.panel} aria-live="polite"><h2>Access granted</h2><p>Submit this flag in the dashboard to record your solve.</p><code className={styles.flag}>{flag}</code></section>}
    </div>
  </main>;
}
