import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { query } from './db.ts';

// Verifica um JWT HS256 (padrão do Supabase Auth) usando só node:crypto.
// Retorna o payload se válido; null caso contrário.
export interface JwtPayload {
  sub?: string;
  exp?: number;
  role?: string;
  email?: string;
  [k: string]: unknown;
}

function b64urlToBuf(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export function verifyJwtHS256(token: string, secret: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${h}.${p}`)
    .digest();
  const got = b64urlToBuf(sig);
  if (expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) return null;
  let payload: JwtPayload;
  try {
    payload = JSON.parse(b64urlToBuf(p).toString('utf8'));
  } catch {
    return null;
  }
  if (payload.exp && Date.now() / 1000 > payload.exp) return null;
  return payload;
}

export interface AdminAuthDeps {
  databaseUrl: string;
  jwtSecret: string;
}

// Middleware: exige Bearer token válido E que o usuário seja admin/owner no banco.
export function requireAdmin(deps: AdminAuthDeps) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'unauthorized', message: 'Token ausente' });

    const payload = verifyJwtHS256(token, deps.jwtSecret);
    if (!payload?.sub) return res.status(401).json({ error: 'unauthorized', message: 'Token inválido' });

    // confirma papel no banco (autorização real no servidor, não só no token)
    const r = await query<{ role: string }>(
      deps.databaseUrl,
      `select role from admin_profiles where id = $1`,
      [payload.sub],
    );
    const role = r.rows[0]?.role;
    if (role !== 'admin' && role !== 'owner') {
      return res.status(403).json({ error: 'forbidden', message: 'Sem permissão de administrador' });
    }
    (req as Request & { adminId?: string }).adminId = payload.sub;
    next();
  };
}
