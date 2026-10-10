'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/register', {
        username,
        password,
        email,
        team_name: teamName,
      });

      if (res.status === 201) {
        router.push('/dashboard/challenges');
        router.refresh();
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      setError(errorObj.response?.data?.error || 'Registration failed. Try another handle or callsign.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="max-w-md w-full cyber-panel rounded-xl p-6 sm:p-8 relative overflow-hidden bg-[#0E1217] shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#9FEF00] via-[#9FEF00] to-[#9FEF00]"></div>

        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-lg bg-[#141920] border border-[#FF6B00]/40 items-center justify-center font-mono font-bold text-[#FF6B00] text-xl mb-3 shadow-[0_0_12px_rgba(255,107,0,0.2)]">
            🛡️
          </div>
          <div className="inline-block px-2.5 py-0.5 bg-[#080A0D] border border-[#232B36] rounded-full text-[10px] font-mono text-[#FF8533] mb-2 font-bold uppercase">
            Recruitment Matrix
          </div>
          <h2 className="text-2xl font-bold font-sans text-[#F5F5F5] tracking-tight">
            Join The Collective
          </h2>
          <p className="text-xs text-[#8B949E] mt-1 font-sans">
            Enlist in the ShadowNet underground campaign against NexaCorp.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/40 font-mono text-xs text-[#EF4444] flex items-center gap-2.5 animate-fade-in">
            <span className="text-sm">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-3.5">
          <div>
            <label htmlFor="username" className="block font-mono text-xs font-semibold text-[#8B949E] mb-1.5 uppercase">
              Operative Callsign <span className="text-[#FF6B00]">*</span>
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="e.g. cipher_operative"
              className="cyber-input"
            />
          </div>

          <div>
            <label htmlFor="password" className="block font-mono text-xs font-semibold text-[#8B949E] mb-1.5 uppercase">
              Passphrase <span className="text-[#FF6B00]">*</span>
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Min. 6 characters"
              className="cyber-input"
            />
          </div>

          <div>
            <label htmlFor="email" className="block font-mono text-xs font-semibold text-[#8B949E] mb-1.5 uppercase">
              Encrypted Comms Email (optional)
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operative@shadownet.mesh"
              className="cyber-input"
            />
          </div>

          <div>
            <label htmlFor="team-name" className="block font-mono text-xs font-semibold text-[#8B949E] mb-1.5 uppercase">
              Collective Cell / Squad (optional)
            </label>
            <input
              type="text"
              id="team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. RedCell-Zero"
              className="cyber-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 btn-primary"
          >
            {loading ? 'Initializing Operative Node...' : 'Enroll in Collective'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#232B36] text-center font-mono text-xs text-[#8B949E]">
          Already an enrolled operative?{' '}
          <Link href="/auth/login" className="text-[#FF8533] font-bold hover:text-[#FF9F43]">
            Sign in to Uplink
          </Link>
        </div>
      </div>
    </div>
  );
}
