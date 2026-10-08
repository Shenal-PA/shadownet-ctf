import { createHmac, timingSafeEqual } from 'node:crypto';

type Environment = Record<string, string | undefined>;
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

export function createStage5Handlers(env: Environment, clock = () => Date.now(), transport: typeof fetch = fetch) {
  function config() {
    if (!env.JWT_SECRET || !env.STAGE5_SERVICE_URL || !env.STAGE5_SERVICE_KEY || env.STAGE5_SERVICE_KEY.length < 32) {
      throw new RequestError(503, 'Stage 5 is not configured. Contact the organizer.');
    }
    let url: URL;
    try { url = new URL(env.STAGE5_SERVICE_URL); }
    catch { throw new RequestError(503, 'Stage 5 service URL is invalid.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new RequestError(503, 'Stage 5 service URL is invalid.');
    }
    return { jwt: env.JWT_SECRET, base: url.toString().replace(/\/$/, ''), key: env.STAGE5_SERVICE_KEY };
  }
  async function forward(path: string, input: object) {
    const settings = config();
    let response: Response;
    try {
      response = await transport(settings.base + path, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + settings.key },
        body: JSON.stringify(input), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
      });
    } catch { throw new RequestError(503, 'Stage 5 lab is unavailable. Try again later.'); }
    let data;
    try { data = await response.json(); }
    catch { throw new RequestError(502, 'Stage 5 lab returned an invalid response.'); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new RequestError(502, 'Stage 5 lab returned an invalid response.');
    }
    if (!response.ok) {
      const errors: Record<number, string> = {
        400: 'Invalid challenge input.', 410: 'Challenge expired or restarted. Start a new session.',
        422: 'Incorrect prediction. Review your script and try again.',
        429: 'Attempt limit reached. Start a new session.', 503: 'Stage 5 lab is busy. Try again later.',
      };
      throw new RequestError(errors[response.status] ? response.status : 502,
        errors[response.status] || 'Stage 5 lab connection failed. Contact the organizer.');
    }
    // Only forward the documented player fields, never arbitrary service output.
    if (path === '/start') {
      if (typeof data.session !== 'string' || !data.session || data.session.length > 128 ||
          !Array.isArray(data.tokens) || data.tokens.length !== 15 ||
          !data.tokens.every((token: unknown) => typeof token === 'string' && /^\d{8}$/.test(token)) ||
          typeof data.expiresAt !== 'string' || !Number.isFinite(Date.parse(data.expiresAt))) {
        throw new RequestError(502, 'Stage 5 lab returned an invalid response.');
      }
      return json({ session: data.session, tokens: data.tokens, expiresAt: data.expiresAt });
    }
    if (typeof data.flag !== 'string' || !/^SHADOWNET\{[a-z0-9_]+\}$/.test(data.flag)) {
      throw new RequestError(502, 'Stage 5 lab returned an invalid response.');
    }
    return json({ message: 'Prediction accepted. Submit this flag to the main dashboard.', flag: data.flag });
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
      const user = authenticatedUser(request, settings.jwt, Math.floor(clock() / 1000));
      await body(request);
      return forward('/start', { user });
    }),
    predict: (request: Request) => respond(async () => {
      checkRequest(request);
      const input = await body(request);
      if (typeof input.prediction !== 'string' || !/^\d{8}$/.test(input.prediction) ||
          typeof input.session !== 'string' || !input.session || input.session.length > 128) {
        throw new RequestError(400, 'Send a challenge session and an eight-digit prediction.');
      }
      return forward('/predict', { session: input.session, prediction: input.prediction });
    }),
  };
}

export const handleStage5Start = (request: Request) => createStage5Handlers(process.env).start(request);
export const handleStage5Predict = (request: Request) => createStage5Handlers(process.env).predict(request);
