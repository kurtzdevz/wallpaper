-- Seed opcional: categorias iniciais. Rode depois das migrations.
insert into categories (name, slug, sort_order, icon) values
  ('Anime',        'anime',        10, 'sparkles'),
  ('Games',        'games',        20, 'gamepad'),
  ('Carros',       'carros',       30, 'car'),
  ('Natureza',     'natureza',     40, 'leaf'),
  ('Filmes e Séries','filmes-series',50,'film'),
  ('Minimalistas', 'minimalistas', 60, 'minus'),
  ('Abstratos',    'abstratos',    70, 'shapes'),
  ('4K',           '4k',           80, 'monitor'),
  ('Ultrawide',    'ultrawide',    90, 'monitor-dot')
on conflict (slug) do nothing;
