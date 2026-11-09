/* Static-site payment gate and checkout math.
   No network, no signing, no watcher, no status invention.
   fee_schedule "live" is the only switch that may request 0.01 XRP
   or the 1 XRP paid-Slots bundle. This file does not set that switch.
   slots.json enabled flags are not a payment authorization.
   Nov 9 2026 go-live: backend fee epoch 1794248170 (ledger 108222748).
   Status files are refreshed by the box heartbeat publisher about every
   10 minutes through GitHub Pages, so a status counts as fresh for 30
   minutes. A missing, false, or older status still keeps buttons off. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CBHPayGate = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MAX_AGE_MS = 1800000;  // 30 min: heartbeat every ~10 min + Pages deploy time
  const FUTURE_SKEW_MS = 30000;
  const SERVICES = { slots: 1, coin: 1, vending: 1 };

  function servicePayAllowed(status, nowMs, expectService, pageCfg) {
    if (!status || typeof status !== 'object' || Array.isArray(status)) {
      return { ok: false, reason: 'status missing' };
    }
    if (!SERVICES[status.service] || (expectService && status.service !== expectService)) {
      return { ok: false, reason: 'unknown service' };
    }
    if (status.accepting_payments !== true) {
      return { ok: false, reason: 'not accepting payments' };
    }
    if (status.fee_schedule !== 'live') {
      return { ok: false, reason: 'fee schedule is not live' };
    }
    if (!Number.isInteger(status.fee_epoch_close_unix)) {
      return { ok: false, reason: 'fee epoch missing' };
    }
    if (pageCfg && pageCfg.fee_schedule !== 'live') {
      return { ok: false, reason: 'page fee schedule is not live' };
    }
    if (!Number.isInteger(status.updated_unix) || !Number.isInteger(nowMs)) {
      return { ok: false, reason: 'status clock missing' };
    }
    const age = nowMs - status.updated_unix * 1000;
    if (age >= MAX_AGE_MS || age < -FUTURE_SKEW_MS) {
      return { ok: false, reason: 'status stale' };
    }
    return { ok: true, reason: '' };
  }

  function intDrops(v, fallback) {
    const s = String(v == null ? fallback : v);
    if (!/^[0-9]+$/.test(s)) throw new Error('bad drops');
    const n = Number(s);
    if (!Number.isSafeInteger(n) || n <= 0) throw new Error('bad drops');
    return n;
  }

  function feeLive(cfg) {
    return !!(cfg && cfg.fee_schedule === 'live');
  }

  function xrpLabel(drops) {
    const whole = Math.floor(drops / 1e6);
    const frac = String(drops % 1e6).padStart(6, '0').replace(/0+$/, '');
    return frac ? whole + '.' + frac : String(whole);
  }

  function slotCheckout(cfg, mode, n) {
    n = Number(n);
    const maxN = mode === 'FREE' ? 5 : 3;
    if (!Number.isInteger(n) || n < 1 || n > maxN) throw new Error('bad qty');
    if (mode === 'FREE') {
      const unit = feeLive(cfg) ? intDrops(cfg && cfg.free_spin_drops_next, 10000) : intDrops(cfg && cfg.free_spin_drops, 100000);
      if (feeLive(cfg) && unit !== 10000) throw new Error('free fee must be 10000 drops');
      if (!feeLive(cfg) && unit < 100000) throw new Error('free fee below 0.1 is not active');
      return { amt: n * unit, memo: 'FREE', unit: unit };
    }
    if (mode !== 'PAID') throw new Error('bad mode');
    if (!feeLive(cfg)) {
      const unit = intDrops(cfg && cfg.paid_spin_drops, 500000);
      if (unit !== 500000) throw new Error('paid unit must stay 500000 until live');
      return { amt: n * unit, memo: 'PAID', unit: unit };
    }
    if (n === 1) return { amt: 500000, memo: 'PAID:1', unit: 500000 };
    if (n === 2) return { amt: 1000000, memo: 'PAID:2', unit: 500000 };
    if (n === 3) {
      const bundle = intDrops(cfg && cfg.bundle_three_drops, 1000000);
      if (bundle !== 1000000) throw new Error('bundle must be exactly 1000000 drops');
      return { amt: bundle, memo: 'PAID:3', unit: bundle };
    }
    throw new Error('bad qty');
  }

  function showPaidQty(cfg, n) {
    if (feeLive(cfg) && Number(n) === 2) return false;
    return Number(n) === 1 || Number(n) === 2 || Number(n) === 3;
  }

  function vaultFeeFrom(vj) {
    const published = parseInt(vj && vj.spin_fee_drops, 10);
    const current = published >= 100000 ? published : 100000;
    if (!vj || vj.fee_schedule !== 'live') return current;
    if (String(vj.spin_fee_drops_next) === '10000') return 10000;
    return current;
  }

  // Coin request / vending build fee. 0.01 XRP only when the machine's own
  // status is accepting payments on the live schedule with an integer epoch
  // (the backend accepts 10000 drops for payments at or after that epoch).
  // Otherwise the legacy 0.1 XRP, which the backend accepts on both sides.
  function currentMachineFeeDrops(cfg, status) {
    if (status && status.accepting_payments === true && status.fee_schedule === 'live' &&
        Number.isInteger(status.fee_epoch_close_unix)) {
      return 10000;
    }
    const raw = cfg && cfg.machine_fee_drops;
    const n = typeof raw === 'number' ? raw : parseInt(raw, 10);
    if (n !== 100000) throw new Error('machine fee must stay 100000 drops until a verified epoch');
    return 100000;
  }

  return {
    MAX_AGE_MS: MAX_AGE_MS,
    servicePayAllowed: servicePayAllowed,
    slotCheckout: slotCheckout,
    vaultFeeFrom: vaultFeeFrom,
    xrpLabel: xrpLabel,
    feeLive: feeLive,
    showPaidQty: showPaidQty,
    intDrops: intDrops,
    currentMachineFeeDrops: currentMachineFeeDrops
  };
});
