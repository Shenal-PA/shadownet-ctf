import { NextRequest } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'shadownet_secret_key_super_secure_jwt_token_2026_ctf';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload {
  sub: string;
  username: string;
  is_admin?: boolean;
  team_name?: string;
  [key: string]: unknown;
}

export async function signJWT(payload: JWTPayload, expiresIn: string = '24h'): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function verifyAuth(request: NextRequest): Promise<JWTPayload | null> {
  // 1. Check Cookie
  const tokenCookie = request.cookies.get('auth_token')?.value;
  if (tokenCookie) {
    const payload = await verifyJWT(tokenCookie);
    if (payload) return payload;
  }

  // 2. Check Authorization Header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = await verifyJWT(token);
    if (payload) return payload;
  }

  return null;
}
