import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export default function ProgressBar({ current, total, label }: ProgressBarProps) {
  const percentage = Math.min(100, Math.round((current / (total || 1)) * 100));

  return (
    <div className="w-full cyber-panel p-4 sm:p-5 bg-[#0E1217]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2.5 font-mono text-xs">
        <span className="text-[#8B949E] font-bold tracking-wider uppercase flex items-center gap-2">
          <span className="text-[#FF6B00]">◈</span>
          {label || 'NexaCorp Infiltration Progress'}
        </span>
        <div className="flex items-center gap-2.5">
          <span className="text-[#FF8533] font-bold text-xs">
            {current} / {total} Stages Breached
          </span>
          <span className="text-[#10B981] font-black text-xs">({percentage}%)</span>
        </div>
      </div>

      <div className="w-full h-3 bg-[#080A0D] rounded-full overflow-hidden border border-[#232B36] p-0.5">
        <div
          className="h-full bg-gradient-to-r from-[#9FEF00] via-[#9FEF00] to-[#9FEF00] transition-all duration-500 rounded-full shadow-[0_0_12px_rgba(159,239,0,0.3)]"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
