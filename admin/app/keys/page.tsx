'use client';
import { useEffect, useState, useCallback } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabase';

const AL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function block(n: number) {
  const a = new Uint8Array(n); crypto.getRandomValues(a);
  return Array.from(a, (b) => AL[b % AL.length]).join('');
}
function newKey() { return `MW-${block(4)}-${block(4)}-${block(4)}`; }

interface Key {
  id: string; key: string; label: string | null; status: string;
  max_activations: number; activation_count: number;
}

export default function KeysPage() {
  const [rows, setRows] = useState<Key[]>([]);
  const [qty, setQty] = useState(5);
  const [max, setMax] = useState(1);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('license_keys')
      .select('id,key,label,status,max_activations,activation_count')
      .order('created_at', { ascending: false }).limit(500);
    setRows((data as any) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function generate() {
    setBusy(true);
    try {
      const batch = Array.from({ length: Math.min(Math.max(qty, 1), 100) }, () => ({
        key: newKey(), label: label.trim() || null, max_activations: Math.max(max, 1),
      }));
      await supabase.from('license_keys').insert(batch);
      setLabel(''); load();
    } finally { setBusy(false); }
  }
  async function revoke(id: string) {
    await supabase.from('license_keys').update({ status: 'revoked' }).eq('id', id); load();
  }
  async function del(id: string) {
    if (!confirm('Excluir chave?')) return;
    await supabase.from('license_keys').delete().eq('id', id); load();
  }

  return (
    <Shell active="keys">
      <div className="rowflex" style={{ marginBottom: 16 }}>
        <div><label style={{ marginTop: 0 }}>Quantidade</label><input type="number" min={1} max={100} value={qty} onChange={(e) => setQty(+e.target.value)} style={{ width: 90 }} /></div>
        <div><label style={{ marginTop: 0 }}>Ativações por chave</label><input type="number" min={1} value={max} onChange={(e) => setMax(+e.target.value)} style={{ width: 130 }} /></div>
        <div style={{ flex: 1, minWidth: 160 }}><label style={{ marginTop: 0 }}>Rótulo (opcional)</label><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: lote outubro" /></div>
        <button className="btn" disabled={busy} onClick={generate}>{busy ? 'Gerando…' : 'Gerar chaves'}</button>
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Chave</th><th>Rótulo</th><th>Ativações</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {rows.map((k) => (
              <tr key={k.id}>
                <td><b className="mono">{k.key}</b></td>
                <td className="muted">{k.label ?? '—'}</td>
                <td className="tnum">{k.activation_count}/{k.max_activations}</td>
                <td><span className={`chip ${k.status === 'active' ? 'pub' : 'draft'}`}>{k.status === 'active' ? 'Ativa' : 'Revogada'}</span></td>
                <td><div className="rowact">
                  {k.status === 'active' && <button className="iconbtn" onClick={() => revoke(k.id)}>Revogar</button>}
                  <button className="iconbtn" onClick={() => del(k.id)}>Excluir</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
