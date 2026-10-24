'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/Shell';
import { supabase, BUCKET } from '@/lib/supabase';

function slugify(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

// lê dimensões de imagem (best-effort) no navegador
function imageDims(file: File): Promise<{ w: number; h: number } | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => res(null);
    img.src = URL.createObjectURL(file);
  });
}

export default function AddPage() {
  const router = useRouter();
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState<'video' | 'image'>('video');
  const [tags, setTags] = useState('');
  const [desc, setDesc] = useState('');
  const [featured, setFeatured] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('categories').select('id,name').order('sort_order').then(({ data }) => {
      setCats((data as any) ?? []);
      if (data && data.length) setCategoryId((data as any)[0].id);
    });
  }, []);

  async function save(status: 'draft' | 'published') {
    setMsg(null);
    if (!title.trim()) { setMsg('Dê um nome ao wallpaper.'); return; }
    if (!file) { setMsg('Escolha o arquivo.'); return; }
    setBusy(true);
    try {
      const ext = (file.name.split('.').pop() || (type === 'video' ? 'mp4' : 'jpg')).toLowerCase();
      const path = `${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (up.error) throw up.error;

      let w: number | null = null, h: number | null = null;
      if (type === 'image') { const d = await imageDims(file); if (d) { w = d.w; h = d.h; } }

      const ins = await supabase.from('wallpapers').insert({
        title: title.trim(), description: desc.trim() || null, category_id: categoryId || null,
        type, status, featured, file_path: path,
        thumbnail_path: type === 'image' ? path : null,
        resolution_width: w, resolution_height: h, file_size: file.size,
      }).select('id').single();
      if (ins.error) throw ins.error;
      const wpId = ins.data.id;

      // tags
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      for (const raw of tagList) {
        const slug = slugify(raw);
        if (!slug) continue;
        const tag = await supabase.from('tags').upsert({ name: raw, slug }, { onConflict: 'slug' }).select('id').single();
        if (tag.data) await supabase.from('wallpaper_tags').upsert({ wallpaper_id: wpId, tag_id: tag.data.id });
      }

      router.push('/wallpapers');
    } catch (e: any) {
      setMsg('Erro ao salvar: ' + (e.message ?? e));
    } finally { setBusy(false); }
  }

  return (
    <Shell active="add">
      <div className="formgrid">
        <div className="full">
          <div className="drop" onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer' }}>
            {file ? <b>{file.name}</b> : <>⬆️ Clique para escolher o arquivo (mp4, webm, jpg, png, webp)</>}
          </div>
          <input ref={fileRef} type="file" accept="video/mp4,video/webm,image/*" style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null; setFile(f);
              if (f) setType(f.type.startsWith('video') ? 'video' : 'image');
            }} />
        </div>
        <div><label>Nome</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Cidade Neon 4K" /></div>
        <div><label>Categoria</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div><label>Tipo</label>
          <div className="seg">
            <button className={type === 'video' ? 'on' : ''} onClick={() => setType('video')} type="button">Vídeo</button>
            <button className={type === 'image' ? 'on' : ''} onClick={() => setType('image')} type="button">Imagem</button>
          </div>
        </div>
        <div><label>Tags (vírgula)</label><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="anime, neon" /></div>
        <div className="full"><label>Descrição</label><textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        <div className="full">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 0' }}>
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} style={{ width: 'auto' }} />
            Destaque na página inicial
          </label>
        </div>
      </div>
      {msg && <div className="err">{msg}</div>}
      <div className="actions">
        <button className="btn" disabled={busy} onClick={() => save('published')}>{busy ? 'Enviando…' : 'Publicar'}</button>
        <button className="btn ghost" disabled={busy} onClick={() => save('draft')}>Salvar rascunho</button>
      </div>
    </Shell>
  );
}
