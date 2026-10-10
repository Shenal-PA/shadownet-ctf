import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

// GET: Fetch all submissions audit log
export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser || !authUser.is_admin) {
      return NextResponse.json(
        { error: 'Admin clearance required. Access denied.' },
        { status: 403 }
      );
    }

    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('id, user_id, challenge_id, submitted_flag, is_correct, submitted_at')
      .order('submitted_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get users & challenges
    const userIds = Array.from(new Set((submissions || []).map((s) => s.user_id)));
    const { data: users } = await supabase
      .from('users')
      .select('id, username')
      .in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']);

    const userMap = new Map<string, string>();
    (users || []).forEach((u) => userMap.set(u.id, u.username));

    const { data: challenges } = await supabase
      .from('challenges')
      .select('id, name, stage_number');

    const chalMap = new Map<number, { name: string; stage_number: number }>();
    (challenges || []).forEach((c) => chalMap.set(Number(c.id), { name: c.name, stage_number: c.stage_number }));

    const formatted = (submissions || []).map((s) => {
      const chal = chalMap.get(Number(s.challenge_id));
      return {
        id: s.id,
        user_id: s.user_id,
        username: userMap.get(s.user_id) || 'Unknown Operative',
        challenge_id: s.challenge_id,
        challenge_name: chal ? chal.name : `Stage #${s.challenge_id}`,
        stage_number: chal ? chal.stage_number : s.challenge_id,
        submitted_flag: s.submitted_flag,
        is_correct: s.is_correct,
        created_at: s.submitted_at,
        submitted_at: s.submitted_at,
      };
    });

    return NextResponse.json({ submissions: formatted });
  } catch (error) {
    console.error('Admin get submissions error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching submissions log' },
      { status: 500 }
    );
  }
}
