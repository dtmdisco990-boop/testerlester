const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadGame } = require('./load.js');

const J = loadGame();
const root = path.join(__dirname, '..');

test('Util.sha256 matches the standard test vectors (incl. multi-block and unicode)', () => {
  const crypto = require('crypto');
  const h = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
  for (const s of ['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'a'.repeat(1000), 'jjk owner ✓ 日本語 😀']) assert.equal(J.Util.sha256(s), h(s), JSON.stringify(s.slice(0, 12)));
});

test('owner passcode is stored only as a salted hash; tools/owner-passcode.js produces a matching line', () => {
  const C = J.Config;
  assert.equal(C.OWNER_LAB, true);
  assert.match(C.OWNER_HASH, /^[0-9a-f]{64}$/);
  const bal = fs.readFileSync(path.join(root, 'js/data/balance.js'), 'utf8');
  assert.ok(!/passcode\s*[:=]\s*['"]/i.test(bal), 'no plaintext passcode');
  const out = require('child_process').execFileSync('node', [path.join(root, 'tools/owner-passcode.js'), 'hunter2'], { encoding: 'utf8' });
  assert.equal(out.trim(), "OWNER_HASH: '" + J.Util.sha256(C.OWNER_SALT + 'hunter2') + "',");
  assert.notEqual(J.Util.sha256(C.OWNER_SALT + 'hunter2'), C.OWNER_HASH);
});

test('the lab is soft-locked, rate-limited and removable for release', () => {
  const src = fs.readFileSync(path.join(root, 'js/ui/owner.js'), 'utf8');
  assert.ok(/OWNER_LAB/.test(src) && /sha256/.test(src) && /lockUntil/.test(src));
  // run the Owner module against stubs and check the gate
  const vm = require('vm');
  const sandbox = { JJK: { Config: Object.assign({}, J.Config), Util: J.Util, Balance: J.Balance, UI: { register() {}, toast() {}, modal() { return { close() {} }; }, el: () => ({}), btn: () => ({}) } }, sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} }, Date };
  sandbox.window = sandbox; vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  const O = sandbox.JJK.Owner;
  assert.equal(O.unlocked(), false);
  assert.equal(O.check('wrong'), false);
  assert.equal(O.unlocked(), false);
  O.check('x'); O.check('y'); // third failure triggers the lockout
  const code = fs.existsSync('/tmp/owner_code.txt') ? fs.readFileSync('/tmp/owner_code.txt', 'utf8').trim() : null;
  if (code) assert.equal(O.check(code), false, 'locked out even with the right code for 30s');
  // release switch
  sandbox.JJK.Config.OWNER_LAB = false;
  assert.equal(O.available(), false); assert.equal(O.unlocked(), false);
});

test('SelfTest covers every character, enemy, boss, map x difficulty and banner, and all of it passes', async () => {
  const S = J.SelfTest;
  const need = { characters: J.CharacterOrder.length, enemies: Object.keys(J.Enemies).length, bosses: Object.keys(J.Bosses).length, maps: Object.keys(J.Maps).length * 4 };
  for (const g of Object.keys(need)) assert.equal(S.tasks.filter((t) => t.group === g).length, need[g], g + ' coverage');
  const r = await S.run({ groups: S.groups });
  const bad = r.results.filter((x) => !x.ok).map((x) => x.group + ':' + x.name + ' ' + x.detail);
  assert.deepEqual(bad, []);
  assert.ok(r.total >= 70);
});

test('SelfTest actually fails when something is broken (it is not a rubber stamp)', async () => {
  const S = J.SelfTest, d = J.Characters.mai, k = J.Kits.mai.attack;
  J.Kits.mai.attack = () => false; // a unit that never does anything
  try {
    const r = await S.run({ groups: ['characters'], filter: 'mai' });
    assert.ok(r.failed >= 1, 'broken Mai must be caught');
  } finally { J.Kits.mai.attack = k; }
  const old = d.cost; d.cost = 0;
  try { const r = await S.run({ groups: ['characters'], filter: 'mai' }); assert.ok(r.results.length >= 1); } finally { d.cost = old; }
});

test('god mode keeps the base alive; debug matches are flagged', () => {
  const b = new J.Battle({ mapId: 'tokyo', diff: 'normal', team: [{ id: 'yuji', level: 1, stars: 0 }], seed: 1 });
  b.godMode = true; b.state = 'wave'; b.debugUsed = true;
  for (let i = 0; i < 30; i++) b.spawnEnemy('brute', { wave: 40 });
  for (let i = 0; i < 4000 && !b.over; i++) b.update(J.Balance.STEP);
  assert.equal(b.baseHp, b.baseMax);
  assert.equal(b.getSummary().debug, true);
});
