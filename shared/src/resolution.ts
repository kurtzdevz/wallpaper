import type { ResolutionInfo } from './types.js';

// Classifica resolução em rótulos usados nos filtros (4K, Ultrawide, etc.)
export function classifyResolution(width: number, height: number): ResolutionInfo {
  const is4k = width >= 3840 || height >= 2160;
  const ratio = height > 0 ? width / height : 0;
  const isUltrawide = ratio >= 2.2; // 21:9 ≈ 2.33, 32:9 ≈ 3.55

  let label = `${width}x${height}`;
  if (is4k) label = '4K';
  else if (height >= 1440) label = '1440p';
  else if (height >= 1080) label = '1080p';

  return { width, height, label, is4k, isUltrawide };
}

// slug seguro a partir de um nome (categorias/tags)
export function slugify(input: string): string {
  return input
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // tira acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
