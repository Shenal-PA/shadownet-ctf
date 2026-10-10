'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { STAGE_CONFIGS, StageInfo } from '@/lib/constants';

interface AttackVectorModalProps {
  stageNumber: number;
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  challengeTitle?: string;
  domain?: string;
  points?: number;
}

export default function AttackVectorModal({
  stageNumber,
  isOpen,
  onClose,
  onProceed,
  challengeTitle,
  points,
}: AttackVectorModalProps) {
  const stageConfig: StageInfo | undefined = STAGE_CONFIGS[stageNumber];
  const [logIndex, setLogIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3.0);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  const logs = stageConfig?.attackSimSteps || [
    { text: `[INIT] Target host mapped: NexaCorp Stage 0${stageNumber}`, type: 'info' },
    { text: `[PROBE] Establishing tactical collective uplink to perimeter...`, type: 'exec' },
    { text: `[VECTOR] Executing vulnerability payload against target subsystem...`, type: 'warn' },
    { text: `[BREACH] Perimeter broken! Target session access established.`, type: 'success' },
  ];

  const rawHexDump = [
    '0x0000: 7f45 4c46 0201 0100 0000 0000 0000 0000  .ELF............',
    '0x0010: 0300 3e00 0100 0000 e011 4000 0000 0000  ..>.......@.....',
    '0x0020: 4000 0000 0000 0000 081f 0000 0000 0000  @...............',
    '0x0030: 0000 0000 4000 3800 0900 4000 1f00 1c00  ....@.8...@.....',
  ];

  // 3-Second Automatic Timer & Staggered Log Animation
  useEffect(() => {
    if (!isOpen) {
      setLogIndex(0);
      setTimeLeft(3.0);
      return;
    }

    setLogIndex(0);
    setTimeLeft(3.0);

    // Staggered log index sequence (appear over 2.2s)
    const logInterval = setInterval(() => {
      setLogIndex((prev) => (prev < logs.length ? prev + 1 : prev));
    }, 450);

    // Countdown timer tick (every 100ms)
    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(timerInterval);
          return 0;
        }
        return parseFloat((prev - 0.1).toFixed(1));
      });
    }, 100);

    // Auto-proceed after exactly 3.0 seconds (3000ms)
    const autoProceedTimer = setTimeout(() => {
      onProceed();
    }, 3000);

    return () => {
      clearInterval(logInterval);
      clearInterval(timerInterval);
      clearTimeout(autoProceedTimer);
    };
  }, [isOpen, logs.length, onProceed]);

  // Auto scroll terminal logs
  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logIndex]);

  // Handle escape key to cancel or Space/Enter to proceed immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onProceed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onProceed]);

  if (!isOpen || !portalContainer) return null;

  const progressPercent = Math.min(100, Math.round(((3.0 - timeLeft) / 3.0) * 100));

  return createPortal(
    <div className="fixed inset-0 z-[9999] h-dvh flex flex-col bg-[#030508] text-[#F5F5F5] font-mono overflow-hidden animate-fade-in select-none">
      {/* Top 3-Second Progress Bar */}
      <div className="h-1.5 w-full bg-[#0E131A] flex-shrink-0">
        <div
          className="h-full bg-gradient-to-r from-[#9FEF00] via-[#9FEF00] to-[#9FEF00] transition-all duration-100 ease-linear shadow-[0_0_12px_rgba(159,239,0,0.3)]"
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      {/* Full-Screen Terminal Header */}
      <header className="px-4 sm:px-6 py-3 bg-[#070A0E] border-b border-[#232B36] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#EF4444]"></span>
            <span className="w-3 h-3 rounded-full bg-[#F59E0B]"></span>
            <span className="w-3 h-3 rounded-full bg-[#10B981]"></span>
          </div>

          <div className="h-4 w-px bg-[#232B36] mx-1 hidden sm:block"></div>

          <div className="flex items-center gap-2">
            <span className="text-[#FF8533] font-bold text-xs sm:text-sm">
              SHADOWNET COLLECTIVE // INFILTRATION TERMINAL
            </span>
            <span className="text-[#232B36]">|</span>
            <span className="text-[#8B949E] text-xs hidden md:inline">
              TARGET: <strong className="text-[#F5F5F5]">{stageConfig?.subsystemCode || `STAGE-0${stageNumber}`}</strong> ({challengeTitle || stageConfig?.name})
            </span>
          </div>
        </div>

        {/* Right Timer & Skip Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-[#0F141C] border border-[#232B36] rounded-lg text-xs">
            <span className="text-[#8B949E]">LAUNCHING IN:</span>
            <span className="text-[#FF6B00] font-black">{timeLeft.toFixed(1)}s</span>
          </div>

          <button
            onClick={onProceed}
            className="px-3 py-1 bg-[#FF6B00]/15 hover:bg-[#FF6B00]/25 text-[#FF8533] border border-[#FF6B00]/40 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
          >
            <span>Skip [Space]</span>
            <span>→</span>
          </button>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#0F141C] border border-[#232B36] text-[#8B949E] hover:text-[#EF4444] text-xs font-bold flex items-center justify-center transition-all cursor-pointer"
            title="Abort (Esc)"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Main Full-Screen Terminal Body */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto bg-[#030508] space-y-3 text-xs sm:text-sm leading-relaxed">
        {/* Banner */}
        <div className="text-[#8B949E] pb-2 border-b border-[#141C24] space-y-1">
          <div className="text-[#FF8533] font-bold text-sm sm:text-base">
            === NEXACORP DEFENSE BREACH PROTOCOL v2.4 ===
          </div>
          <div>TARGET HOST: <span className="text-[#F5F5F5] font-bold">{stageConfig?.targetSystem || `NexaCorp Stage 0${stageNumber}`}</span></div>
          <div>EXPLOIT VECTOR: <span className="text-[#FF9F43] font-bold">{stageConfig?.attackVector || 'Tactical Payload Injection'}</span> | BOUNTY: <span className="text-[#FF6B00] font-bold">+{points || stageConfig?.points || 100} XP</span></div>
        </div>

        {/* Command Executed */}
        <div className="pt-2 text-[#8B949E]">
          <span className="text-[#FF6B00] font-bold">shadow-ops@collective:~$</span> ./infiltrate_target.sh --stage=0{stageNumber} --subsystem={stageConfig?.subsystemCode || `STAGE-0${stageNumber}`} --auto-exploit
        </div>

        {/* Staggered Log Steps */}
        {logs.slice(0, logIndex).map((step, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 ${
              step.type === 'success'
                ? 'text-[#10B981] font-bold text-sm'
                : step.type === 'warn'
                ? 'text-[#FF9F43]'
                : step.type === 'exec'
                ? 'text-[#F59E0B]'
                : 'text-[#8B949E]'
            }`}
          >
            <span className="text-[#FF6B00] font-bold select-none">❯</span>
            <span>{step.text}</span>
          </div>
        ))}

        {/* Hex Injection Stream */}
        {logIndex >= 2 && (
          <div className="p-3 my-2 rounded bg-[#070A0F] border border-[#141C24] text-[11px] text-[#556375] font-mono space-y-0.5">
            <div className="text-[#8B949E] font-bold text-xs mb-1">{'//'} INJECTING MEMORY EXPLOIT BUFFER:</div>
            {rawHexDump.map((hex, i) => (
              <div key={i}>{hex}</div>
            ))}
          </div>
        )}

        {/* Success Confirmation & Redirection Alert */}
        {logIndex >= logs.length && (
          <div className="p-3 my-2 rounded bg-[#10B981]/10 border border-[#10B981]/40 text-[#10B981] font-bold text-xs sm:text-sm flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping"></span>
              <span>[SUCCESS] DEFENSE RING 0{stageNumber} COMPROMISED. SPAWNING SHELL...</span>
            </div>
            <span className="text-xs text-[#8B949E] hidden sm:inline">Redirecting in {timeLeft.toFixed(1)}s...</span>
          </div>
        )}

        {/* Blinking Cursor */}
        {logIndex < logs.length && (
          <div className="text-[#8B949E] flex items-center gap-1.5 animate-pulse">
            <span className="text-[#FF6B00] font-bold">❯</span>
            <span className="w-2 h-4 bg-[#FF6B00] inline-block"></span>
          </div>
        )}

        <div ref={terminalBottomRef} />
      </main>

      {/* Terminal Footer Status Bar */}
      <footer className="px-4 sm:px-6 py-2.5 bg-[#070A0E] border-t border-[#232B36] flex items-center justify-between text-xs text-[#8B949E] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
          <span>TERMINAL SESSION: <strong className="text-[#F5F5F5]">ACTIVE</strong></span>
        </div>
        <div className="flex items-center gap-3">
          <span>PRESS <strong className="text-[#FF8533]">[SPACE]</strong> TO SKIP</span>
          <span className="text-[#232B36]">|</span>
          <span>PRESS <strong className="text-[#8B949E]">[ESC]</strong> TO ABORT</span>
        </div>
      </footer>
    </div>,
    portalContainer,
  );
}
