'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { STAGE_CONFIGS, StageInfo } from '@/lib/constants';
import AttackVectorModal from '@/components/AttackVectorModal';

interface ProgressData {
  total_points: number;
  challenges_solved: number;
  solved_challenge_ids: number[];
}

export default function ProgressPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  // Attack Vector Animation Modal state
  const [activeModalStage, setActiveModalStage] = useState<number | null>(null);
  const [activeStageData, setActiveStageData] = useState<StageInfo | null>(null);

  const fetchProgress = async () => {
    try {
      const res = await axios.get('/api/scores/progress');
      setProgress(res.data);
    } catch (err: unknown) {
      const errorObj = err as { response?: { status?: number } };
      if (errorObj.response?.status === 401) {
        setAuthError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  const handleOpenAttackModal = (stage: StageInfo) => {
    setActiveStageData(stage);
    setActiveModalStage(stage.stage);
  };

  const handleProceedToChallenge = () => {
    if (activeStageData) {
      router.push(`/dashboard/challenges/${activeStageData.stage}`);
    }
  };

  if (authError) {
    return (
      <div className="auth-container">
        <div className="max-w-md w-full cyber-panel rounded-xl p-6 sm:p-8 text-center space-y-5 relative overflow-hidden bg-[#0E1217]">
          <div className="w-14 h-14 rounded-xl bg-[#141920] border border-[#FF6B00]/40 flex items-center justify-center text-2xl mx-auto text-[#FF6B00] shadow-[0_0_16px_rgba(255,107,0,0.2)]">
            🔒
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-[#FF8533] bg-[#FF6B00]/15 px-2.5 py-0.5 rounded-full border border-[#FF6B00]/30 inline-block font-mono">
              Operative Access Required
            </span>
            <h2 className="text-2xl font-bold font-sans text-[#F5F5F5] tracking-tight">
              Infiltration Progress Locked
            </h2>
            <p className="text-xs text-[#8B949E] leading-relaxed font-sans max-w-xs mx-auto">
              Sign in to view your campaign killchain progression and exfiltrated bounties.
            </p>
          </div>
          <div className="flex justify-center pt-2">
            <Link href="/auth/login" className="btn-primary w-full sm:w-auto h-10 px-6 text-xs font-bold">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const stagesList = Object.values(STAGE_CONFIGS);
  const solvedSet = new Set(progress?.solved_challenge_ids || []);

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Attack Vector Animation Modal */}
      {activeModalStage && (
        <AttackVectorModal
          stageNumber={activeModalStage}
          isOpen={!!activeModalStage}
          onClose={() => setActiveModalStage(null)}
          onProceed={handleProceedToChallenge}
          challengeTitle={activeStageData?.name}
          domain={activeStageData?.domain}
          points={activeStageData?.points}
        />
      )}

      {/* Header */}
      <div className="bg-[#0E1217] border border-[#232B36] rounded-xl p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-[#141920] border border-[#232B36] rounded-full text-[11px] font-mono text-[#FF8533] mb-2 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
            <span>NexaCorp Breach Killchain</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#F5F5F5] font-sans flex items-center gap-2.5 tracking-tight">
            Infiltration Progression Map
          </h1>
          <p className="font-sans text-xs sm:text-sm text-[#8B949E] mt-1">
            Track breached defenses across all eight NexaCorp security rings.
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 font-mono flex-shrink-0">
          <div className="bg-[#141920] border border-[#232B36] px-4 py-2.5 rounded-lg text-right">
            <span className="text-[10px] text-[#8B949E] block">Bounty Earned</span>
            <span className="font-mono text-lg sm:text-xl font-black text-[#FF6B00]">
              {progress?.total_points || 0} <span className="text-xs text-[#FF9F43]">XP</span>
            </span>
          </div>
          <div className="bg-[#141920] border border-[#232B36] px-4 py-2.5 rounded-lg text-right">
            <span className="text-[10px] text-[#8B949E] block">Stages Breached</span>
            <span className="font-mono text-lg sm:text-xl font-black text-[#10B981]">
              {solvedSet.size}/8
            </span>
          </div>
        </div>
      </div>

      {/* Sequential Timeline / Progression Path */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-20 font-mono text-xs text-[#8B949E]">
            <span className="inline-block animate-spin mr-2 text-[#FF6B00]">⚙️</span>
            Scanning campaign telemetry...
          </div>
        ) : (
          stagesList.map((stage) => {
            const isSolved = solvedSet.has(stage.stage);
            const isUnlocked = stage.stage === 1 || solvedSet.has(stage.stage - 1);
            const isLocked = !isUnlocked;

            return (
              <div
                key={stage.stage}
                className={`cyber-card p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                  isSolved
                    ? 'border-[#10B981]/40 bg-[#0B1410] shadow-[0_2px_12px_rgba(16,185,129,0.06)]'
                    : isLocked
                    ? 'opacity-60 bg-[#090C10] border-[#202732]'
                    : 'border-[#FF6B00]/40 bg-[#111720] shadow-[0_2px_16px_rgba(255,107,0,0.1)]'
                }`}
              >
                <div className="flex items-start gap-3.5 sm:gap-4">
                  {/* Node */}
                  <div
                    className={`w-11 h-11 rounded-lg flex items-center justify-center font-mono font-black text-sm border flex-shrink-0 ${
                      isSolved
                        ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                        : isLocked
                        ? 'bg-[#0E1217] text-[#8B949E] border-[#232B36]'
                        : 'bg-[#FF6B00]/15 text-[#FF6B00] border-[#FF6B00]/50 shadow-[0_0_12px_rgba(255,107,0,0.25)] animate-pulse'
                    }`}
                  >
                    {`0${stage.stage}`}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-[#FF8533] font-bold">
                        {stage.domain}
                      </span>
                      <span className="text-[#232B36]">•</span>
                      <span className="font-mono text-[11px] text-[#8B949E]">
                        {stage.subsystemCode}
                      </span>
                      <span className="text-[#232B36]">•</span>
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                          isSolved
                            ? 'text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30'
                            : isLocked
                            ? 'text-[#8B949E] bg-[#0E1217] border border-[#232B36]'
                            : 'text-[#FF6B00] bg-[#FF6B00]/10 border border-[#FF6B00]/30'
                        }`}
                      >
                        {isSolved ? 'Breached' : isLocked ? 'Locked' : 'Target Active'}
                      </span>
                    </div>

                    <h3 className="font-sans text-sm sm:text-base font-bold text-[#F5F5F5]">
                      {stage.name}
                    </h3>

                    <p className="font-sans text-xs text-[#8B949E] mt-0.5 leading-relaxed">
                      {stage.vectorSummary || stage.accessGuide}
                    </p>
                  </div>
                </div>

                {/* Action */}
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end pt-3 md:pt-0 border-t md:border-t-0 border-[#232B36] flex-shrink-0">
                  <div className="font-mono text-right">
                    <span className="text-[10px] text-[#8B949E] block">Bounty</span>
                    <span className="text-sm sm:text-base font-bold text-[#FF6B00]">+{stage.points} XP</span>
                  </div>

                  {isLocked ? (
                    <button
                      disabled
                      className="btn-secondary text-xs h-9 px-4"
                    >
                      Locked
                    </button>
                  ) : isSolved ? (
                    <Link
                      href={`/dashboard/challenges/${stage.stage}`}
                      className="btn-secondary text-[#10B981] border-[#10B981]/40 hover:text-[#10B981] text-xs h-9 font-bold px-4 whitespace-nowrap flex items-center"
                    >
                      Review Intel
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleOpenAttackModal(stage)}
                      className="btn-primary text-xs h-9 font-bold px-4 whitespace-nowrap flex items-center cursor-pointer"
                    >
                      Infiltrate
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
