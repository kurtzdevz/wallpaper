import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyResolution, slugify } from './resolution.ts';

test('classifica 4K', () => {
  const r = classifyResolution(3840, 2160);
  assert.equal(r.is4k, true);
  assert.equal(r.label, '4K');
});

test('classifica ultrawide', () => {
  const r = classifyResolution(3440, 1440);
  assert.equal(r.isUltrawide, true);
});

test('1080p comum não é 4k nem ultrawide', () => {
  const r = classifyResolution(1920, 1080);
  assert.equal(r.is4k, false);
  assert.equal(r.isUltrawide, false);
  assert.equal(r.label, '1080p');
});

test('slugify tira acentos e normaliza', () => {
  assert.equal(slugify('Filmes e Séries'), 'filmes-e-series');
  assert.equal(slugify('  4K  '), '4k');
});
