const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const gate = require('../pay-gate.js');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));

const NOW = 1_700_000_000_000;
const fresh = (over = {}) => Object.assign({
  service: 'slots',
  accepting_payments: true,
  fee_schedule: 'pending',
  fee_epoch_close_unix: null,
  updated_unix: Math.floor(NOW / 1000)
}, over);
const ready = (over = {}) => fresh(Object.assign({
  fee_schedule: 'live',
  fee_epoch_close_unix: 1700000000
}, over));

test('shipped status files fail closed and are not fresh', () => {
  for (const rel of ['slots_status.json', 'mickel-pickle/coin_status.json', 'mickel-pickle/vending_status.json']) {
    const status = json(rel);
    const got = gate.servicePayAllowed(status, NOW, status.service);
    assert.equal(got.ok, false, rel);
    assert.equal(status.accepting_payments, false);
    assert.notEqual(status.fee_schedule, 'live');
    assert.equal(status.updated_unix, 0);
  }
});

test('a stale enabled flag is not accepting_payments', () => {
  const slots = json('slots.json');
  assert.equal(slots.paid_spins_enabled, true);
  assert.equal(slots.free_spins_enabled, true);
  assert.equal(slots.fee_schedule, 'PENDING_NOT_LIVE');
  const masquerade = {
    service: 'slots',
    enabled: true,
    paid_spins_enabled: true,
    accepting_payments: false,
    updated_unix: Math.floor(NOW / 1000)
  };
  assert.equal(gate.servicePayAllowed(masquerade, NOW, 'slots').ok, false);
  assert.equal(gate.servicePayAllowed(fresh({ accepting_payments: 'true' }), NOW, 'slots').ok, false);
});

test('accepting payments still requires a live schedule and an integer epoch', () => {
  assert.deepEqual(gate.servicePayAllowed(fresh(), NOW, 'slots'), { ok: false, reason: 'fee schedule is not live' });
  assert.deepEqual(gate.servicePayAllowed(fresh({ fee_schedule: 'live' }), NOW, 'slots'), { ok: false, reason: 'fee epoch missing' });
  assert.deepEqual(gate.servicePayAllowed(fresh({ fee_schedule: 'live', fee_epoch_close_unix: '1700000000' }), NOW, 'slots'), { ok: false, reason: 'fee epoch missing' });
  assert.equal(gate.servicePayAllowed(ready(), NOW, 'slots').ok, true);
  assert.deepEqual(gate.servicePayAllowed(ready(), NOW, 'slots', { fee_schedule: 'PENDING_NOT_LIVE' }), { ok: false, reason: 'page fee schedule is not live' });
  assert.equal(gate.servicePayAllowed(ready(), NOW, 'slots', json('slots.json')).reason, 'page fee schedule is not live');
  assert.equal(gate.servicePayAllowed(ready(), NOW, 'slots', { fee_schedule: 'live' }).ok, true);
});

test('a coherent fresh status expires before 180 seconds', () => {
  const almost = ready({ updated_unix: Math.floor(NOW / 1000) - 179 });
  assert.equal(gate.servicePayAllowed(almost, NOW, 'slots').ok, true);
  const edge = ready({ updated_unix: Math.floor(NOW / 1000) - 180 });
  assert.deepEqual(gate.servicePayAllowed(edge, NOW, 'slots'), { ok: false, reason: 'status stale' });
  assert.equal(gate.servicePayAllowed(ready({ service: 'coin' }), NOW, 'slots').reason, 'unknown service');
  assert.equal(gate.servicePayAllowed(null, NOW, 'slots').reason, 'status missing');
  assert.equal(gate.servicePayAllowed(ready({ updated_unix: Math.floor(NOW / 1000) + 31 }), NOW, 'slots').reason, 'status stale');
});

test('current checkout stays 0.1 and 0.5 until fee_schedule is live', () => {
  const cfg = json('slots.json');
  assert.deepEqual(gate.slotCheckout(cfg, 'FREE', 1), { amt: 100000, memo: 'FREE', unit: 100000 });
  assert.deepEqual(gate.slotCheckout(cfg, 'FREE', 5), { amt: 500000, memo: 'FREE', unit: 100000 });
  assert.deepEqual(gate.slotCheckout(cfg, 'PAID', 1), { amt: 500000, memo: 'PAID', unit: 500000 });
  assert.deepEqual(gate.slotCheckout(cfg, 'PAID', 2), { amt: 1000000, memo: 'PAID', unit: 500000 });
  assert.deepEqual(gate.slotCheckout(cfg, 'PAID', 3), { amt: 1500000, memo: 'PAID', unit: 500000 });
  assert.equal(gate.showPaidQty(cfg, 2), true);
  assert.equal(gate.xrpLabel(100000), '0.1');
  assert.equal(gate.xrpLabel(500000), '0.5');
  assert.throws(() => gate.slotCheckout(Object.assign({}, cfg, { free_spin_drops: '10000' }), 'FREE', 1), /not active/);
});

