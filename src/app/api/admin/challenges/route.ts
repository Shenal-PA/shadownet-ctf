import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import { hashFlag } from '@/lib/crypto';
import { STAGE_CONFIGS } from '@/lib/constants';

// GET: Fetch all challenges with full administrative details
export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser || !authUser.is_admin) {
      return NextResponse.json(
        { error: 'Admin clearance required. Access denied.' },
        { status: 403 }
      );
    }

    const { data: challenges, error } = await supabase
      .from('challenges')
      .select('*')
      .order('stage_number', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also fetch hints for each challenge
    const { data: hints } = await supabase
      .from('hints')
      .select('*')
      .order('hint_level', { ascending: true });

    const challengesWithHints = (challenges || []).map((ch) => ({
      ...ch,
      hints: (hints || []).filter((h) => h.challenge_id === ch.id),
      default_hints: STAGE_CONFIGS[ch.stage_number]?.hints || [],
    }));

    return NextResponse.json({ challenges: challengesWithHints });
  } catch (error) {
    console.error('Admin get challenges error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching challenges' },
      { status: 500 }
    );
  }
}

// POST: Create a new challenge / stage
export async function POST(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser || !authUser.is_admin) {
      return NextResponse.json(
        { error: 'Admin clearance required. Access denied.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      domain,
      difficulty,
      description,
      points,
      delivery_method,
      stage_number,
      is_active,
      raw_flag,
    } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: 'Challenge name and description are required.' },
        { status: 400 }
      );
    }

    // Determine flag hash
    const flagString = raw_flag && raw_flag.trim() ? raw_flag.trim() : 'SN{stage_flag_default}';
    const flagHash = hashFlag(flagString);

    const newChallengeData = {
      name: name.trim(),
      domain: domain ? domain.trim() : 'Web Exploitation',
      difficulty: difficulty ? difficulty.trim().toLowerCase() : 'medium',
      description: description.trim(),
      points: points ? Number(points) : 100,
      delivery_method: delivery_method ? delivery_method.trim() : 'Docker',
      stage_number: stage_number ? Number(stage_number) : 9,
      is_active: typeof is_active === 'boolean' ? is_active : true,
      flag_hash: flagHash,
    };

    const { data: created, error } = await supabase
      .from('challenges')
      .insert(newChallengeData)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const createdChallenge = created && created.length > 0 ? created[0] : newChallengeData;

    // If initial hints were supplied, insert them
    if (createdChallenge.id && Array.isArray(body.hints) && body.hints.length > 0) {
      const hintRecords = body.hints
        .filter((h: any) => h.hint_text && h.hint_text.trim())
        .map((h: any, idx: number) => ({
          challenge_id: createdChallenge.id,
          hint_level: h.hint_level ? Number(h.hint_level) : idx + 1,
          hint_text: h.hint_text.trim(),
          point_penalty: typeof h.point_penalty === 'number' ? Math.max(0, h.point_penalty) : 40,
        }));

      if (hintRecords.length > 0) {
        await supabase.from('hints').insert(hintRecords);
      }
    }

    return NextResponse.json({
      message: 'Challenge created successfully',
      challenge: createdChallenge,
    });
  } catch (error) {
    console.error('Admin create challenge error:', error);
    return NextResponse.json(
      { error: 'Internal server error while creating challenge' },
      { status: 500 }
    );
  }
}

// PATCH: Update challenge configuration (status, points, flag, details)
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
    const {
      id,
      is_active,
      points,
      name,
      domain,
      description,
      difficulty,
      delivery_method,
      stage_number,
      new_raw_flag,
    } = body;

    if (id === undefined || id === null) {
      return NextResponse.json({ error: 'Challenge ID is required' }, { status: 400 });
    }

    const challengeId = parseInt(String(id), 10);
    if (isNaN(challengeId)) {
      return NextResponse.json({ error: 'Valid Challenge ID integer is required' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (typeof is_active === 'boolean') updates.is_active = is_active;
    if (typeof points === 'number') updates.points = points;
    if (typeof stage_number === 'number') updates.stage_number = stage_number;
    if (typeof name === 'string' && name.trim()) updates.name = name.trim();
    if (typeof domain === 'string' && domain.trim()) updates.domain = domain.trim();
    if (typeof description === 'string') updates.description = description;
    if (typeof difficulty === 'string') updates.difficulty = difficulty;
    if (typeof delivery_method === 'string') updates.delivery_method = delivery_method;
    if (new_raw_flag && typeof new_raw_flag === 'string' && new_raw_flag.trim()) {
      updates.flag_hash = hashFlag(new_raw_flag.trim());
    }

    const { data: updated, error } = await supabase
      .from('challenges')
      .update(updates)
      .eq('id', challengeId)
      .select();

    if (error) {
      console.error('Database update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Challenge updated successfully',
      challenge: updated && updated.length > 0 ? updated[0] : { id: challengeId, ...updates },
    });
  } catch (error) {
    console.error('Admin update challenge error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating challenge' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a challenge completely
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser || !authUser.is_admin) {
      return NextResponse.json(
        { error: 'Admin clearance required. Access denied.' },
        { status: 403 }
      );
    }

    let challengeId = request.nextUrl.searchParams.get('id');
    if (!challengeId) {
      try {
        const body = await request.json();
        challengeId = body.id;
      } catch {
        // no body
      }
    }

    if (!challengeId) {
      return NextResponse.json({ error: 'Challenge ID is required' }, { status: 400 });
    }

    const cId = parseInt(String(challengeId), 10);

    // 1. Delete associated hints
    await supabase.from('hints').delete().eq('challenge_id', cId);

    // 2. Delete associated submissions
    await supabase.from('submissions').delete().eq('challenge_id', cId);

    // 3. Delete challenge
    const { error: deleteError } = await supabase.from('challenges').delete().eq('id', cId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Challenge #${cId} and associated records successfully removed.`,
      deleted_id: cId,
    });
  } catch (error) {
    console.error('Admin delete challenge error:', error);
    return NextResponse.json(
      { error: 'Internal server error while deleting challenge' },
      { status: 500 }
    );
  }
}
