import crypto from 'node:crypto';

const b64url = (buf: Buffer | string): string =>
  Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

// Gera um JWT HS256 válido (como o Supabase emitiria) para testes.
export function makeJwt(sub: string, secret: string, extra: Record<string, unknown> = {}): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    sub,
    role: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...extra,
  }));
  const sig = b64url(crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${sig}`;
}
