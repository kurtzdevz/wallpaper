import crypto from 'node:crypto';
import { query, withTransaction } from '../db.ts';

export interface LicenseKey {
  id: string;
  key: string;
  label: string | null;
  status: 'active' | 'revoked';
  maxActivations: number;
  activationCount: number;
  expiresAt: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

// Gera uma chave no formato MW-XXXX-XXXX-XXXX (sem caracteres ambíguos).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomBlock(n: number): string {
  const bytes = crypto.randomBytes(n);
  let s = '';
  for (let i = 0; i < n; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}
function newKey(): string {
  return `MW-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}`;
}

function map(r: Record<string, unknown>): LicenseKey {
  return {
    id: r.id as string,
    key: r.key as string,
    label: (r.label as string) ?? null,
    status: r.status as 'active' | 'revoked',
    maxActivations: Number(r.max_activations),
    activationCount: Number(r.activation_count),
    expiresAt: r.expires_at ? new Date(r.expires_at as string).toISOString() : null,
    createdAt: new Date(r.created_at as string).toISOString(),
    lastUsedAt: r.last_used_at ? new Date(r.last_used_at as string).toISOString() : null,
  };
}

// Gera N chaves de uma vez (lote). Retorna as criadas.
export async function generateKeys(
  databaseUrl: string,
  count: number,
  opts: { label?: string; maxActivations?: number; expiresAt?: string | null } = {},
): Promise<LicenseKey[]> {
  const n = Math.min(Math.max(count, 1), 500);
  const created: LicenseKey[] = [];
  await withTransaction(databaseUrl, async (c) => {
    for (let i = 0; i < n; i++) {
      // tenta algumas vezes em caso de colisão (raríssimo)
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const res = await c.query(
            `insert into license_keys (key, label, max_activations, expires_at)
             values ($1,$2,$3,$4) returning *`,
            [newKey(), opts.label ?? null, opts.maxActivations ?? 1, opts.expiresAt ?? null],
          );
          created.push(map(res.rows[0]));
          break;
        } catch (e) {
          if (attempt === 4) throw e; // desiste após 5 colisões
        }
      }
    }
  });
  return created;
}

export async function listKeys(databaseUrl: string): Promise<LicenseKey[]> {
  const res = await query(databaseUrl, `select * from license_keys order by created_at desc limit 500`);
  return res.rows.map(map);
}

export async function revokeKey(databaseUrl: string, id: string): Promise<boolean> {
  const res = await query(databaseUrl, `update license_keys set status='revoked' where id=$1`, [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function deleteKey(databaseUrl: string, id: string): Promise<boolean> {
  const res = await query(databaseUrl, `delete from license_keys where id=$1`, [id]);
  return (res.rowCount ?? 0) > 0;
}

export type ActivateResult =
  | { ok: true; alreadyActivated: boolean; expiresAt: string | null }
  | { ok: false; reason: 'invalid' | 'revoked' | 'expired' | 'limit' };

// Ativa uma chave para um device. Idempotente para o mesmo device.
export async function activate(
  databaseUrl: string,
  key: string,
  deviceHash: string,
  deviceName?: string,
): Promise<ActivateResult> {
  return withTransaction(databaseUrl, async (c) => {
    const kRes = await c.query(`select * from license_keys where key=$1 for update`, [key.trim().toUpperCase()]);
    const row = kRes.rows[0];
    if (!row) return { ok: false, reason: 'invalid' } as ActivateResult;
    if (row.status === 'revoked') return { ok: false, reason: 'revoked' } as ActivateResult;
    if (row.expires_at && new Date(row.expires_at) < new Date())
      return { ok: false, reason: 'expired' } as ActivateResult;

    const expiresAt = row.expires_at ? new Date(row.expires_at).toISOString() : null;

    // device já ativado nesta chave? → ok (reativação)
    const existing = await c.query(
      `select 1 from key_activations where key_id=$1 and device_hash=$2`,
      [row.id, deviceHash],
    );
    if ((existing.rowCount ?? 0) > 0) {
      await c.query(`update license_keys set last_used_at=now() where id=$1`, [row.id]);
      return { ok: true, alreadyActivated: true, expiresAt } as ActivateResult;
    }

    // ainda há vaga de ativação?
    if (Number(row.activation_count) >= Number(row.max_activations))
      return { ok: false, reason: 'limit' } as ActivateResult;

    await c.query(
      `insert into key_activations (key_id, device_hash, device_name) values ($1,$2,$3)`,
      [row.id, deviceHash, deviceName ?? null],
    );
    return { ok: true, alreadyActivated: false, expiresAt } as ActivateResult;
  });
}
