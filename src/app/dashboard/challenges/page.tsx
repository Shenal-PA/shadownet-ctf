'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import ChallengeCard, { Challenge } from '@/components/ChallengeCard';
import ProgressBar from '@/components/ProgressBar';
import AttackVectorModal from '@/components/AttackVectorModal';
import OperativeArtwork from '@/components/OperativeArtwork';

export default function ChallengesListPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [filterDomain, setFilterDomain] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Attack Vector Animation Modal state
  const [activeModalStage, setActiveModalStage] = useState<number | null>(null);
  const [activeChallengeData, setActiveChallengeData] = useState<Challenge | null>(null);

  const fetchChallenges = async () => {
    try {
      const res = await axios.get('/api/challenges');
      setChallenges(res.data.challenges || []);
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
    fetchChallenges();
  }, []);

  const handleOpenAttackModal = (challenge: Challenge) => {
    setActiveChallengeData(challenge);
    setActiveModalStage(challenge.stage_number);
  };

  const handleProceedToChallenge = () => {
    if (activeChallengeData) {
      router.push(`/dashboard/challenges/${activeChallengeData.id}`);
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
              Authentication Required
            </span>
            <h2 className="text-2xl font-bold font-sans text-[#F5F5F5] tracking-tight">
              Authenticate Operative
            </h2>
            <p className="text-xs text-[#8B949E] leading-relaxed font-sans max-w-xs mx-auto">
              You must authenticate with the ShadowNet collective to view NexaCorp target systems.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <Link href="/auth/login" className="btn-primary w-full sm:w-auto h-10 px-5 text-xs font-bold">
              Sign In
            </Link>
            <Link href="/auth/register" className="btn-secondary w-full sm:w-auto h-10 px-5 text-xs font-bold">
              Join Collective
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const domains = ['ALL', ...Array.from(new Set(challenges.map((c) => c.domain)))];
  const solvedCount = challenges.filter((c) => c.solved).length;
  const totalXP = challenges.reduce((acc, c) => acc + (c.solved ? c.points : 0), 0);
  const nextTarget = challenges.find((c) => !c.solved && c.unlocked);

  const filteredChallenges = challenges.filter((c) => {
    const matchesDomain = filterDomain === 'ALL' || c.domain === filterDomain;
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDomain && matchesSearch;
  });

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Attack Vector Animation Modal */}
      {activeModalStage && (
        <AttackVectorModal
          stageNumber={activeModalStage}
          isOpen={!!activeModalStage}
          onClose={() => setActiveModalStage(null)}
          onProceed={handleProceedToChallenge}
          challengeTitle={activeChallengeData?.name}
          domain={activeChallengeData?.domain}
          points={activeChallengeData?.points}
        />
      )}

      {/* Header & Stats Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 bg-[#0E1217] border border-[#232B36] rounded-xl p-5 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
            <span className="font-mono text-[11px] font-bold text-[#FF8533]">
              NexaCorp Target Deck Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#F5F5F5] font-sans flex items-center gap-2.5 tracking-tight">
            Target Systems & Breach Vectors
          </h1>
          <p className="font-sans text-xs sm:text-sm text-[#8B949E] mt-1">
            Eight progressive defense perimeters. Solve each vulnerability to breach the next NexaCorp layer.
          </p>
        </div>

        {/* Stats Pill */}
        <div className="relative z-10 flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
          <div className="bg-[#141920] border border-[#232B36] rounded-lg px-4 py-2.5 text-right">
            <span className="text-[10px] font-mono text-[#8B949E] block">Loot XP</span>
            <span className="font-mono text-lg sm:text-xl font-black text-[#FF6B00]">
              {totalXP} <span className="text-xs text-[#FF9F43]">XP</span>
            </span>
          </div>
          <div className="bg-[#141920] border border-[#232B36] rounded-lg px-4 py-2.5 text-right">
            <span className="text-[10px] font-mono text-[#8B949E] block">Breached</span>
            <span className="font-mono text-lg sm:text-xl font-black text-[#10B981]">
              {solvedCount}/{challenges.length}
            </span>
          </div>
        </div>
      </div>

      {/* Next Priority Target Highlight Banner */}
      {nextTarget && (
        <div className="bg-[#111720] border border-[#FF6B00]/40 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(255,107,0,0.1)]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-[#FF6B00]/15 border border-[#FF6B00]/50 flex items-center justify-center font-mono font-black text-[#FF6B00] text-sm flex-shrink-0">
              0{nextTarget.stage_number}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-[#FF8533] font-bold uppercase tracking-wider">
                  PRIORITY INFILTRATION TARGET
                </span>
                <span className="text-[#232B36]">|</span>
                <span className="font-mono text-[11px] text-[#FF9F43] font-semibold">
                  {nextTarget.domain}
                </span>
              </div>
              <h3 className="font-sans text-base font-bold text-[#F5F5F5] leading-snug">
                {nextTarget.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center w-full sm:w-auto">
            <button
              onClick={() => handleOpenAttackModal(nextTarget)}
              className="btn-primary text-xs font-bold px-6 h-10 whitespace-nowrap w-full sm:w-auto text-center cursor-pointer"
            >
              Infiltrate · +{nextTarget.points} XP
            </button>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <ProgressBar
        current={solvedCount}
        total={challenges.length}
        label="NexaCorp Infiltration Progress"
      />

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0E1217] border border-[#232B36] rounded-xl p-3.5 font-mono text-xs">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search targets by name, domain, or briefing..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#080A0D] border border-[#232B36] rounded-lg px-3.5 h-10 text-[#F5F5F5] placeholder-[#555E6B] focus:outline-none focus:border-[#FF6B00] text-xs font-mono transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-[#8B949E] text-xs whitespace-nowrap pl-1 font-semibold">Vector:</span>
          {domains.map((dom) => (
            <button
              key={dom}
              onClick={() => setFilterDomain(dom)}
              aria-pressed={filterDomain === dom}
              className="filter-chip"
            >
              {dom === 'ALL' ? 'All Vectors' : dom}
            </button>
          ))}
        </div>
      </div>

      {/* Challenges Grid */}
      {loading ? (
        <div className="text-center py-20 font-mono text-xs text-[#8B949E]">
          <span className="inline-block animate-spin mr-2 text-[#FF6B00]">⚙️</span>
          Scanning NexaCorp perimeter targets...
        </div>
      ) : filteredChallenges.length === 0 ? (
        <div className="text-center py-16 bg-[#0E1217] border border-[#232B36] rounded-xl font-mono text-xs text-[#8B949E]">
          No matching NexaCorp target systems found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              onInfiltrate={handleOpenAttackModal}
            />
          ))}
        </div>
      )}

      <div className="challenge-operative-dock" aria-hidden="true">
        <OperativeArtwork
          sizes="(max-width: 640px) 96px, 144px"
          className="challenge-figure h-auto w-full object-contain"
        />
      </div>
    </div>
  );
}
