import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.PORT = '0';
const { server } = await import('../server.mjs');
if (!server.listening) await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
const root = fileURLToPath(new URL('../', import.meta.url));
after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));

test('home and game deep links serve the local adapter', async () => {
  for (const route of ['/', '/intro', '/customize']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes('/local-runtime.js'));
    assert.ok(html.includes('main.35e6243a65453426.js'));
  }
});

test('JS, Draco WASM, and scenes have usable content types', async () => {
  for (const [asset, type] of [
    ['/assets/vendor.75f6e6ae65453426.js', 'text/javascript'],
    ['/vendors/draco/draco_decoder.wasm', 'application/wasm'],
    ['/assets/Scene_IslandWest.68c3fec765453426.glb', 'model/gltf-binary']
  ]) {
    const response = await fetch(base + asset, { method: 'HEAD' });
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-type').startsWith(type));
    assert.ok(Number(response.headers.get('content-length')) > 0);
    assert.equal((await response.arrayBuffer()).byteLength, 0);
  }
});

test('audio supports partial range requests', async () => {
  const response = await fetch(base + '/assets/music_intro.552fc27765453426.m4a', { headers: { Range: 'bytes=0-127' } });
  assert.equal(response.status, 206);
  assert.match(response.headers.get('content-range'), /^bytes 0-127\//);
  assert.equal((await response.arrayBuffer()).byteLength, 128);
  const invalid = await fetch(base + '/assets/music_intro.552fc27765453426.m4a', { headers: { Range: 'bytes=999999999-' } });
  assert.equal(invalid.status, 416);
});

test('missing files fail clearly and private directories are not served', async () => {
  assert.equal((await fetch(base + '/assets/not-present.glb')).status, 404);
  for (const route of ['/.git/config', '/.qa/server.pid', '/%2e%2e%5cpackage.json']) {
    assert.equal((await fetch(base + route)).status, 403);
  }
  assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
});

test('all bundled flat asset references and localized game data exist', async () => {
  const names = (await readdir(path.join(root, 'assets'))).filter(name => /\.(?:js|css|json)$/.test(name));
  const sources = ['index.html', 'manifest.webmanifest', ...names.map(name => `assets/${name}`)];
  const assets = new Set(['fintechs', 'characters', 'dialogs', 'items', 'quests'].map(kind => `/assets/${kind}_en.json`));
  for (const source of sources) {
    const text = await readFile(path.join(root, source), 'utf8');
    for (const match of text.matchAll(/\/(?:assets|icons)\/[A-Za-z0-9_.-]+\.(?:json|js|css|glb|bin|png|jpg|webp|avif|svg|woff2?|m4a)(?![A-Za-z0-9])/g)) {
      assets.add(match[0]);
    }
  }
  for (const asset of assets) assert.ok((await stat(path.join(root, asset))).isFile(), asset);
  assert.ok(assets.size > 1000, 'Check the entire bundled resource inventory');
});
