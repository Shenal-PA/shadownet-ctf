import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser || !authUser.is_admin) {
      return NextResponse.json(
        { error: 'Admin clearance required. Access denied.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 1. Fetch user profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, email, team_name, is_admin, created_at')
      .eq('id', id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Operative not found' }, { status: 404 });
    }

    // 2. Fetch score details
    const { data: score } = await supabase
      .from('scores')
      .select('total_points, challenges_solved, last_submission_at')
      .eq('user_id', id)
      .single();

    // 3. Fetch all submissions for this user
    const { data: submissions } = await supabase
      .from('submissions')
      .select('id, challenge_id, submitted_flag, is_correct, submitted_at')
      .eq('user_id', id)
      .order('submitted_at', { ascending: false });

    // 4. Fetch all challenges to enrich solve & submission records
    const { data: challenges } = await supabase
      .from('challenges')
      .select('id, name, stage_number, points, domain, difficulty');

    const chalMap = new Map<number, any>();
    (challenges || []).forEach((c) => chalMap.set(Number(c.id), c));

    // Solved challenges list
    const solvedSubmissions = (submissions || []).filter((s) => s.is_correct);
    const solvedChallenges = solvedSubmissions.map((s) => {
      const chal = chalMap.get(Number(s.challenge_id));
      return {
        challenge_id: s.challenge_id,
        name: chal?.name || `Stage #${s.challenge_id}`,
        stage_number: chal?.stage_number || s.challenge_id,
        points: chal?.points || 0,
        domain: chal?.domain || 'Unknown',
        difficulty: chal?.difficulty || 'Unknown',
        solved_at: s.submitted_at,
      };
    });

    // Enriched submission audit for this specific user
    const enrichedSubmissions = (submissions || []).map((s) => {
      const chal = chalMap.get(Number(s.challenge_id));
      return {
        id: s.id,
        challenge_id: s.challenge_id,
        challenge_name: chal?.name || `Stage #${s.challenge_id}`,
        stage_number: chal?.stage_number || s.challenge_id,
        submitted_flag: s.submitted_flag,
        is_correct: s.is_correct,
        created_at: s.submitted_at,
        submitted_at: s.submitted_at,
      };
    });

    return NextResponse.json({
      operative: {
        ...user,
        total_points: score?.total_points || 0,
        challenges_solved: score?.challenges_solved || 0,
        last_submission_at: score?.last_submission_at || null,
        total_attempts: submissions?.length || 0,
        solved_challenges: solvedChallenges,
        submission_history: enrichedSubmissions,
      },
    });
  } catch (error) {
    console.error('Admin get user dossier error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching operative details' },
      { status: 500 }
    );
  }
}

