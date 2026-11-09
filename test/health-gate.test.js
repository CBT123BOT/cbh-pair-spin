const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const hg = require('../health-gate.js');
const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const NOW = 1_800_000_000_000;
const doc = (over = {}, ms = {}) => Object.assign({
  schema: 1, updated_unix: Math.floor(NOW / 1000), last_full_check_unix: Math.floor(NOW / 1000) - 600,
  machines: Object.assign({ pair: { state: 'open' }, vault: { state: 'open' }, slots: { state: 'open' }, coin: { state: 'open' }, vending: { state: 'open' } }, ms)
}, over);

test('fresh open file allows each known machine', () => {
  for (const m of hg.MACHINES) assert.equal(hg.allowed(m, doc(), NOW), true, m);
});
test('missing, malformed, or wrong schema fails closed', () => {
  for (const d of [null, undefined, [], 'x', 5, {}, doc({ schema: 2 }), doc({ updated_unix: '1' }), doc({ machines: null }), doc({ machines: [] })]) {
    assert.equal(hg.allowed('pair', d === undefined ? null : d, NOW), false);
  }
});
test('stale or future file fails closed', () => {
  assert.equal(hg.allowed('pair', doc({ updated_unix: Math.floor(NOW / 1000) - 1800 }), NOW), false);
  assert.equal(hg.allowed('pair', doc({ updated_unix: Math.floor(NOW / 1000) - 1799 }), NOW), true);
  assert.equal(hg.allowed('pair', doc({ updated_unix: Math.floor(NOW / 1000) + 60 }), NOW), false);
});
test('closed, maintenance, unknown or prototype states fail closed', () => {
  for (const s of ['closed', 'maintenance', 'OPEN', 'opened', '', null, 1, '__proto__']) {
    assert.equal(hg.allowed('vault', doc({}, { vault: { state: s } }), NOW), false, String(s));
  }
  assert.equal(hg.allowed('vault', doc({}, { vault: 'open' }), NOW), false);
  assert.equal(hg.allowed('toString', doc(), NOW), false);
  assert.equal(hg.allowed('__proto__', doc(), NOW), false);
  const noOwn = doc(); delete noOwn.machines.pair; assert.equal(hg.allowed('pair', noOwn, NOW), false);
});
test('view never returns a state outside the fixed list', () => {
  const v = hg.view(doc({}, { slots: { state: '<img src=x onerror=alert(1)>' } }), 'slots', NOW);
  assert.equal(v.state, 'maintenance');
});
test('pages wire the health gate fail-closed and the panel inserts no HTML from data', () => {
  const ix = read('index.html'), vt = read('vault.html'), hm = read('home.html');
  assert.match(ix, /health-gate\.js/); assert.match(vt, /health-gate\.js/); assert.match(hm, /health-gate\.js/);
  assert.match(ix, /if\(!getPP\(\)&&!\(window\.CBHHealth&&CBHHealth\.allowed\('pair'\)\)\)\{b\.disabled=true/);
  assert.match(ix, /\$\('plug'\)\.onclick=e=>\{e\.preventDefault\(\);const b=\$\('plug'\);if\(!\(window\.CBHHealth&&CBHHealth\.allowed\('pair'\)\)\)return;/);
  assert.match(vt, /CBHHealth&&CBHHealth\.allowed\('vault'\)\)\)\{b\.disabled=true/);
  const panel = hm.slice(hm.indexOf('Machine health panel'));
  assert.doesNotMatch(panel.slice(0, panel.indexOf('</script>')), /innerHTML|insertAdjacentHTML|document\.write|eval\(|new Function/);
  assert.doesNotMatch(read('health-gate.js'), /innerHTML|eval\(|new Function|localStorage|Xumm/);
});
test('workflow (when added) is read-only, secret-free and cannot turn buttons on', (t) => {
  if (!fs.existsSync(path.join(root, '.github/workflows/health-check.yml'))) { t.skip('workflow not added yet'); return; }
  const wf = read('.github/workflows/health-check.yml');
  assert.match(wf, /permissions:\s*\{\}/);
  assert.doesNotMatch(wf, /secrets\.|pull_request|contents:\s*write|git push|uses:/);
  assert.match(wf, /schedule:/); assert.match(wf, /workflow_dispatch:/);
});
