import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

type Environment = Record<string, string | undefined>;
type Session = { version: 1; user: string; expected: string; expires: number };
const A = BigInt(1103515245), C = BigInt(12345), M = BigInt(2147483648);
const AAD = Buffer.from('shadownet:stage5:v1');
const TTL = 15 * 60;

class RequestError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

async function body(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  const parts: Uint8Array[] = [];
  let length = 0;
  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 4096) { await reader.cancel(); throw new RequestError(413, 'Request too large.'); }
      parts.push(value);
    }
  }
  try {
    const parsed = JSON.parse(Buffer.concat(parts).toString('utf8') || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch { throw new RequestError(400, 'Send a JSON object.'); }
}

function checkRequest(request: Request) {
  if (request.method !== 'POST') throw new RequestError(405, 'Use POST.');
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new RequestError(403, 'Cross-origin request rejected.');
}

function authenticatedUser(request: Request, secret: string, now: number): string {
  const cookie = request.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith('auth_token='));
  const token = cookie?.slice('auth_token='.length);
  if (!token || token.length > 4096) throw new RequestError(401, 'Log in to start this challenge.');
  try {
    const pieces = token.split('.');
    if (pieces.length !== 3 || pieces.some(piece => !/^[A-Za-z0-9_-]+$/.test(piece))) throw new Error();
    const [header, payload, signature] = pieces;
    if (JSON.parse(Buffer.from(header, 'base64url').toString()).alg !== 'HS256') throw new Error();
    const expected = createHmac('sha256', secret).update(header + '.' + payload).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error();
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 200 ||
        typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) || claims.exp <= now ||
        (claims.nbf !== undefined && (typeof claims.nbf !== 'number' || claims.nbf > now))) throw new Error();
    return claims.sub;
  } catch { throw new RequestError(401, 'Your login has expired. Log in again.'); }
}

function seal(session: Session, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(AAD);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(session)), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(value => value.toString('base64url')).join('.');
}

function open(token: unknown, key: Buffer, now: number): Session {
  if (typeof token !== 'string' || token.length > 2048) throw new RequestError(400, 'Invalid challenge session.');
  try {
    const pieces = token.split('.');
    if (pieces.length !== 3 || pieces.some(p => !/^[A-Za-z0-9_-]+$/.test(p))) throw new Error();
    const [iv, tag, ciphertext] = pieces.map(p => Buffer.from(p, 'base64url'));
    if (iv.length !== 12 || tag.length !== 16) throw new Error();
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(AAD); decipher.setAuthTag(tag);
    const session = JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString());
    if (session.version !== 1 || typeof session.user !== 'string' || !session.user ||
        !/^\d{8}$/.test(session.expected) || !Number.isInteger(session.expires)) throw new Error();
    if (session.expires <= now) throw new RequestError(410, 'Challenge expired. Start a new session.');
    return session;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError(400, 'Invalid challenge session. Start again.');
  }
}

export function createStage5Handlers(env: Environment, clock = () => Date.now()) {
  function config() {
    if (!env.JWT_SECRET || !env.STAGE5_SESSION_SECRET || env.STAGE5_SESSION_SECRET.length < 32 ||
        !env.STAGE5_FLAG || !/^SHADOWNET\{[a-z0-9_]+\}$/.test(env.STAGE5_FLAG)) {
      throw new RequestError(503, 'Stage 5 is not configured. Contact the organizer.');
    }
    return { jwt: env.JWT_SECRET, key: createHash('sha256').update(env.STAGE5_SESSION_SECRET).digest(), flag: env.STAGE5_FLAG };
  }
  async function respond(operation: () => Promise<Response>) {
    try { return await operation(); }
    catch (error) {
      if (error instanceof RequestError) return json({ error: error.message }, error.status);
      return json({ error: 'Challenge request failed. Try again.' }, 500);
    }
  }
  return {
    start: (request: Request) => respond(async () => {
      checkRequest(request);
      const settings = config();
      const now = Math.floor(clock() / 1000);
      const user = authenticatedUser(request, settings.jwt, now);
      await body(request);
      // Preserve timestamp seeding and the report's exact LCG arithmetic.
      let state = BigInt(clock()) % M;
      const tokens: string[] = [];
      for (let i = 0; i < 15; i++) {
        state = (A * state + C) % M;
        tokens.push((state % BigInt(100000000)).toString().padStart(8, '0'));
      }
      state = (A * state + C) % M;
      const expected = (state % BigInt(100000000)).toString().padStart(8, '0');
      const session = seal({ version: 1, user, expected, expires: now + TTL }, settings.key);
      return json({ session, tokens, expiresAt: new Date((now + TTL) * 1000).toISOString() });
    }),
    predict: (request: Request) => respond(async () => {
      checkRequest(request);
      const settings = config();
      const input = await body(request);
      if (typeof input.prediction !== 'string' || !/^\d{8}$/.test(input.prediction)) {
        throw new RequestError(400, 'Prediction must be an eight-digit string, including leading zeroes.');
      }
      const session = open(input.session, settings.key, Math.floor(clock() / 1000));
      if (input.prediction !== session.expected) return json({ error: 'Incorrect prediction. Review your script and try again.' }, 422);
      // A copied session is a temporary bearer credential; never log its value.
      return json({ message: 'Prediction accepted. Submit this flag to the main dashboard.', flag: settings.flag });
    }),
  };
}

export const handleStage5Start = (request: Request) => createStage5Handlers(process.env).start(request);
export const handleStage5Predict = (request: Request) => createStage5Handlers(process.env).predict(request);