test('live schedule is inert unless the page flag is exactly live, and the bundle is exact', () => {
  const cfg = Object.assign({}, json('slots.json'), { fee_schedule: 'live' });
  assert.equal(gate.feeLive(json('slots.json')), false);
  assert.equal(gate.feeLive(cfg), true);
  assert.deepEqual(gate.slotCheckout(cfg, 'FREE', 1), { amt: 10000, memo: 'FREE', unit: 10000 });
  assert.equal(gate.xrpLabel(10000), '0.01');
  assert.deepEqual(gate.slotCheckout(cfg, 'PAID', 1), { amt: 500000, memo: 'PAID:1', unit: 500000 });
  assert.deepEqual(gate.slotCheckout(cfg, 'PAID', 3), { amt: 1000000, memo: 'PAID:3', unit: 1000000 });
  assert.deepEqual(gate.slotCheckout(cfg, 'PAID', 2), { amt: 1000000, memo: 'PAID:2', unit: 500000 });
  assert.equal(gate.showPaidQty(cfg, 1), true);
  assert.equal(gate.showPaidQty(cfg, 2), false);
  assert.equal(gate.showPaidQty(cfg, 3), true);
  assert.throws(() => gate.slotCheckout(Object.assign({}, cfg, { bundle_three_drops: '999999' }), 'PAID', 3), /exactly 1000000/);
  assert.throws(() => gate.slotCheckout(cfg, 'PAID', 4), /bad qty/);
});

test('vault keeps the published request at or above 0.1 until the live switch', () => {
  const vault = json('vault.json');
  assert.equal(vault.open, true);
  assert.equal(vault.fee_schedule, 'PENDING_NOT_LIVE');
  assert.equal(vault.spin_fee_drops, '100000');
  assert.equal(gate.vaultFeeFrom(vault), 100000);
  assert.equal(gate.vaultFeeFrom({ spin_fee_drops: '10000', spin_fee_drops_next: '10000', fee_schedule: 'PENDING_NOT_LIVE' }), 100000);
  assert.equal(gate.vaultFeeFrom({ spin_fee_drops: '100000', spin_fee_drops_next: '10000', fee_schedule: 'live' }), 10000);
  assert.equal(gate.vaultFeeFrom({ spin_fee_drops: '200000', fee_schedule: 'PENDING_NOT_LIVE' }), 200000);
  assert.equal(gate.vaultFeeFrom({ spin_fee_drops: '200000', spin_fee_drops_next: '999', fee_schedule: 'live' }), 200000);
});

test('coin and vending payloads stay on 0.1 drops', () => {
  assert.equal(gate.currentMachineFeeDrops(json('mickel-pickle/ashes_public.json')), 100000);
  assert.equal(gate.currentMachineFeeDrops(json('mickel-pickle/coin_results.json')), 100000);
  assert.throws(() => gate.currentMachineFeeDrops({ machine_fee_drops: 10000 }), /100000/);
});

test('homepage puts Pair Spin above the Vault and does not publish the grok white paper', () => {
  const home = read('home.html');
  const pairAt = home.indexOf('class="card pair"');
  const vaultAt = home.indexOf('class="card vault"');
  assert.ok(pairAt > 0 && vaultAt > pairAt);
  assert.match(home, /Not an investment/);
  assert.match(home, /This repo does not publish that page/);
  assert.doesNotMatch(home, /class="card[^"]*\blive\b/i);
  assert.equal(home.includes('PENDING_cbh-whitepaper'), false);
});

test('pair spin price files stay on the current schedule', () => {
  const waves = json('waves.json');
  assert.equal(waves.open, true);
  assert.equal(waves.waves[0].id, 'D2');
  assert.equal(waves.waves[0].price_xrp, '11.82');
  assert.match(read('index.html'), /GIFT_DROPS='100000'/);
  assert.doesNotMatch(read('index.html'), /fee_schedule/);
});

test('no shipped json marks the new fee or payments active', () => {
  const files = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      if (name === '.git' || name === 'test' || name === 'node_modules') continue;
      const abs = path.join(dir, name);
      const st = fs.statSync(abs);
      if (st.isDirectory()) walk(abs);
      else if (name.endsWith('.json')) files.push(abs);
    }
  };
  walk(root);
  for (const abs of files) {
    const text = fs.readFileSync(abs, 'utf8');
    assert.doesNotMatch(text, /"fee_schedule"\s*:\s*"live"/, abs);
    assert.doesNotMatch(text, /"accepting_payments"\s*:\s*true/, abs);
  }
});
