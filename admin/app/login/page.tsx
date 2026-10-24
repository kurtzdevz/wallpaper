'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setBusy(false);
    if (error) { setErr('E-mail ou senha incorretos.'); return; }
    // valida admin
    const { data: prof } = await supabase
      .from('admin_profiles').select('role').eq('id', data.user.id).maybeSingle();
    if (!prof || !['admin', 'owner'].includes(prof.role)) {
      await supabase.auth.signOut();
      setErr('Esta conta não tem permissão de administrador.');
      return;
    }
    router.replace('/');
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="brand">Wlp<b>Brasil</b></div>
        <p className="muted" style={{ margin: '6px 0 2px', fontSize: 13 }}>Painel administrativo</p>
        <label>E-mail</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        <label>Senha</label>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" required />
        {err && <div className="err">{err}</div>}
        <button className="btn block" style={{ marginTop: 22 }} disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
