import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function downloadStarter() {
  try {
    // Fixed path only: never accept a user-supplied filename or serve this folder.
    const source = await readFile(join(process.cwd(), 'stages/stage5-scripting/stage5-starter.py'), 'utf8');
    return new Response(source, { headers: {
      'Content-Type': 'text/x-python; charset=utf-8',
      'Content-Disposition': 'attachment; filename="stage5-starter.py"',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch {
    return Response.json({ error: 'Starter download unavailable. Contact the organizer.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
