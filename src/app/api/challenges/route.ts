import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);

    // Require authentication to access challenge list
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in to access the challenges.' },
        { status: 401 }
      );
    }

    // Get all active challenges
    const { data: challenges, error } = await supabase
      .from('challenges')
      .select('id, name, domain, difficulty, description, points, delivery_method, stage_number, is_active')
      .eq('is_active', true)
      .order('stage_number', { ascending: true });

    if (error) {
      console.error('Challenges query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch challenges' },
        { status: 500 }
      );
    }

    // Get user's solved submissions
    const { data: solvedSubmissions } = await supabase
      .from('submissions')
      .select('challenge_id')
      .eq('user_id', authUser.sub)
      .eq('is_correct', true);

    const solvedIds = new Set<number>();
    if (solvedSubmissions) {
      solvedSubmissions.forEach((s) => solvedIds.add(s.challenge_id));
    }

    // admin gets all open fr
    const isAdmin = Boolean(authUser.is_admin);

    const challengesWithState = (challenges || []).map((c) => {
      const isSolved = solvedIds.has(c.id);
      let isUnlocked = isAdmin;

      if (!isAdmin) {
        if (c.stage_number === 1) {
          isUnlocked = true;
        } else {
          const prevChallenge = challenges?.find(
            (prev) => prev.stage_number === c.stage_number - 1
          );
          isUnlocked = prevChallenge ? solvedIds.has(prevChallenge.id) : false;
        }
      }

      return {
        ...c,
        solved: isSolved,
        unlocked: isUnlocked,
        locked: !isUnlocked,
        required_stage: c.stage_number > 1 ? c.stage_number - 1 : null,
      };
    });

    return NextResponse.json({ challenges: challengesWithState });
  } catch (error) {
    console.error('Challenges route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
      { status: 500 }
    );
  }
}
