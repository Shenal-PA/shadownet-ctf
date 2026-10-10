import crypto from 'crypto';

export function hashFlag(flag: string): string {
  return crypto.createHash('sha256').update(flag.trim()).digest('hex');
}
