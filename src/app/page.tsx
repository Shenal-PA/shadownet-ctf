'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import OperativeArtwork from '@/components/OperativeArtwork';

export default function HomePage() {
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [terminalStep, setTerminalStep] = useState(0);

  useEffect(() => {
    axios
      .get('/api/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null));
  }, []);

  const terminalLogs = [
    { text: '[UPLINK] ShadowNet clandestine tunnel established.', color: 'text-[#8B949E]' },
    { text: '[TARGET] NexaCorp global infrastructure perimeter mapped.', color: 'text-[#FF8533]' },
    { text: '[AUTH] Operative cryptographic key verified.', color: 'text-[#10B981]' },
    { text: '[STAGE 01] NexaCorp DMZ web headers & metadata harvested.', color: 'text-[#F59E0B]' },
    { text: '[STAGE 02] Intercepted satellite transmission demodulated.', color: 'text-[#FF9F43]' },
    { text: '[STAGE 03] Oracle ECB block cipher byte boundary aligned.', color: 'text-[#FF6B00]' },
    { text: '[STAGE 04] NexaAuth SSO gateway bypassed via SQL injection.', color: 'text-[#FF8533]' },
    { text: '[STAGE 05] Session generator LCG state mathematical seed solved.', color: 'text-[#10B981]' },
    { text: '[STAGE 06] Internal ELF daemon reversed & license patched.', color: 'text-[#FF6B00]' },
    { text: '[STAGE 07] Linux bastion SUID utility exploited — UID 0 (root).', color: 'text-[#10B981]' },
    { text: '[STAGE 08] SSRF pivot to internal cloud metadata & MySQL exfil.', color: 'text-[#10B981]' },
    { text: '[STATUS] Collective command active. Awaiting operative deployment.', color: 'text-[#FF6B00]' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setTerminalStep((prev) => (prev < terminalLogs.length ? prev + 1 : prev));
    }, 400);
    return () => clearInterval(timer);
  }, [terminalLogs.length]);

  return (
    <div className="w-full space-y-8 sm:space-y-10 pb-6">
      {/* Hero Section: Story Briefing & Live Infiltration Telemetry */}
      <section className="relative overflow-hidden bg-[#0E1217] border border-[#232B36] rounded-xl p-5 sm:p-7 lg:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        {/* Glow & Scanlines */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#9FEF00] via-[#9FEF00] to-[#9FEF00]"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Story Directive & Mission Brief */}
          <div className="lg:col-span-7 relative isolate">
            <OperativeArtwork
              alt=""
              loading="eager"
              sizes="(max-width: 640px) 160px, (max-width: 1024px) 220px, 280px"
              className="home-operative-watermark absolute bottom-0 right-0 w-28 sm:w-40 lg:w-48 h-auto"
            />
            <div className="relative z-10 space-y-4">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#141920] border border-[#232B36] rounded-full text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              <span className="text-[#FF8533] font-bold">NexaCorp Infiltration</span>
              <span className="text-[#232B36]">·</span>
              <span className="text-[#8B949E]">Campaign v2.4</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#F5F5F5] font-sans leading-tight tracking-tight">
              Infiltrate{' '}
              <span className="text-[#FF6B00] drop-shadow-[0_0_20px_rgba(255,107,0,0.35)]">
                NexaCorp
              </span>{' '}
              Infrastructure
            </h1>

            {/* Story Description */}
            <p className="text-xs sm:text-sm text-[#8B949E] font-sans leading-relaxed max-w-xl">
              Take the mantle of an elite operative inside the <strong className="text-[#F5F5F5]">ShadowNet Underground Collective</strong>. Breaching NexaCorp requires chaining eight sequential exploits—from public OSINT recon and steganography to binary disassembly, privilege escalation, and internal subnet network pivoting.
            </p>

            {/* Call to Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {user ? (
                <Link
                  href="/dashboard/challenges"
                  className="btn-primary text-xs sm:text-sm px-5 py-2.5 font-bold"
                >
                  <span>⚡ ACCESS TARGET DECK</span>
                  <span>→</span>
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/register"
                    className="btn-primary text-xs sm:text-sm px-5 py-2.5 font-bold"
                  >
                    <span>Join the Collective</span>
                  </Link>
                  <Link
                    href="/auth/login"
                    className="btn-secondary text-xs sm:text-sm px-4.5 py-2.5 font-bold"
                  >
                    <span>Operative Sign In</span>
                  </Link>
                </>
              )}

              <Link
                href="/dashboard/leaderboard"
                className="btn-secondary text-xs sm:text-sm px-4.5 py-2.5 font-bold text-[#FF9F43] hover:text-[#FF8533]"
              >
                <span>Operative Roster</span>
              </Link>
            </div>
            </div>
          </div>

          {/* Right Column: Infiltration Telemetry Terminal */}
          <div className="lg:col-span-5 w-full">
            <div className="relative z-10">
            <div className="terminal-window border-[#232B36]">
              <div className="terminal-header justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="terminal-dot bg-[#EF4444]"></span>
                  <span className="terminal-dot bg-[#F59E0B]"></span>
                  <span className="terminal-dot bg-[#10B981]"></span>
                  <span className="text-[11px] text-[#8B949E] ml-1.5 font-mono">
                    Breach Telemetry
                  </span>
                </div>
                <span className="text-[10px] text-[#10B981] font-mono font-bold bg-[#141920] px-2 py-0.5 rounded border border-[#232B36]">
                  UPLINK ACTIVE
                </span>
              </div>

              <div className="p-4 font-mono text-xs space-y-1.5 h-[240px] sm:h-[260px] overflow-y-auto bg-[#050709]">
                {terminalLogs.slice(0, terminalStep).map((log, idx) => (
                  <div key={idx} className={`${log.color} flex items-start gap-2 leading-relaxed`}>
                    <span className="text-[#FF6B00] font-bold select-none">❯</span>
                    <span>{log.text}</span>
                  </div>
                ))}
                {terminalStep < terminalLogs.length && (
                  <div className="text-[#8B949E] flex items-center gap-1 animate-pulse">
                    <span className="text-[#FF6B00] font-bold">❯</span>
                    <span className="w-1.5 h-3.5 bg-[#FF6B00] inline-block"></span>
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-[#0B0E12] border-t border-[#232B36] flex items-center justify-between text-[11px] font-mono text-[#8B949E]">
                <span>TARGET: NEXACORP-GLOBAL-SYSTEMS</span>
                <span className="text-[#10B981] font-semibold">● INFILTRATION READY</span>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Telemetry Metric Cards */}
        <div className="mt-6 pt-5 border-t border-[#232B36] grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#141920] border border-[#232B36] p-3.5 rounded-xl">
            <span className="font-mono text-[10px] font-bold text-[#FF8533] block mb-0.5">Total Bounty</span>
            <span className="font-mono text-xl sm:text-2xl font-black text-[#FF6B00]">2,250 XP</span>
          </div>
          <div className="bg-[#141920] border border-[#232B36] p-3.5 rounded-xl">
            <span className="font-mono text-[10px] font-bold text-[#FF8533] block mb-0.5">Target Defenses</span>
            <span className="font-mono text-xl sm:text-2xl font-black text-[#F5F5F5]">8 Stages</span>
          </div>
          <div className="bg-[#141920] border border-[#232B36] p-3.5 rounded-xl">
            <span className="font-mono text-[10px] font-bold text-[#FF8533] block mb-0.5">Infiltration Path</span>
            <span className="font-mono text-xl sm:text-2xl font-black text-[#10B981]">Sequential</span>
          </div>
          <div className="bg-[#141920] border border-[#232B36] p-3.5 rounded-xl">
            <span className="font-mono text-[10px] font-bold text-[#FF8533] block mb-0.5">Flag Validation</span>
            <span className="font-mono text-xl sm:text-2xl font-black text-[#FF9F43]">Realtime</span>
          </div>
        </div>
      </section>

      {/* Killchain Phase Roadmap */}
      <section className="space-y-5">
        <div className="text-center max-w-xl mx-auto space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-[#141920] border border-[#232B36] rounded-full text-[11px] font-mono text-[#FF6B00] font-bold">
            <span>◈</span>
            <span>NexaCorp Killchain Phases</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#F5F5F5] font-sans tracking-tight">
            The Infiltration Roadmap
          </h2>
          <p className="text-xs sm:text-sm text-[#8B949E] font-sans">
            Breach each defense ring sequentially to penetrate deeper into NexaCorp&apos;s internal network.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Phase 1 */}
          <div className="cyber-card p-4.5 flex flex-col justify-between space-y-3 bg-[#10151C]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-[#FF8533] bg-[#07090C] px-2 py-0.5 rounded border border-[#232B36]">
                  Phase 01
                </span>
                <span className="text-[11px] font-mono text-[#10B981] font-bold">Stages 1–2</span>
              </div>
              <h3 className="font-sans text-base font-bold text-[#F5F5F5]">
                Perimeter Recon & SIGINT
              </h3>
              <p className="text-xs text-[#8B949E] leading-relaxed font-sans">
                Harvest leaked employee metadata and demodulate intercepted whistleblower transmissions.
              </p>
            </div>
            <div className="pt-2.5 border-t border-[#232B36] font-mono text-[10px] text-[#FF8533] font-semibold">
              OSINT · Audio Stego
            </div>
          </div>

          {/* Phase 2 */}
          <div className="cyber-card p-4.5 flex flex-col justify-between space-y-3 bg-[#10151C]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-[#FF9F43] bg-[#07090C] px-2 py-0.5 rounded border border-[#232B36]">
                  Phase 02
                </span>
                <span className="text-[11px] font-mono text-[#FF9F43] font-bold">Stages 3–4</span>
              </div>
              <h3 className="font-sans text-base font-bold text-[#F5F5F5]">
                Crypto Oracle & SSO Bypass
              </h3>
              <p className="text-xs text-[#8B949E] leading-relaxed font-sans">
                Recover cryptographic keys via oracle probing and inject SQL payloads into the employee SSO gateway.
              </p>
            </div>
            <div className="pt-2.5 border-t border-[#232B36] font-mono text-[10px] text-[#FF9F43] font-semibold">
              AES Oracle · SQL Injection
            </div>
          </div>

          {/* Phase 3 */}
          <div className="cyber-card p-4.5 flex flex-col justify-between space-y-3 bg-[#10151C]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-[#FF6B00] bg-[#07090C] px-2 py-0.5 rounded border border-[#232B36]">
                  Phase 03
                </span>
                <span className="text-[11px] font-mono text-[#FF6B00] font-bold">Stages 5–6</span>
              </div>
              <h3 className="font-sans text-base font-bold text-[#F5F5F5]">
                PRNG Forecast & Binary RE
              </h3>
              <p className="text-xs text-[#8B949E] leading-relaxed font-sans">
                Solve pseudo-random generator state algorithms and decompile proprietary ELF binaries in Ghidra.
              </p>
            </div>
            <div className="pt-2.5 border-t border-[#232B36] font-mono text-[10px] text-[#FF6B00] font-semibold">
              PRNG Math · Reverse Engineering
            </div>
          </div>

          {/* Phase 4 */}
          <div className="cyber-card p-4.5 flex flex-col justify-between space-y-3 bg-[#10151C]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-[#EF4444] bg-[#07090C] px-2 py-0.5 rounded border border-[#232B36]">
                  Phase 04
                </span>
                <span className="text-[11px] font-mono text-[#EF4444] font-bold">Stages 7–8</span>
              </div>
              <h3 className="font-sans text-base font-bold text-[#F5F5F5]">
                Root PrivEsc & Subnet Pivoting
              </h3>
              <p className="text-xs text-[#8B949E] leading-relaxed font-sans">
                Escalate Linux execution to root and trigger SSRF pivots to exfiltrate NexaCorp&apos;s master database.
              </p>
            </div>
            <div className="pt-2.5 border-t border-[#232B36] font-mono text-[10px] text-[#EF4444] font-semibold">
              Linux Root · SSRF Exfiltration
            </div>
          </div>
        </div>
      </section>

      {/* Rules of Engagement & Readiness */}
      <section className="cyber-panel p-5 sm:p-6 bg-[#0E1217]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-1.5 font-mono text-xs text-[#FF8533] font-bold">
              <span>Collective Rules of Engagement</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#F5F5F5] font-sans">
              Directive Before Infiltration
            </h3>
            <p className="text-xs sm:text-sm text-[#8B949E] leading-relaxed font-sans">
              All target hosts run in isolated sandboxes. Defense rings unlock in strict chronological order upon submitting the authentic flag hash: <code className="text-[#FF6B00] font-mono font-bold">SHADOWNET{'{...}'}</code>.
            </p>
          </div>

          <div className="w-full lg:w-auto flex-shrink-0">
            {user ? (
              <Link href="/dashboard/challenges" className="btn-primary text-xs sm:text-sm px-5 py-2.5 font-bold w-full text-center">
                Launch Target Deck
              </Link>
            ) : (
              <Link href="/auth/register" className="btn-primary text-xs sm:text-sm px-5 py-2.5 font-bold w-full text-center">
                Join Collective
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
