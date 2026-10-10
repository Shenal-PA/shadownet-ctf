import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser || !authUser.is_admin) {
      return NextResponse.json(
        { error: 'Admin clearance required. Access denied.' },
        { status: 403 }
      );
    }

    const { action } = await request.json();

    if (action === 'reset_scores') {
      // Reset all scores in the scores table to 0
      const { error: scoresError } = await supabase
        .from('scores')
        .update({
          total_points: 0,
          challenges_solved: 0,
          last_submission_at: null,
        })
        .neq('total_points', -999999); // matches all rows

      if (scoresError) {
        return NextResponse.json({ error: scoresError.message }, { status: 500 });
      }

      // Also remove submissions
      const { error: subError } = await supabase
        .from('submissions')
        .delete()
        .neq('id', -999999); // deletes all rows

      if (subError) {
        return NextResponse.json({ error: subError.message }, { status: 500 });
      }

      return NextResponse.json({
        message: 'All scores and submissions have been reset successfully.',
      });
    }

    return NextResponse.json({ error: 'Invalid action provided' }, { status: 400 });
  } catch (error) {
    console.error('Admin reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error while executing reset' },
      { status: 500 }
    );
  }
}
