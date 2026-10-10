import { createHmac } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (process.env.NODE_ENV !== 'development' || !local) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (request.headers.get('origin') !== url.origin) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) return NextResponse.json({ error: 'Configure JWT_SECRET in .env.local and restart.' }, { status: 503 });
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: 'local-stage5-reviewer', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  const response = NextResponse.json({ redirect: '/dashboard/challenges/5' });
  response.cookies.set('auth_token', `${header}.${payload}.${signature}`, {
    httpOnly: true, sameSite: 'strict', path: '/', maxAge: 3600,
  });
  return response;
}
