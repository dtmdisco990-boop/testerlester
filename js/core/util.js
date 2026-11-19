/* Shared utilities: math helpers, seeded RNG, event emitter, formatting, time helpers. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const Util = {};

  Util.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  Util.lerp = (a, b, t) => a + (b - a) * t;
  Util.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  Util.dist2 = (x1, y1, x2, y2) => (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  Util.isNum = (v) => typeof v === 'number' && Number.isFinite(v);
  Util.int = (v, def = 0, min = 0, max = Number.MAX_SAFE_INTEGER) => {
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return def;
    return Util.clamp(Math.floor(n), min, max);
  };
  Util.num = (v, def = 0, min = -Infinity, max = Infinity) => {
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return def;
    return Util.clamp(n, min, max);
  };
  Util.isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  Util.clone = (o) => JSON.parse(JSON.stringify(o));
  Util.now = () => Date.now();
  Util.dayIndex = (ms) => Math.floor(ms / 86400000);
  Util.weekIndex = (ms) => Math.floor((ms / 86400000 + 4) / 7); // weeks start Monday (epoch was Thursday)


  /** Pure-JS SHA-256 (hex) so the owner passcode check works without crypto.subtle (file://, older webviews) and in Node tests. */
  Util.sha256 = function (str) {
    const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c >= 0xd800 && c < 0xdc00 && i + 1 < str.length) { c = 0x10000 + ((c - 0xd800) << 10) + (str.charCodeAt(++i) - 0xdc00); }
      if (c < 0x80) bytes.push(c);
      else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 255);
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const w = new Array(64), rot = (x, n) => (x >>> n) | (x << (32 - n));
    for (let off = 0; off < bytes.length; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) | (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
      for (let i = 16; i < 64; i++) {
        const s0 = rot(w[i - 15], 7) ^ rot(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rot(w[i - 2], 17) ^ rot(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = rot(e, 6) ^ rot(e, 11) ^ rot(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[i] + w[i]) | 0;
        const S0 = rot(a, 2) ^ rot(a, 13) ^ rot(a, 22), mj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + mj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
  };

  Util.hashString = function (str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  };

  /** Deterministic mulberry32 PRNG. */
  Util.makeRng = function (seed) {
    let s = seed >>> 0;
    const r = {
      next() {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      range(a, b) { return a + (b - a) * r.next(); },
      int(a, b) { return Math.floor(a + (b - a + 1) * r.next()); },
      pick(arr) { return arr[Math.floor(r.next() * arr.length)]; },
      chance(p) { return r.next() < p; },
      getState() { return s; },
      setState(v) { s = v >>> 0; },
    };
    return r;
  };

  /** Weighted pick: items = [{w:number, ...}] returns the chosen item. */
  Util.weighted = function (rng, items) {
    let total = 0;
    for (const it of items) total += it.w;
    if (total <= 0) return items[0];
    let x = rng.next() * total;
    for (const it of items) {
      x -= it.w;
      if (x < 0) return it;
    }
    return items[items.length - 1];
  };

  Util.fmt = function (n) {
    n = Math.floor(n);
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  };
  Util.fmtComma = (n) => Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  Util.fmtTime = function (sec) {
    sec = Math.max(0, Math.floor(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  };

  /** Minimal safe event emitter. */
  class Emitter {
    constructor() { this._h = new Map(); }
    on(evt, fn) {
      let a = this._h.get(evt);
      if (!a) { a = []; this._h.set(evt, a); }
      a.push(fn);
      return () => this.off(evt, fn);
    }
    off(evt, fn) {
      const a = this._h.get(evt);
      if (!a) return;
      const i = a.indexOf(fn);
      if (i >= 0) a.splice(i, 1);
    }
    emit(evt, data) {
      const a = this._h.get(evt);
      if (!a || a.length === 0) return;
      const list = a.length === 1 ? a : a.slice();
      for (let i = 0; i < list.length; i++) {
        try { list[i](data); } catch (err) { if (G.console) console.error('[event ' + evt + ']', err); }
      }
    }
    clear() { this._h.clear(); }
  }
  Util.Emitter = Emitter;

  /** Simple object pool. */
  Util.Pool = class {
    constructor(factory, reset, cap) { this.f = factory; this.r = reset; this.items = []; this.cap = cap || 512; }
    get() { return this.items.length ? this.items.pop() : this.f(); }
    put(o) { if (this.items.length < this.cap) { if (this.r) this.r(o); this.items.push(o); } }
  };

  /** In-memory Storage fallback (private mode / tests). */
  Util.MemoryStorage = class {
    constructor() { this.m = new Map(); }
    getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
    setItem(k, v) { this.m.set(k, String(v)); }
    removeItem(k) { this.m.delete(k); }
    key(i) { return Array.from(this.m.keys())[i] || null; }
    get length() { return this.m.size; }
  };

  JJK.Util = Util;
})(typeof window !== 'undefined' ? window : globalThis);
