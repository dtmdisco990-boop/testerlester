// Owner Lab end-to-end: gate, passcode, self-test, sandbox battle with the LAB panel, and "your save is untouched".
const fs = require('fs');
const { launch } = require('./_pw');
(async () => {
  const code = process.env.OWNER_CODE || fs.readFileSync('/tmp/owner_code.txt', 'utf8').trim();
  const br = await launch(); const pg = await br.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:8123/index.html'); await pg.waitForTimeout(1500);
  const res = []; const ok = (n, c) => res.push((c ? 'PASS ' : 'FAIL ') + n);
  const saveKey = await pg.evaluate(() => JJK.Config.SAVE_KEY);
  const snap = () => pg.evaluate((k) => localStorage.getItem(k), saveKey);
  const before = await snap();
  // gate: without passcode there is no lab
  ok('lab locked by default', await pg.evaluate(() => !JJK.Owner.unlocked()));
  await pg.keyboard.press('Control+Shift+O'); await pg.waitForTimeout(300);
  ok('Ctrl+Shift+O shows the passcode prompt', await pg.evaluate(() => !!document.querySelector('.owner-input[type=password]')));
  await pg.fill('.owner-input[type=password]', 'wrong-code'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(200);
  ok('wrong passcode rejected', await pg.evaluate(() => !JJK.Owner.unlocked() && !!document.querySelector('.owner-input[type=password]')));
  await pg.fill('.owner-input[type=password]', code); await pg.keyboard.press('Enter'); await pg.waitForTimeout(600);
  ok('right passcode opens the lab', await pg.evaluate(() => JJK.Owner.unlocked() && !!document.querySelector('[data-screen=owner]')));
  // self-test via the UI
  await pg.evaluate(() => [...document.querySelectorAll('.tab')].find((t) => t.textContent === 'SELF-TEST').click());
  await pg.waitForTimeout(200);
  await pg.evaluate(() => [...document.querySelectorAll('button')].find((b) => /RUN SELF-TEST/.test(b.textContent)).click());
  await pg.waitForFunction(() => window.__selftest, null, { timeout: 120000 });
  const st = await pg.evaluate(() => ({ total: __selftest.total, failed: __selftest.failed, bad: __selftest.results.filter((r) => !r.ok).map((r) => r.group + ':' + r.name + ' ' + r.detail), models: __selftest.results.filter((r) => r.group === 'models').length }));
  ok('self-test in the browser: ' + st.total + ' checks, 0 failed ' + st.bad.slice(0, 3).join('; '), st.failed === 0 && st.total > 100 && st.models > 40);
  await pg.screenshot({ path: '/tmp/owner_selftest.png' });
  // sandbox
  await pg.evaluate(() => [...document.querySelectorAll('.tab')].find((t) => t.textContent === 'SANDBOX').click());
  await pg.waitForTimeout(300);
  await pg.screenshot({ path: '/tmp/owner_sandbox.png' });
  await pg.evaluate(() => [...document.querySelectorAll('button')].find((b) => /START SANDBOX BATTLE/.test(b.textContent)).click());
  await pg.waitForTimeout(1200);
  ok('sandbox battle starts with all 28 characters in the tray', await pg.evaluate(() => __battle && __battle.battle.teamOrder.length === JJK.CharacterOrder.length && __battle.battle.godMode === true && __battle.battle.debugUsed === true));
  await pg.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent === 'LAB').click());
  await pg.waitForTimeout(300);
  await pg.evaluate(() => [...document.querySelectorAll('.lab-panel button')].find((b) => /Spawn ALL bosses/.test(b.textContent)).click());
  await pg.evaluate(() => [...document.querySelectorAll('.lab-panel button')].find((b) => /Spawn ALL enemy/.test(b.textContent)).click());
  const bossCount = await pg.evaluate(() => __battle.battle.enemies.filter((e) => e.alive && JJK.Bosses[e.type]).length);
  ok('LAB panel spawned every boss (' + bossCount + ' alive)', bossCount === Object.keys(await pg.evaluate(() => JJK.Bosses)).length);
  await pg.evaluate(() => { const b = __battle.battle; b.addYen(99999, 0, 0, true); const g = [...b.geo.slots.values()].filter((s) => s.type === 'G'); b.place('jahjuan', g[2].c, g[2].r); b.place('gojo', g[3].c, g[3].r); __battle.st.paused = false; });
  await pg.waitForTimeout(2500);
  await pg.screenshot({ path: '/tmp/owner_battle.png' });
  await pg.evaluate(() => [...document.querySelectorAll('.lab-panel button')].find((b) => /Kill all/.test(b.textContent)).click());
  await pg.waitForTimeout(300);
  ok('Kill all enemies works', await pg.evaluate(() => __battle.battle.enemies.filter((e) => e.alive).length === 0));
  ok('your real save is byte-for-byte untouched by the sandbox', (await snap()) === before);
  // locking again closes it
  ok('no page errors', !errs.length);
  console.log(res.join('\n'), errs.join(';'));
  await br.close(); process.exit(res.some((r) => r.startsWith('FAIL')) ? 1 : 0);
})();
