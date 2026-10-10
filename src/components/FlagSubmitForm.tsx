'use client';

import React, { useState } from 'react';
import axios from 'axios';

interface FlagSubmitFormProps {
  challengeId: number;
  solved?: boolean;
  onSuccess?: () => void;
}

export default function FlagSubmitForm({
  challengeId,
  solved = false,
  onSuccess,
}: FlagSubmitFormProps) {
  const [flag, setFlag] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'already'>(
    solved ? 'already' : 'idle'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flag.trim()) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post('/api/submissions', {
        challenge_id: challengeId,
        flag: flag.trim(),
      });

      if (response.data.correct) {
        setStatus('success');
        setMessage(response.data.message || 'Target defense breached! Flag accepted and XP awarded.');
        setFlag('');
        onSuccess?.();
      } else if (response.data.alreadySolved) {
        setStatus('already');
        setMessage(response.data.message || 'You have already breached this NexaCorp target.');
      } else {
        setStatus('error');
        setMessage(response.data.message || 'Invalid flag hash. Defense countermeasure rejected submission.');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(
        error.response?.data?.error || 'Submission failed. Check network or operative authentication status.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cyber-panel p-5 sm:p-6 bg-[#0E1217]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3.5">
        <h4 className="font-sans text-base font-bold text-[#F5F5F5] flex items-center gap-2">
          <span className="text-[#FF6B00]">⚡</span> Submit Exfiltrated Flag
        </h4>
        <span className="font-mono text-[11px] text-[#8B949E]">
          Format: <code className="text-[#FF8533] font-bold">SHADOWNET{'{...}'}</code>
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <input
            type="text"
            aria-label="Flag"
            value={flag}
            onChange={(e) => setFlag(e.target.value)}
            placeholder="SHADOWNET{...}"
            disabled={loading}
            required
            className="cyber-input py-2.5 px-3.5 text-xs font-mono placeholder:text-[#555E6B]"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !flag.trim()}
          className="btn-primary py-2.5 px-6 text-xs font-bold whitespace-nowrap flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block animate-spin">⚙️</span>
              <span>Verifying Hash...</span>
            </>
          ) : (
            <span>Submit Hash</span>
          )}
        </button>
      </form>

      {message && (
        <div
          className={`mt-3 p-3 rounded-lg font-mono text-xs border flex items-center gap-2.5 animate-fade-in ${
            status === 'success'
              ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]'
              : status === 'already'
              ? 'bg-[#FF9F43]/15 border-[#FF9F43]/40 text-[#FF9F43]'
              : 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]'
          }`}
        >
          <span className="text-sm">{status === 'success' ? '🎯' : status === 'already' ? 'ℹ️' : '⚠️'}</span>
          <span className="font-medium">{message}</span>
        </div>
      )}
    </div>
  );
}
