'use client';

import React from 'react';
import Link from 'next/link';
import { STAGE_CONFIGS } from '@/lib/constants';

export interface Challenge {
  id: number;
  name: string;
  domain: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | string;
  description?: string;
  points: number;
  delivery_method?: string;
  stage_number: number;
  solved?: boolean;
  unlocked?: boolean;
  locked?: boolean;
  required_stage?: number | null;
}

interface ChallengeCardProps {
  challenge: Challenge;
  onInfiltrate?: (challenge: Challenge) => void;
}

export default function ChallengeCard({ challenge, onInfiltrate }: ChallengeCardProps) {
  const isLocked = challenge.locked ?? (!challenge.unlocked && challenge.stage_number > 1);
  const isSolved = challenge.solved;
  const stageConfig = STAGE_CONFIGS[challenge.stage_number];

  const getDifficultyBadge = (diff: string) => {
    switch (diff.toLowerCase()) {
      case 'easy':
        return 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30';
      case 'medium':
        return 'text-[#FF9F43] bg-[#FF9F43]/10 border-[#FF9F43]/30';
      case 'hard':
        return 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30';
      default:
        return 'text-[#8B949E] bg-[#8B949E]/10 border-[#8B949E]/30';
    }
  };

  const getDeliveryBadge = (method?: string) => {
    switch (method?.toLowerCase()) {
      case 'static':
        return 'Static web';
      case 'docker':
        return 'Docker runtime';
      case 'vm':
      case 'vms':
        return 'VM sandbox';
      default:
        return 'Daemon service';
    }
  };

  return (
    <div
      className={`cyber-card p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-200 group ${
        isSolved
          ? 'border-[#10B981]/40 bg-[#0B1410] shadow-[0_2px_12px_rgba(16,185,129,0.08)]'
          : isLocked
          ? 'border-[#202732] opacity-60 bg-[#090C10]'
          : 'border-[#26303D] hover:border-[#FF6B00]/70 bg-[#10151C] hover:shadow-[0_4px_20px_rgba(255,107,0,0.12)]'
      }`}
    >
      {/* Decorative Top Line */}
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 ${
          isSolved
            ? 'bg-[#10B981]'
            : isLocked
            ? 'bg-[#232B36]'
            : 'bg-gradient-to-r from-[#9FEF00] via-[#9FEF00] to-transparent'
        }`}
      ></div>

      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[#07090C] text-[#FF8533] border border-[#232B36]">
              Stage 0{challenge.stage_number}
            </span>
            <span
              className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${getDifficultyBadge(
                challenge.difficulty
              )}`}
            >
              {challenge.difficulty}
            </span>
          </div>

          {/* Status Badge */}
          {isSolved ? (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#10B981] bg-[#10B981]/15 px-2.5 py-0.5 rounded-full border border-[#10B981]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
              Breached
            </span>
          ) : isLocked ? (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-[#8B949E] bg-[#0E1217] px-2.5 py-0.5 rounded border border-[#232B36]">
              Locked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#FF8533] bg-[#FF6B00]/10 px-2.5 py-0.5 rounded-full border border-[#FF6B00]/30 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]"></span>
              Target Active
            </span>
          )}
        </div>

        {/* Subsystem Code */}
        <div className="text-[10px] font-mono text-[#8B949E] mb-1 flex items-center gap-1.5">
          <span className="text-[#FF6B00] font-bold">TARGET:</span>
          <span>{stageConfig?.subsystemCode || `NEXA-0${challenge.stage_number}`}</span>
        </div>

        {/* Title */}
        <h3
          className={`font-sans text-base font-bold mb-2 leading-snug transition-colors ${
            isSolved
              ? 'text-[#F5F5F5]'
              : isLocked
              ? 'text-[#8B949E]'
              : 'text-[#F5F5F5] group-hover:text-[#FF8533]'
          }`}
        >
          {challenge.name}
        </h3>

        {/* Domain & Delivery Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-3.5">
          <span className="font-mono text-[11px] text-[#FF9F43] bg-[#07090C] px-2 py-0.5 rounded border border-[#232B36] font-medium">
            {challenge.domain}
          </span>
          <span className="font-mono text-[11px] text-[#8B949E] bg-[#07090C] px-2 py-0.5 rounded border border-[#232B36]">
            {getDeliveryBadge(challenge.delivery_method)}
          </span>
        </div>

        {/* Description or Locked Message */}
        {isLocked ? (
          <div className="p-3 my-2 bg-[#07090C] border border-[#232B36] rounded-lg text-xs font-mono text-[#8B949E] flex items-center gap-2.5">
            <span className="text-sm">🔒</span>
            <span>
              Clear stage <strong className="text-[#F5F5F5]">0{challenge.required_stage}</strong> to unlock target.
            </span>
          </div>
        ) : (
          challenge.description && (
            <p className="text-xs text-[#8B949E] line-clamp-2 mb-4 leading-relaxed font-sans">
              {challenge.description}
            </p>
          )
        )}
      </div>

      {/* Footer / CTA */}
      <div className="pt-3.5 mt-2 border-t border-[#232B36] flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-[#8B949E]">Reward</span>
          <span className="font-mono text-base font-black text-[#FF6B00] leading-tight">
            +{challenge.points} <span className="text-[11px] font-bold text-[#FF9F43]">XP</span>
          </span>
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
            href={`/dashboard/challenges/${challenge.id}`}
            className="btn-secondary text-[#10B981] border-[#10B981]/40 hover:text-[#10B981] text-xs h-9 font-bold px-3.5 flex items-center"
          >
            Review Intel
          </Link>
        ) : onInfiltrate ? (
          <button
            onClick={() => onInfiltrate(challenge)}
            className="btn-primary text-xs h-9 font-bold px-4 flex items-center justify-center cursor-pointer"
          >
            Infiltrate
          </button>
        ) : (
          <Link
            href={`/dashboard/challenges/${challenge.id}`}
            className="btn-primary text-xs h-9 font-bold px-4 flex items-center justify-center"
          >
            Infiltrate
          </Link>
        )}
      </div>
    </div>
  );
}
