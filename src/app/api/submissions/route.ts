import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import { hashFlag } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in first.' },
        { status: 401 }
      );
    }

    const { challenge_id, flag } = await request.json();

    if (!challenge_id || !flag) {
      return NextResponse.json(
        { error: 'Challenge ID and flag are required' },
        { status: 400 }
      );
    }

    // Fetch challenge from DB
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, name, points, flag_hash, stage_number')
      .eq('id', challenge_id)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    // admin skips lock
    const isAdmin = Boolean(user.is_admin);

    if (!isAdmin && challenge.stage_number > 1) {
      const { data: prevChallenge } = await supabase
        .from('challenges')
        .select('id')
        .eq('stage_number', challenge.stage_number - 1)
        .single();

      if (prevChallenge) {
        const { data: prevSolved } = await supabase
          .from('submissions')
          .select('id')
          .eq('user_id', user.sub)
          .eq('challenge_id', prevChallenge.id)
          .eq('is_correct', true)
          .single();

        if (!prevSolved) {
          return NextResponse.json(
            { error: `Stage ${challenge.stage_number} is locked. You must solve Stage ${challenge.stage_number - 1} first.` },
            { status: 403 }
          );
        }
      }
    }

    // Check if challenge is already solved by user
    const { data: existingSolve } = await supabase
      .from('submissions')
      .select('id')
      .eq('user_id', user.sub)
      .eq('challenge_id', challenge_id)
      .eq('is_correct', true)
      .single();

    if (existingSolve) {
      return NextResponse.json(
        {
          correct: false,
          alreadySolved: true,
          message: 'You have already solved this challenge!',
        },
        { status: 200 }
      );
    }

    // Verify submitted flag
    const submittedHash = hashFlag(flag);
    const isCorrect = submittedHash === challenge.flag_hash;

    // Record submission
    const { error: insertError } = await supabase.from('submissions').insert({
      user_id: user.sub,
      challenge_id: Number(challenge_id),
      submitted_flag: flag.trim(),
      is_correct: isCorrect,
      submitted_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('Failed to record submission in database:', insertError);
    }

    if (isCorrect) {
      // Get current score
      const { data: currentScore } = await supabase
        .from('scores')
        .select('total_points, challenges_solved')
        .eq('user_id', user.sub)
        .single();

      const newPoints = (currentScore?.total_points || 0) + challenge.points;
      const newSolved = (currentScore?.challenges_solved || 0) + 1;

      // Update score
      const { error: scoreUpdateError } = await supabase
        .from('scores')
        .update({
          total_points: newPoints,
          challenges_solved: newSolved,
          last_submission_at: new Date().toISOString(),
        })
        .eq('user_id', user.sub);

      if (scoreUpdateError) {
        console.error('Score update error:', scoreUpdateError);
      }

      const nextStageMsg =
        challenge.stage_number < 8
          ? ` 🔓 Stage 0${challenge.stage_number + 1} has been unlocked!`
          : ' 🏆 All 8 stages pwned! Campaign completed!';

      return NextResponse.json({
        correct: true,
        message: `🎯 Correct Flag! You earned +${challenge.points} XP!${nextStageMsg}`,
        points: challenge.points,
      });
    }

    return NextResponse.json({
      correct: false,
      message: '❌ Incorrect flag. Verify your analysis and try again.',
      points: 0,
    });
  } catch (error) {
    console.error('Submission processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process submission' },
      { status: 500 }
    );
  }
}
