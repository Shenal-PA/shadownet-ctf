import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPERBASE_URL ||
  'https://bsvvvibseqlapprvhuwz.supabase.co';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const challengeId = parseInt(id, 10);

    if (challengeId !== 2) {
      return NextResponse.json({ error: 'No downloadable asset for this challenge' }, { status: 404 });
    }

    // fetch from storage server-side so db url stays hidden
    const storageUrl = `${supabaseUrl}/storage/v1/object/public/challenges/stage2-covert-transmissions.zip`;
    const upstream = await fetch(storageUrl);

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="stage2-covert-transmissions.zip"',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Download proxy error:', error);
    return NextResponse.json({ error: 'Failed to download challenge file' }, { status: 500 });
  }
}

