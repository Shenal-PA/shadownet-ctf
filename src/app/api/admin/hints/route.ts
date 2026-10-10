import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import { STAGE_CONFIGS } from '@/lib/constants';

// POST: Add a new hint or import default hints for a challenge
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
    const { challenge_id, action, hint_text, point_penalty, hint_level } = body;

    if (!challenge_id) {
      return NextResponse.json(
        { error: 'Challenge ID is required.' },
        { status: 400 }
      );
    }

    const targetChallengeId = Number(challenge_id);
    if (isNaN(targetChallengeId)) {
      return NextResponse.json(
        { error: 'Valid Challenge ID integer is required.' },
        { status: 400 }
      );
    }

    // 1. Action: Import default hints from constants
    if (action === 'import_defaults') {
      let stageNumber = body.stage_number;
      if (!stageNumber) {
        const { data: ch } = await supabase
          .from('challenges')
          .select('stage_number')
          .eq('id', targetChallengeId)
          .single();
        stageNumber = ch?.stage_number;
      }

      const defaultHints = STAGE_CONFIGS[Number(stageNumber)]?.hints;
      if (!defaultHints || defaultHints.length === 0) {
        return NextResponse.json(
          { error: `No default hints configured in constants for stage ${stageNumber || 'unknown'}.` },
          { status: 400 }
        );
      }

      const recordsToInsert = defaultHints.map((dh) => ({
        challenge_id: targetChallengeId,
        hint_level: dh.hint_level,
        hint_text: dh.hint_text,
        point_penalty: typeof dh.point_penalty === 'number' ? dh.point_penalty : 40,
      }));

      const { data: inserted, error: insertError } = await supabase
        .from('hints')
        .insert(recordsToInsert)
        .select();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({
        message: `Successfully imported ${recordsToInsert.length} tactical hints for challenge #${targetChallengeId}.`,
        hints: inserted,
      });
    }

    // 2. Standard single hint creation
    if (!hint_text || !hint_text.trim()) {
      return NextResponse.json(
        { error: 'Hint text description is required.' },
        { status: 400 }
      );
    }

    // Determine hint level if not provided
    let level = Number(hint_level);
    if (!level || isNaN(level) || level <= 0) {
      const { data: existingHints } = await supabase
        .from('hints')
        .select('hint_level')
        .eq('challenge_id', targetChallengeId)
        .order('hint_level', { ascending: false })
        .limit(1);

      level = existingHints && existingHints.length > 0 ? (existingHints[0].hint_level + 1) : 1;
    }

    const penalty = point_penalty !== undefined && point_penalty !== null && !isNaN(Number(point_penalty))
      ? Math.max(0, Number(point_penalty))
      : 40;

    const newHintRecord = {
      challenge_id: targetChallengeId,
      hint_level: level,
      hint_text: hint_text.trim(),
      point_penalty: penalty,
    };

    const { data: created, error: createError } = await supabase
      .from('hints')
      .insert(newHintRecord)
      .select();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Tactical Hint #${level} added successfully (XP Cost: ${penalty}).`,
      hint: created && created.length > 0 ? created[0] : newHintRecord,
    });
  } catch (error) {
    console.error('Admin add hint error:', error);
    return NextResponse.json(
      { error: 'Internal server error while adding hint' },
      { status: 500 }
    );
  }
}

// PATCH: Update an existing hint
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
    const { id, hint_text, point_penalty, hint_level } = body;

    if (!id) {
      return NextResponse.json({ error: 'Hint ID is required.' }, { status: 400 });
    }

    const hintId = Number(id);
    if (isNaN(hintId)) {
      return NextResponse.json({ error: 'Valid Hint ID integer is required.' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (typeof hint_text === 'string' && hint_text.trim()) {
      updates.hint_text = hint_text.trim();
    }
    if (point_penalty !== undefined && point_penalty !== null && !isNaN(Number(point_penalty))) {
      updates.point_penalty = Math.max(0, Number(point_penalty));
    }
    if (hint_level !== undefined && hint_level !== null && !isNaN(Number(hint_level))) {
      updates.hint_level = Number(hint_level);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update provided.' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('hints')
      .update(updates)
      .eq('id', hintId)
      .select();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Tactical Hint #${hintId} updated successfully.`,
      hint: updated && updated.length > 0 ? updated[0] : { id: hintId, ...updates },
    });
  } catch (error) {
    console.error('Admin update hint error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating hint' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a hint
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser || !authUser.is_admin) {
      return NextResponse.json(
        { error: 'Admin clearance required. Access denied.' },
        { status: 403 }
      );
    }

    let hintIdStr = request.nextUrl.searchParams.get('id');
    if (!hintIdStr) {
      try {
        const body = await request.json();
        hintIdStr = body.id;
      } catch {
        // no body
      }
    }

    if (!hintIdStr) {
      return NextResponse.json({ error: 'Hint ID is required.' }, { status: 400 });
    }

    const hintId = Number(hintIdStr);
    if (isNaN(hintId)) {
      return NextResponse.json({ error: 'Valid Hint ID integer is required.' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('hints')
      .delete()
      .eq('id', hintId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Tactical Hint #${hintId} successfully deleted.`,
      deleted_id: hintId,
    });
  } catch (error) {
    console.error('Admin delete hint error:', error);
    return NextResponse.json(
      { error: 'Internal server error while deleting hint' },
      { status: 500 }
    );
  }
}
