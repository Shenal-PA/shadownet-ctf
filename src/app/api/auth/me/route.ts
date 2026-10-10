import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, username, email, team_name, is_admin')
      .eq('id', authUser.sub)
      .single();

    const { data: score } = await supabase
      .from('scores')
      .select('total_points, challenges_solved')
      .eq('user_id', authUser.sub)
      .single();

    return NextResponse.json({
      user: {
        ...user,
        total_points: score?.total_points || 0,
        challenges_solved: score?.challenges_solved || 0,
      },
    });
  } catch (error) {
    console.error('Me route error:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
