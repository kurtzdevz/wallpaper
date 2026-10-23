import type { Request, Response, NextFunction } from 'express';

// Rate limit simples em memória (janela deslizante por minuto, por IP).
// Em produção serverless, troque por um store compartilhado (Upstash/Supabase).
export function rateLimit(perMinute: number) {
  const hits = new Map<string, { count: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const rec = hits.get(key);
    if (!rec || now > rec.reset) {
      hits.set(key, { count: 1, reset: now + 60_000 });
      return next();
    }
    rec.count += 1;
    if (rec.count > perMinute) {
      res.setHeader('Retry-After', Math.ceil((rec.reset - now) / 1000));
      return res.status(429).json({ error: 'rate_limited', message: 'Muitas requisições.' });
    }
    next();
  };
}
