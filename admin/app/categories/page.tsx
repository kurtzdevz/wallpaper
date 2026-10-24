'use client';
import { useEffect, useState, useCallback } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabase';

function slugify(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

export default function CategoriesPage() {
  const [rows, setRows] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [name, setName] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('categories').select('id,name,slug').order('sort_order');
    setRows((data as any) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    const n = name.trim(); if (!n) return;
    await supabase.from('categories').insert({ name: n, slug: slugify(n) });
    setName(''); load();
  }
  async function del(id: string) {
    if (!confirm('Excluir categoria?')) return;
    await supabase.from('categories').delete().eq('id', id);
    load();
  }

  return (
    <Shell active="cats">
      <div className="rowflex" style={{ maxWidth: 460, marginBottom: 16 }}>
        <input placeholder="Nova categoria" value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn" onClick={add}>Adicionar</button>
      </div>
      <div className="tablewrap" style={{ maxWidth: 520 }}>
        <table>
          <thead><tr><th>Categoria</th><th>Slug</th><th>Ações</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}><td><b>{c.name}</b></td><td className="muted">{c.slug}</td>
                <td><button className="iconbtn" onClick={() => del(c.id)}>Excluir</button></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
