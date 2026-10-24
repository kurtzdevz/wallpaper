'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const NAV = [
  { k: 'dash', label: '▣  Dashboard', href: '/' },
  { k: 'add', label: '＋  Adicionar', href: '/add' },
  { k: 'list', label: '▤  Wallpapers', href: '/wallpapers' },
  { k: 'cats', label: '◧  Categorias', href: '/categories' },
  { k: 'keys', label: '🔑  Licenças', href: '/keys' },
];

export default function Shell({ active, children }: { active: string; children: React.ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }
      // confirma que é admin
      const { data: prof } = await supabase
        .from('admin_profiles').select('role').eq('id', session.user.id).maybeSingle();
      if (!prof || !['admin', 'owner'].includes(prof.role)) {
        await supabase.auth.signOut();
        router.replace('/login?e=forbidden');
        return;
      }
      if (mounted) { setEmail(session.user.email ?? ''); setReady(true); }
    })();
    return () => { mounted = false; };
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (!ready) {
    return <div style={{ padding: 40, color: 'var(--muted)' }}>Carregando…</div>;
  }

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">Meu<b>Wallpaper</b></div>
        <nav className="nav">
          {NAV.map((n) => (
            <a key={n.k} href={n.href} className={active === n.k ? 'active' : ''}>{n.label}</a>
          ))}
        </nav>
        <div className="foot">
          <button className="btn ghost sm" style={{ width: '100%' }} onClick={logout}>Sair</button>
        </div>
      </aside>
      <div className="main">
        <div className="top">
          <h1>{NAV.find((n) => n.k === active)?.label.replace(/^\S+\s+/, '') ?? 'Painel'}</h1>
          <div className="muted" style={{ fontSize: 13 }}>{email}</div>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
