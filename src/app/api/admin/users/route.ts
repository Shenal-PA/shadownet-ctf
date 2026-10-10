import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

// GET: Fetch all registered operatives with scores & solves
export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser || !authUser.is_admin) {
      return NextResponse.json(
        { error: 'Admin clearance required. Access denied.' },
        { status: 403 }
      );
    }

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, email, team_name, is_admin, created_at')
      .order('created_at', { ascending: false });

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    const { data: scores } = await supabase
      .from('scores')
      .select('user_id, total_points, challenges_solved, last_submission_at');

    const scoreMap = new Map<string, { total_points: number; challenges_solved: number; last_submission_at: string | null }>();
    (scores || []).forEach((s) => {
      scoreMap.set(s.user_id, {
        total_points: s.total_points || 0,
        challenges_solved: s.challenges_solved || 0,
        last_submission_at: s.last_submission_at || null,
      });
    });

    const enrichedUsers = (users || []).map((u) => {
      const userScore = scoreMap.get(u.id) || { total_points: 0, challenges_solved: 0, last_submission_at: null };
      return {
        ...u,
        total_points: userScore.total_points,
        challenges_solved: userScore.challenges_solved,
        last_submission_at: userScore.last_submission_at,
      };
    });

    return NextResponse.json({ users: enrichedUsers });
  } catch (error) {
    console.error('Admin get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching operatives' },
      { status: 500 }
    );
  }
}

// PATCH: Toggle admin role, update profile details, or reset individual score
export async function PATCH(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser || !authUser.is_admin) {
      return NextResponse.json(
        { error: 'Admin clearance required. Access denied.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, is_admin, team_name, email, username, action } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Reset single user's score & solves
    if (action === 'reset_score') {
      await supabase
        .from('scores')
        .update({
          total_points: 0,
          challenges_solved: 0,
          last_submission_at: null,
        })
        .eq('user_id', id);

      await supabase
        .from('submissions')
        .delete()
        .eq('user_id', id);

      return NextResponse.json({
        message: 'Operative score and submission history have been reset to zero.',
      });
    }

    const updates: Record<string, any> = {};
    if (typeof is_admin === 'boolean') updates.is_admin = is_admin;
    if (typeof team_name === 'string') updates.team_name = team_name.trim();
    if (typeof email === 'string' && email.trim()) updates.email = email.trim();
    if (typeof username === 'string' && username.trim()) updates.username = username.trim();

    const { data: updated, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, username, email, team_name, is_admin, created_at');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Operative profile updated successfully',
      user: updated && updated.length > 0 ? updated[0] : { id, ...updates },
    });
  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating operative' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a player (normal user) from the system completely
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser || !authUser.is_admin) {
      return NextResponse.json(
        { error: 'Admin clearance required. Access denied.' },
        { status: 403 }
      );
    }

    // Accept ID from search params or JSON body
    let userId = request.nextUrl.searchParams.get('id');
    if (!userId) {
      try {
        const body = await request.json();
        userId = body.id;
      } catch {
        // no body
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Operative ID is required' }, { status: 400 });
    }

    // Safety checks: Cannot delete self
    if (userId === authUser.sub) {
      return NextResponse.json(
        { error: 'Command safety violation: You cannot delete your own administrative account.' },
        { status: 400 }
      );
    }

    // Check if target user is an administrator
    const { data: targetUser, error: findError } = await supabase
      .from('users')
      .select('id, username, is_admin')
      .eq('id', userId)
      .single();

    if (findError || !targetUser) {
      return NextResponse.json({ error: 'Operative not found' }, { status: 404 });
    }

    if (targetUser.is_admin) {
      return NextResponse.json(
        { error: 'Protected Account: Administrators cannot be deleted. Demote user to standard operative first.' },
        { status: 400 }
      );
    }

    // 1. Delete associated submissions
    await supabase.from('submissions').delete().eq('user_id', userId);

    // 2. Delete associated scores
    await supabase.from('scores').delete().eq('user_id', userId);

    // 3. Delete user record
    const { error: deleteError } = await supabase.from('users').delete().eq('id', userId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Operative "${targetUser.username}" and all related score/submission records have been purged.`,
      deleted_id: userId,
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error while removing operative' },
      { status: 500 }
    );
  }
}
