import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get solved submissions
    const { data: solves } = await supabase
      .from('submissions')
      .select('challenge_id, submitted_at')
      .eq('user_id', user.sub)
      .eq('is_correct', true);

    // Get user score
    const { data: score } = await supabase
      .from('scores')
      .select('total_points, challenges_solved')
      .eq('user_id', user.sub)
      .single();

    return NextResponse.json({
      total_points: score?.total_points || 0,
      challenges_solved: score?.challenges_solved || 0,
      solved_challenge_ids: (solves || []).map((s) => s.challenge_id),
      solves: solves || [],
    });
  } catch (error) {
    console.error('Progress API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
