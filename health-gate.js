/* Machine health gate (Nov 9 2026 auto-maintenance).
   Reads machine_health.json, published by the box heartbeat from the auto-maintenance watchdog.
   It can only switch a pay button OFF. allowed() is true only when the file is well formed, fresh
   (under 30 minutes old) and says "open" for that machine. A missing, stale, malformed or
   unknown value counts as "maintenance". Display values come from a fixed list, never from the file.
   No signing, no wallet, no inputs. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CBHHealth = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MAX_AGE_MS = 1800000;
  const FUTURE_SKEW_MS = 30000;
  const MACHINES = ['pair', 'vault', 'slots', 'coin', 'vending'];
  const STATES = ['open', 'closed', 'maintenance'];
  let DOC = null;

  function view(doc, machine, nowMs) {
    const out = { state: 'maintenance', fresh: false, updated_unix: null, last_full_check_unix: null };
    if (MACHINES.indexOf(machine) < 0) return out;
    if (!doc || typeof doc !== 'object' || Array.isArray(doc) || doc.schema !== 1) return out;
    if (!Number.isInteger(doc.updated_unix) || !Number.isInteger(nowMs)) return out;
    const age = nowMs - doc.updated_unix * 1000;
    out.updated_unix = doc.updated_unix;
    if (Number.isInteger(doc.last_full_check_unix)) out.last_full_check_unix = doc.last_full_check_unix;
    if (age >= MAX_AGE_MS || age < -FUTURE_SKEW_MS) return out;
    out.fresh = true;
    const ms = doc.machines;
    if (!ms || typeof ms !== 'object' || Array.isArray(ms) || !Object.prototype.hasOwnProperty.call(ms, machine)) return out;
    const e = ms[machine];
    if (e && typeof e === 'object' && STATES.indexOf(e.state) >= 0) out.state = e.state;
    return out;
  }

  function allowed(machine, doc, nowMs) {
    if (doc === undefined) doc = DOC;
    if (nowMs === undefined) nowMs = Date.now();
    return view(doc, machine, nowMs).state === 'open';
  }

  async function load() {
    try {
      const r = await fetch('machine_health.json?t=' + Date.now(), { cache: 'no-store' });
      DOC = r.ok ? await r.json() : null;
    } catch (e) { DOC = null; }
    return DOC;
  }

  return { MAX_AGE_MS: MAX_AGE_MS, MACHINES: MACHINES, view: view, allowed: allowed, load: load,
           current: function () { return DOC; } };
});
