'use client';
import { useEffect, useState, useCallback } from 'react';
import Shell from '@/components/Shell';
import { supabase, publicUrl } from '@/lib/supabase';

interface Row {
  id: string; title: string; type: string; status: string;
  resolution_width: number | null; resolution_height: number | null;
  download_count: number; thumbnail_path: string | null;
  categories: { name: string } | null;
}

export default function WallpapersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('wallpapers')
      .select('id,title,type,status,resolution_width,resolution_height,download_count,thumbnail_path,categories(name)')
      .order('created_at', { ascending: false });
    setRows((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle(r: Row) {
    const next = r.status === 'published' ? 'draft' : 'published';
    await supabase.from('wallpapers').update({ status: next }).eq('id', r.id);
    load();
  }
  async function remove(r: Row) {
    if (!confirm(`Excluir "${r.title}"?`)) return;
    await supabase.from('wallpapers').delete().eq('id', r.id);
    load();
  }

  function res(r: Row) {
    if (r.resolution_width && r.resolution_height) {
      return (r.resolution_width >= 3840 || r.resolution_height >= 2160) ? '4K' : `${r.resolution_width}x${r.resolution_height}`;
    }
    return '—';
  }

  return (
    <Shell active="list">
      {loading ? <div className="muted">Carregando…</div> :
        rows.length === 0 ? <div className="panel muted">Nenhum wallpaper ainda. Vá em <b>Adicionar</b>.</div> : (
          <div className="tablewrap">
            <table>
              <thead><tr><th>Prévia</th><th>Nome</th><th>Categoria</th><th>Tipo</th><th>Resolução</th><th className="tnum">Downloads</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const thumb = publicUrl(r.thumbnail_path);
                  return (
                    <tr key={r.id}>
                      <td>{thumb ? <img className="thumb" src={thumb} alt="" /> : <span className="thumb" />}</td>
                      <td><b>{r.title}</b></td>
                      <td>{r.categories?.name ?? '—'}</td>
                      <td><span className="chip type">{r.type === 'video' ? 'VÍDEO' : 'IMAGEM'}</span></td>
                      <td>{res(r)}</td>
                      <td className="tnum">{r.download_count.toLocaleString('pt-BR')}</td>
                      <td><span className={`chip ${r.status === 'published' ? 'pub' : 'draft'}`}>{r.status === 'published' ? 'Publicado' : 'Rascunho'}</span></td>
                      <td><div className="rowact">
                        <button className="iconbtn" onClick={() => toggle(r)}>{r.status === 'published' ? 'Despublicar' : 'Publicar'}</button>
                        <button className="iconbtn" onClick={() => remove(r)}>Excluir</button>
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </Shell>
  );
}
