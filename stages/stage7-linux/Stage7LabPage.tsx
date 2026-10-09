'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './Stage7LabPage.module.css';
type Lab = { id: string | null; state: string; expiresAt: string | null; terminalUrl: string | null };
type Action = 'status' | 'start' | 'reset' | 'stop';
const labels: Record<string, string> = { unassigned: 'Not started', starting: 'Starting', ready: 'Ready', stopping: 'Stopping', stopped: 'Stopped', expired: 'Expired', error: 'Unavailable' };
export default function Stage7LabPage() {
  const [lab, setLab] = useState<Lab | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const lock = useRef(false);
  const operation = useRef<{ action: Action; key: string } | null>(null);
  const frame = useRef<{ id: string; url: string } | null>(null);
  async function request(action: Action, silent = false) {
    if (lock.current) return;
    lock.current = true; if (!silent) { setBusy(true); setError(''); }
    try {
      if (action !== 'status' && operation.current?.action !== action) operation.current = { action, key: crypto.randomUUID() };
      const response = await fetch('/api/stage7/lab', { method: 'POST', headers: {
        'Content-Type': 'application/json', ...(action !== 'status' ? { 'Idempotency-Key': operation.current!.key } : {}),
      }, body: JSON.stringify({ action }) });
      const data = await response.json();
      if (!response.ok) {
        if ([401, 403, 410].includes(response.status)) { frame.current = null; setLab(null); }
        throw new Error(data.error || 'Cannot connect to your lab.');
      }
      if (action !== 'status') { operation.current = null; frame.current = null; }
      // Polls must not reload an active terminal with a newly issued gateway ticket.
      if (data.state === 'ready' && data.id && data.terminalUrl) {
        if (frame.current?.id !== data.id) frame.current = { id: data.id, url: data.terminalUrl };
        data.terminalUrl = frame.current!.url;
      } else frame.current = null;
      setLab(data); setError('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Cannot connect to your lab.'); }
    finally { lock.current = false; if (!silent) setBusy(false); }
  }
  useEffect(() => { void request('status'); }, []);
  useEffect(() => {
    if (!lab || !['starting', 'ready', 'stopping'].includes(lab.state)) return;
    const timer = setInterval(() => { void request('status', true); }, 15000);
    return () => clearInterval(timer);
  }, [lab?.state]);
  const active = lab && ['starting', 'ready', 'stopping'].includes(lab.state);
  return <main className={styles.page}><div className={styles.content}>
    <a className={styles.back} href="/dashboard/challenges/7">← Return to mission, hints & flag submission</a>
    <header className={styles.header}><div><p className={styles.eyebrow}>SHADOWNET / NEXA-ROOT-07 / LINUX LAB</p><h1>Under the Hood</h1><p>Your assigned NexaCorp operations terminal.</p></div><span className={styles.badge} role="status">{lab ? labels[lab.state] : busy ? 'Checking lab' : 'Not connected'}</span></header>
    <section className={styles.brief}><h2>Lab objective</h2><p>Begin with the operations handover notes. Investigate a misconfigured privileged maintenance program and recover <code>/root/flag.txt</code>.</p><p>Use the mission page for paid hints and submit your recovered flag there. Start opens your assigned lab; Reset discards its changes.</p></section>
    <section className={styles.workspace} aria-label="Stage 7 browser terminal">
      <div className={styles.toolbar}><span>NX-LINUX-07 / TERMINAL</span><div className={styles.actions}>
        <button onClick={() => void request('start')} disabled={busy || !!active}>Start lab</button>
        <button onClick={() => { frame.current = null; void request('status'); }} disabled={busy}>Reconnect</button>
        <button onClick={() => setConfirmReset(true)} disabled={busy || !active}>Reset lab</button>
        <button onClick={() => void request('stop')} disabled={busy || !active}>Stop lab</button>
      </div></div>
      {confirmReset && <div className={styles.confirm} role="alert"><p>Reset this lab? Files and terminal sessions from this attempt will be discarded.</p><button onClick={() => { setConfirmReset(false); void request('reset'); }} disabled={busy}>Reset now</button><button onClick={() => setConfirmReset(false)}>Cancel</button></div>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {lab?.state === 'ready' && lab.terminalUrl ? <iframe key={lab.id} className={styles.terminal} src={lab.terminalUrl} title="Your isolated Stage 7 Linux terminal" sandbox="allow-scripts allow-same-origin allow-forms" referrerPolicy="no-referrer" /> : <div className={styles.placeholder}><span className={styles.prompt}>_</span><h2>{lab?.state === 'starting' ? 'Preparing your lab…' : lab?.state === 'stopping' ? 'Stopping your lab…' : 'Your lab terminal will appear here'}</h2><p>{lab?.state === 'starting' ? 'Keep this page open while your machine starts.' : 'Start an available lab to connect. You do not need a separate SSH application.'}</p></div>}
      <footer className={styles.footer}><span>Only use your assigned lab.</span>{lab?.expiresAt && <span>Session ends: <time dateTime={lab.expiresAt}>{lab.expiresAt}</time></span>}</footer>
    </section>
  </div></main>;
}
