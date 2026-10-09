import { createHmac, timingSafeEqual } from 'node:crypto';

type Environment = Record<string, string | undefined>;
type Action = 'status' | 'start' | 'reset' | 'stop';
const states = ['unassigned', 'starting', 'ready', 'stopping', 'stopped', 'expired', 'error'];
class LabError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
async function readJson(stream: ReadableStream<Uint8Array> | null, limit: number) {
  const reader = stream?.getReader(); const parts: Uint8Array[] = []; let length = 0;
  if (reader) while (true) {
    const { value, done } = await reader.read(); if (done) break;
    length += value.length;
    if (length > limit) { await reader.cancel(); throw new LabError(413, 'Request too large.'); }
    parts.push(value);
  }
  try {
    const value = JSON.parse(Buffer.concat(parts).toString('utf8') || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error();
    return value;
  } catch { throw new LabError(400, 'Send a JSON object.'); }
}
function user(request: Request, key: string, now: number) {
  const token = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith('auth_token='))?.slice(11);
  try {
    if (!token || token.length > 4096) throw Error();
    const pieces = token.split('.');
    if (pieces.length !== 3 || pieces.some(v => !/^[A-Za-z0-9_-]+$/.test(v))) throw Error();
    const [header, payload, signature] = pieces;
    if (JSON.parse(Buffer.from(header, 'base64url').toString()).alg !== 'HS256') throw Error();
    const actual = Buffer.from(signature, 'base64url');
    const expected = createHmac('sha256', key).update(header + '.' + payload).digest();
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw Error();
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 200 ||
        typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) || claims.exp <= now ||
        (claims.nbf !== undefined && (typeof claims.nbf !== 'number' || !Number.isFinite(claims.nbf) || claims.nbf > now))) throw Error();
    return claims.sub as string;
  } catch { throw new LabError(401, 'Log in to access your lab.'); }
}
function trustedUrl(value: string | undefined) {
  if (!value) throw new LabError(503, 'The lab is not available yet. Please contact the organizer.');
  let url: URL;
  try { url = new URL(value); } catch { throw new LabError(503, 'The lab is not available yet.'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) || url.username || url.password || url.search || url.hash) {
    throw new LabError(503, 'The lab is not available yet.');
  }
  return url;
}

export function createStage7Handler(env: Environment, transport: typeof fetch = fetch, clock = () => Date.now()) {
  return async (request: Request) => {
    try {
      if (request.method !== 'POST') throw new LabError(405, 'Use POST.');
      const origin = request.headers.get('origin');
      if (origin && origin !== new URL(request.url).origin) throw new LabError(403, 'Cross-origin request rejected.');
      if (!env.JWT_SECRET) throw new LabError(503, 'The lab is not available yet.');
      const player = user(request, env.JWT_SECRET, Math.floor(clock() / 1000));
      const input = await readJson(request.body, 4096);
      if (!['status', 'start', 'reset', 'stop'].includes(input.action)) throw new LabError(400, 'Invalid lab action.');
      const action = input.action as Action;
      const operation = request.headers.get('Idempotency-Key');
      if (action !== 'status' && (!operation || !/^[A-Za-z0-9_-]{16,128}$/.test(operation))) {
        throw new LabError(400, 'Missing valid operation key.');
      }
      const gateway = trustedUrl(env.STAGE7_GATEWAY_URL);
      const terminalOrigin = trustedUrl(env.STAGE7_TERMINAL_ORIGIN);
      if (terminalOrigin.pathname !== '/' || terminalOrigin.origin === new URL(request.url).origin ||
          !env.STAGE7_GATEWAY_KEY || env.STAGE7_GATEWAY_KEY.length < 32) {
        throw new LabError(503, 'The lab is not available yet.');
      }
      async function call(path: string, value: object, idempotency?: string | null) {
        let response: Response;
        try {
          response = await transport(gateway.toString().replace(/\/$/, '') + path, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.STAGE7_GATEWAY_KEY,
              ...(idempotency ? { 'Idempotency-Key': idempotency } : {}) },
            body: JSON.stringify(value), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
          });
        } catch { throw new LabError(503, 'Your lab is temporarily unavailable. Try again later.'); }
        if (!response.ok) {
          const messages: Record<number, string> = {
            403: 'Complete the required previous stage to access this lab.',
            409: 'Your lab is still changing state. Please wait.',
            429: 'Too many lab requests. Please wait before retrying.',
            503: 'Your lab is temporarily unavailable. Try again later.',
          };
          throw new LabError(messages[response.status] ? response.status : 502,
            messages[response.status] || 'The lab connection failed. Please contact the organizer.');
        }
        try { return await readJson(response.body, 16384); }
        catch { throw new LabError(502, 'The lab returned an invalid response.'); }
      }
      // Never rely on the visible locked card: the gateway must verify Stage 6 completion.
      const access = await call('/v1/stage7/access', { userId: player });
      if (access.allowed !== true) throw new LabError(403, 'Complete the required previous stage to access this lab.');
      const data = await call('/v1/stage7/lab', { userId: player, action }, action === 'status' ? null : operation);
      if (!states.includes(data.state) || (data.id !== null && (typeof data.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(data.id))) ||
          (data.expiresAt !== null && (typeof data.expiresAt !== 'string' || !Number.isFinite(Date.parse(data.expiresAt))))) {
        throw new LabError(502, 'The lab returned an invalid response.');
      }
      let terminalUrl: string | null = null;
      if (data.state === 'ready') {
        if (!data.id || !data.expiresAt || Date.parse(data.expiresAt) <= clock() || typeof data.terminalUrl !== 'string' || data.terminalUrl.length > 4096) {
          throw new LabError(502, 'The lab returned an invalid connection.');
        }
        let url: URL;
        try { url = new URL(data.terminalUrl); } catch { throw new LabError(502, 'The lab returned an invalid connection.'); }
        if (url.origin !== terminalOrigin.origin || url.username || url.password || url.hash) throw new LabError(502, 'The lab returned an invalid connection.');
        terminalUrl = url.toString();
      }
      // Do not forward VM credentials, flags or arbitrary gateway fields.
      return json({ id: data.id, state: data.state, expiresAt: data.expiresAt, terminalUrl });
    } catch (error) {
      return error instanceof LabError ? json({ error: error.message }, error.status) : json({ error: 'Lab request failed. Try again.' }, 500);
    }
  };
}
export const handleStage7Lab = (request: Request) => createStage7Handler(process.env)(request);
