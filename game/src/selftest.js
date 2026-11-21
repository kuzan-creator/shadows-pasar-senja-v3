// Shadows of Pasar Senja — the in-browser self-test (?selftest=1).
// Ten checks over the real engine and renderer; results go to #selftest and the title.
import { MAP_COLS, MAP_ROWS } from './config.js';
import { LEVELS, parseLevel, isSolid, hasLineOfSight } from './levels.js';
import { newGame, loadLevel, updateGame, canSee, scoreBreakdown } from './engine.js';
import { render, FX, FY } from './render.js';

function blankInput(click) {
  return {
    up: false, down: false, left: false, right: false, crouch: false,
    takeClick() { const c = click; click = null; return c; },
  };
}

function reachable(tiles, sx, sy) {
  const seen = new Set([sx + ',' + sy]);
  const q = [[sx, sy]];
  while (q.length) {
    const [c, r] = q.pop();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr, k = nc + ',' + nr;
      if (!seen.has(k) && !isSolid(tiles, nc, nr)) { seen.add(k); q.push([nc, nr]); }
    }
  }
  return (x, y) => seen.has(Math.floor(x) + ',' + Math.floor(y));
}

export function runSelfTests(ctx) {
  const lines = [];
  let passed = 0;
  let total = 0;
  const check = (name, ok) => {
    total++;
    lines.push((ok ? 'PASS' : 'FAIL') + ' ' + name);
    if (ok) passed++;
  };
  try {
    // 1. All three maps parse to the full grid.
    check('maps parse 21x18 x3', LEVELS.length === 3 && LEVELS.every((l) => l.map.length === 18 && l.map.every((r) => r.length === 21)));

    // 2. Every treasure, coin and exit is reachable on foot from the player start.
    let reachOk = true;
    for (let i = 0; i < 3; i++) {
      const p = parseLevel(i);
      const can = reachable(p.tiles, Math.floor(p.player.x), Math.floor(p.player.y));
      if (!can(p.exit.x, p.exit.y)) reachOk = false;
      for (const t of [...p.treasures, ...p.coins]) if (!can(t.c + 0.5, t.r + 0.5)) reachOk = false;
    }
    check('exit + all loot reachable', reachOk);

    // 3. Vision: open lane sees, a wall blocks, behind the guard is blind.
    const g0 = parseLevel(0);
    const from = { x: 2.5, y: 5.5 };
    check('cone sees open lane', canSee(g0.tiles, from, 0, { x: 7.5, y: 5.5 }, 5.875, 0.61));
    check('wall blocks cone', !canSee(g0.tiles, { x: 1.5, y: 1.5 }, 0, { x: 19.5, y: 1.5 }, 5.875, 0.61));
    check('behind guard is blind', !canSee(g0.tiles, from, 0, { x: 1.5, y: 5.5 }, 5.875, 0.61));

    // 4. A guard walks its patrol.
    const game4 = newGame();
    loadLevel(game4, 0);
    game4.screen = 'play';
    const gx0 = game4.state.guards[0].x;
    for (let i = 0; i < 4; i++) updateGame(game4, blankInput(null), 0.6);
    check('guard patrols', game4.state.guards[0].x > gx0 + 0.5);

    // 5. Standing in a calm cone raises awareness fast.
    const game5 = newGame();
    loadLevel(game5, 0);
    game5.screen = 'play';
    game5.state.guards[0].x = 5.5; game5.state.guards[0].y = 5.5; game5.state.guards[0].dir = 0;
    game5.state.player.x = 7.5; game5.state.player.y = 5.5;
    updateGame(game5, blankInput(null), 2);
    check('detection rises in cone', game5.state.guards[0].aware > 50);

    // 6. Crouched in a bush, the same guard stays blind.
    const game6 = newGame();
    loadLevel(game6, 0);
    game6.screen = 'play';
    game6.state.guards[0].x = 11.5; game6.state.guards[0].y = 2.5; game6.state.guards[0].dir = Math.PI;
    game6.state.player.x = 9.5; game6.state.player.y = 2.5;
    const inp6 = blankInput(null);
    inp6.crouch = true;
    updateGame(game6, inp6, 2);
    check('bush hides crouched player', game6.state.guards[0].aware < 5 && game6.state.player.hidden);

    // 7. Touching a treasure banks its value.
    const game7 = newGame();
    loadLevel(game7, 0);
    game7.screen = 'play';
    const t7 = game7.state.treasures[0];
    game7.state.player.x = t7.c + 0.5; game7.state.player.y = t7.r + 0.5;
    updateGame(game7, blankInput(null), 0.1);
    check('treasure pickup pays', game7.state.treasuresGot === 1 && game7.money === 600);

    // 8. All treasures + exit ends the level.
    const game8 = newGame();
    loadLevel(game8, 0);
    game8.screen = 'play';
    for (const t of game8.state.treasures) {
      game8.state.player.x = t.c + 0.5; game8.state.player.y = t.r + 0.5;
      updateGame(game8, blankInput(null), 0.1);
    }
    game8.state.player.x = game8.state.exit.x; game8.state.player.y = game8.state.exit.y;
    updateGame(game8, blankInput(null), 0.1);
    check('exit after loot clears level', game8.screen === 'levelclear' && game8.state.exitOpen);

    // 9. A thrown coin lands and rings.
    const game9 = newGame();
    loadLevel(game9, 0);
    game9.screen = 'play';
    const click = { x: FX + 10.5 * 40, y: FY + 7.5 * 40 };
    updateGame(game9, blankInput(click), 0.1);
    const thrown = game9.state.thrown.length === 1;
    updateGame(game9, blankInput(null), 1);
    check('coin throw rings', thrown && game9.state.rings.length === 1);

    // 10. A full frame renders and the score breakdown adds up.
    const game10 = newGame();
    loadLevel(game10, 1);
    game10.screen = 'play';
    render(ctx, game10);
    const rows = scoreBreakdown(game10);
    const total = rows.find((r) => r.label === 'TOTAL').value;
    const sum = rows.filter((r) => r.label !== 'TOTAL').reduce((a, r) => a + r.value, 0);
    check('render + score breakdown', total === sum && rows.length === 4);
  } catch (e) {
    lines.push('ERROR ' + (e && e.message ? e.message : String(e)));
  }
  return { passed, total, lines };
}
