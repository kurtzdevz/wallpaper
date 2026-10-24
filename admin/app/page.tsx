'use client';
import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabase';

interface Stats {
  total: number; published: number; drafts: number; downloads: number; categories: number;
  top: { id: string; title: string; download_count: number }[];
  recent: { id: string; title: string; status: string }[];
}

export default function Dashboard() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const total = await supabase.from('wallpapers').select('*', { count: 'exact', head: true });
      const pub = await supabase.from('wallpapers').select('*', { count: 'exact', head: true }).eq('status', 'published');
      const draft = await supabase.from('wallpapers').select('*', { count: 'exact', head: true }).eq('status', 'draft');
      const cats = await supabase.from('categories').select('*', { count: 'exact', head: true });
      const dls = await supabase.from('wallpapers').select('download_count');
      const downloads = (dls.data ?? []).reduce((a, w: any) => a + (w.download_count ?? 0), 0);
      const top = await supabase.from('wallpapers').select('id,title,download_count').order('download_count', { ascending: false }).limit(5);
      const recent = await supabase.from('wallpapers').select('id,title,status').order('created_at', { ascending: false }).limit(8);
      setS({
        total: total.count ?? 0, published: pub.count ?? 0, drafts: draft.count ?? 0,
        categories: cats.count ?? 0, downloads,
        top: (top.data as any) ?? [], recent: (recent.data as any) ?? [],
      });
    })();
  }, []);

  return (
    <Shell active="dash">
      {!s ? <div className="muted">Carregando…</div> : (
        <>
          <div className="tiles">
            <div className="tile"><div className="k">Total</div><div className="v">{s.total}</div></div>
            <div className="tile"><div className="k">Publicados</div><div className="v accent">{s.published}</div></div>
            <div className="tile"><div className="k">Rascunhos</div><div className="v">{s.drafts}</div></div>
            <div className="tile"><div className="k">Downloads</div><div className="v">{s.downloads.toLocaleString('pt-BR')}</div></div>
          </div>
          <div className="grid2">
            <div className="panel">
              <h3>Mais baixados</h3>
              {s.top.length === 0 ? <div className="muted">Sem dados ainda.</div> :
                s.top.map((w) => (
                  <div className="listrow" key={w.id}><span>{w.title}</span><b className="tnum">{w.download_count.toLocaleString('pt-BR')}</b></div>
                ))}
            </div>
            <div className="panel">
              <h3>Uploads recentes</h3>
              {s.recent.length === 0 ? <div className="muted">Nenhum ainda. Vá em Adicionar.</div> :
                s.recent.map((w) => (
                  <div className="listrow" key={w.id}>
                    <span>{w.title}</span>
                    <span className={`chip ${w.status === 'published' ? 'pub' : 'draft'}`}>{w.status === 'published' ? 'Publicado' : 'Rascunho'}</span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
