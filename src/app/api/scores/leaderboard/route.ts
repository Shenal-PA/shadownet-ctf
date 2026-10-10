import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: leaderboard, error } = await supabase
      .from('scores')
      .select(`
        total_points,
        challenges_solved,
        last_submission_at,
        users:user_id (id, username, team_name, is_admin)
      `)
      .order('total_points', { ascending: false });

    if (error) {
      console.error('Leaderboard query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      );
    }

    // Exclude admins - leaderboard is exclusively for competitive players
    const playerOnlyScores = (leaderboard || [])
      .filter((entry: any) => !entry.users?.is_admin && entry.users?.username)
      .slice(0, 50);

    const formatted = playerOnlyScores.map((entry: any, index: number) => ({
      rank: index + 1,
      username: entry.users?.username || 'Anonymous Operative',
      team_name: entry.users?.team_name || 'Individual',
      total_points: entry.total_points,
      challenges_solved: entry.challenges_solved,
      last_submission_at: entry.last_submission_at,
    }));

    return NextResponse.json({ leaderboard: formatted });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
