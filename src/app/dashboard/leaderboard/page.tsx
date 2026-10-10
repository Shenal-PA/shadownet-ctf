'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import OperativeArtwork from '@/components/OperativeArtwork';

interface LeaderboardEntry {
  rank: number;
  username: string;
  team_name: string;
  total_points: number;
  challenges_solved: number;
  last_submission_at: string | null;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get('/api/scores/leaderboard');
      setLeaderboard(res.data.leaderboard || []);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 10000);
    return () => clearInterval(interval);
  }, []);

  const getRankBadge = (rank: number) => `#${rank}`;

  const topThree = leaderboard.slice(0, 3);
  const totalBountyAwarded = leaderboard.reduce((acc, curr) => acc + curr.total_points, 0);

  return (
    <div className="relative isolate w-full space-y-5 sm:space-y-6">
      <OperativeArtwork
        sizes="(max-width: 640px) 256px, (max-width: 1024px) 320px, 432px"
        loading="eager"
        className="leaderboard-operative-watermark pointer-events-none absolute left-1/2 top-1/2 z-20 w-[clamp(16rem,30vw,27rem)] h-auto -translate-x-1/2 -translate-y-1/2"
      />

      {/* Header Banner */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 bg-[#0E1217] border border-[#232B36] rounded-xl p-5 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.35)] overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-[#141920] border border-[#232B36] rounded-full text-[11px] font-mono text-[#FF8533] mb-2 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
            <span>Live Operative Telemetry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#F5F5F5] font-sans">
            Collective Operative Standings
          </h1>
          <p className="text-xs sm:text-sm text-[#8B949E] mt-1 font-sans max-w-xl">
            Realtime rankings of underground operatives infiltrating NexaCorp systems.
          </p>
        </div>

        {/* Global Standings Metrics */}
        <div className="relative z-10 flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
          <div className="bg-[#141920] border border-[#232B36] rounded-lg px-4 py-2.5 text-right min-w-[120px]">
            <span className="text-[10px] font-mono text-[#8B949E] block">Operatives</span>
            <span className="font-mono text-lg sm:text-xl font-black text-[#FF8533]">
              {leaderboard.length}
            </span>
          </div>
          <div className="bg-[#141920] border border-[#232B36] rounded-lg px-4 py-2.5 text-right min-w-[130px]">
            <span className="text-[10px] font-mono text-[#8B949E] block">Bounties Claimed</span>
            <span className="font-mono text-lg sm:text-xl font-black text-[#FF6B00]">
              {totalBountyAwarded} <span className="text-xs font-bold text-[#FF9F43]">XP</span>
            </span>
          </div>
        </div>
      </div>

      {/* Top 3 Podium Highlights */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {topThree.map((podium, index) => (
            <div
              key={podium.rank}
              className={`cyber-card p-5 flex flex-col justify-between relative overflow-hidden ${
                index === 0
                  ? 'border-[#FF6B00]/50 bg-[#141922] shadow-[0_0_24px_rgba(255,107,0,0.15)]'
                  : index === 1
                  ? 'border-[#FF9F43]/45 bg-[#12161E]'
                  : 'border-[#F59E0B]/40 bg-[#10141A]'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-xs font-bold px-2.5 py-1 rounded border ${
                      index === 0
                        ? 'bg-[#FF6B00]/15 text-[#FF6B00] border-[#FF6B00]/40'
                        : index === 1
                        ? 'bg-[#FF9F43]/15 text-[#FF9F43] border-[#FF9F43]/40'
                        : 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40'
                    }`}
                  >
                    Rank #{podium.rank}
                  </span>
                  <span className="font-mono text-xs text-[#10B981] font-bold">
                    {podium.challenges_solved}/8 Breached
                  </span>
                </div>

                <div>
                  <h3 className="font-sans text-base font-bold text-[#F5F5F5] truncate">
                    {podium.username}
                  </h3>
                  <p className="font-mono text-xs text-[#8B949E]">
                    {podium.team_name || 'Independent Operative'}
                  </p>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-[#232B36] flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#8B949E]">Total Bounty</span>
                <span className="font-mono text-lg font-black text-[#FF6B00]">
                  {podium.total_points} <span className="text-xs text-[#FF9F43]">XP</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard Table Container */}
      <div className="w-full bg-[#0E1217] border border-[#232B36] rounded-xl overflow-hidden font-mono text-xs shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
        {loading ? (
          <div className="text-center py-24 text-[#8B949E] space-y-2">
            <span className="inline-block animate-spin text-lg text-[#FF6B00]">⚙️</span>
            <p className="text-sm font-sans">Scanning operative scores...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-24 text-[#8B949E] space-y-3">
            <p className="text-base font-bold text-[#F5F5F5] font-sans">No Operative Submissions Yet</p>
            <p className="text-sm text-[#8B949E] font-sans max-w-sm mx-auto">
              Breach a NexaCorp stage to appear on the collective roster.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left min-w-[650px]">
              <thead className="bg-[#141920] text-[#8B949E] border-b border-[#232B36] text-xs">
                <tr>
                  <th className="py-3 px-5 text-center w-20">Rank</th>
                  <th className="py-3 px-5">Operative Callsign</th>
                  <th className="py-3 px-5">Cell / Team</th>
                  <th className="py-3 px-5 text-center">Breached</th>
                  <th className="py-3 px-5 text-right">Bounty</th>
                  <th className="py-3 px-5 text-right">Last Breach</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232B36]">
                {leaderboard.map((entry) => (
                  <tr
                    key={entry.rank}
                    className={`hover:bg-[#141920]/80 transition-colors ${
                      entry.rank === 1
                        ? 'bg-[#FF6B00]/5'
                        : entry.rank === 2
                        ? 'bg-[#FF9F43]/5'
                        : entry.rank === 3
                        ? 'bg-[#F59E0B]/5'
                        : ''
                    }`}
                  >
                    <td className="py-3.5 px-5 text-center font-bold">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded ${
                          entry.rank === 1
                            ? 'text-[#FF6B00] bg-[#FF6B00]/15 border border-[#FF6B00]/40 font-black text-xs'
                            : entry.rank === 2
                            ? 'text-[#FF9F43] bg-[#FF9F43]/15 border border-[#FF9F43]/40 font-bold text-xs'
                            : entry.rank === 3
                            ? 'text-[#F59E0B] bg-[#F59E0B]/15 border border-[#F59E0B]/40 font-bold text-xs'
                            : 'text-[#8B949E] text-xs'
                        }`}
                      >
                        {getRankBadge(entry.rank)}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 font-bold text-[#F5F5F5] text-xs sm:text-sm">
                      {entry.username}
                    </td>

                    <td className="py-3.5 px-5 text-[#8B949E] text-xs">
                      {entry.team_name || 'Independent Operative'}
                    </td>

                    <td className="py-3.5 px-5 text-center text-[#10B981] font-bold text-xs">
                      {entry.challenges_solved}/8
                    </td>

                    <td className="py-3.5 px-5 text-right font-black text-[#FF6B00] text-sm sm:text-base">
                      {entry.total_points} <span className="text-xs text-[#FF9F43]">XP</span>
                    </td>

                    <td className="py-3.5 px-5 text-right text-[#8B949E] text-xs">
                      {entry.last_submission_at
                        ? new Date(entry.last_submission_at).toLocaleTimeString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
