// Shadows of Pasar Senja — the simulation: movement, vision cones, detection,
// cameras, tripwires, dogs, coin throws, loot, alarm and scoring. No drawing here.
import {
  TILE, MAP_COLS, MAP_ROWS, PLAYER_SPEED, PLAYER_CROUCH_SPEED,
  GUARD_SPEED, DOG_SPEED, CONE_RANGE, CONE_HALF_ANGLE, LEVELS_META,
} from './config.js';
import { parseLevel, isSolid, hasLineOfSight } from './levels.js';

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function canSee(tiles, from, dir, target, range, halfAngle) {
  const dx = target.x - from.x, dy = target.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range || dist < 0.001) return dist < 0.001;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), dir)) > halfAngle) return false;
  return hasLineOfSight(tiles, from.x, from.y, target.x, target.y);
}

export function newGame() {
  return {
    screen: 'title', // title | play | levelclear | victory | caught
    levelIndex: 0,
    money: 0,
    ghost: true, // stays true while no guard ever hit full alarm
    alarm: 0, // 0..100, the level's heat
    noise: 0, // 0..100, spikes on running and coin landings
    log: [],
    time: 0,
    levelTime: 0,
    state: null,
    stats: { spotted: 0, coinsThrown: 0, loot: 0, treasures: 0 },
    selectedLevel: 0,
    shot: null,
  };
}

export function loadLevel(game, index) {
  const parsed = parseLevel(index);
  const st = {
    tiles: parsed.tiles,
    lanterns: parsed.lanterns,
    treasures: parsed.treasures,
    coins: parsed.coins,
    exit: parsed.exit,
    player: {
      x: parsed.player.x, y: parsed.player.y, dir: 0,
      crouch: false, moving: false, running: false,
      hidden: false, speed: 0,
    },
    guards: parsed.def.guards.map((g) => ({
      name: g.name, kind: 'guard',
      waypoints: g.waypoints.map(([c, r]) => ({ x: c + 0.5, y: r + 0.5 })),
      wp: 0, x: g.waypoints[0][0] + 0.5, y: g.waypoints[0][1] + 0.5,
      dir: 0, aware: 0, state: 'calm', // calm | suspicious | alarm
      investigate: null, pause: 0, speed: GUARD_SPEED / TILE,
    })),
    dogs: (parsed.def.dogs || []).map((d) => ({
      name: d.name, kind: 'dog',
      waypoints: d.waypoints.map(([c, r]) => ({ x: c + 0.5, y: r + 0.5 })),
      wp: 0, x: d.at[0] + 0.5, y: d.at[1] + 0.5,
      dir: 0, aware: 0, state: 'calm', investigate: null, pause: 0,
      speed: DOG_SPEED / TILE,
    })),
    cameras: (parsed.def.cameras || []).map((c) => ({
      at: { x: c.at[0] + 0.5, y: c.at[1] + 0.5 },
      sweep: c.sweep, t: Math.random() * 6, dir: c.sweep[0], aware: 0, state: 'calm',
    })),
    tripwires: (parsed.def.tripwires || []).map(([c, r]) => ({ c, r, tripped: false })),
    thrown: [], // flying coins: {x, y, tx, ty, t}
    rings: [], // expanding sound rings: {x, y, r, max}
    popups: [], // floating "+$200" texts: {x, y, text, t, color}
    alertBubble: null, // {text, t} shouted by a guard
    exitOpen: false,
    treasuresGot: 0,
    levelStart: 0,
  };
  game.state = st;
  game.levelIndex = index;
  game.levelTime = 0;
  game.alarm = Math.max(0, game.alarm - 40);
  return st;
}

export function logEvent(game, text) {
  game.log.unshift(text);
  if (game.log.length > 7) game.log.length = 7;
}

function moveWithCollision(st, ent, dx, dy) {
  const nx = ent.x + dx, ny = ent.y + dy;
  if (!isSolid(st.tiles, Math.floor(nx), Math.floor(ent.y))) ent.x = nx;
  if (!isSolid(st.tiles, Math.floor(ent.x), Math.floor(ny))) ent.y = ny;
  ent.x = Math.max(0.6, Math.min(MAP_COLS - 0.6, ent.x));
  ent.y = Math.max(0.6, Math.min(MAP_ROWS - 0.6, ent.y));
}

function walkWaypoints(st, ent, dt, onArrive) {
  if (ent.pause > 0) { ent.pause -= dt; return; }
  const target = ent.waypoints[ent.wp];
  const dx = target.x - ent.x, dy = target.y - ent.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.08) {
    ent.wp = (ent.wp + 1) % ent.waypoints.length;
    ent.pause = 0.9;
    if (onArrive) onArrive(ent);
    return;
  }
  ent.dir = Math.atan2(dy, dx);
  const step = Math.min(dist, ent.speed * dt);
  moveWithCollision(st, ent, (dx / dist) * step, (dy / dist) * step);
}

function inBush(st, x, y) {
  return st.tiles[Math.floor(y)] && st.tiles[Math.floor(y)][Math.floor(x)] === 'bush';
}

function nearLantern(st, x, y) {
  for (const l of st.lanterns) {
    if (Math.hypot(l.c + 0.5 - x, l.r + 0.5 - y) < 2.2) return true;
  }
  return false;
}

export function updateGame(game, input, dt) {
  const st = game.state;
  if (!st || game.screen !== 'play') return;
  game.time += dt;
  game.levelTime += dt;
  const p = st.player;

  // --- player movement ---
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const mag = Math.hypot(mx, my) || 1;
  mx /= mag; my /= mag;
  p.crouch = !!input.crouch;
  const speed = (p.crouch ? PLAYER_CROUCH_SPEED : PLAYER_SPEED) / TILE;
  p.moving = mx !== 0 || my !== 0;
  p.running = p.moving && !p.crouch;
  if (p.moving) {
    p.dir = Math.atan2(my, mx);
    moveWithCollision(st, p, mx * speed * dt, my * speed * dt);
  }
  p.hidden = p.crouch && inBush(st, p.x, p.y);
  p.speed = p.moving ? speed : 0;

  // --- coin throw (mouse click) ---
  if (input.takeClick) {
    const click = input.takeClick();
    if (click) {
      const tx = (click.x - 196 - 14) / TILE, ty = (click.y - 76 - 2) / TILE;
      if (tx > 0 && tx < MAP_COLS && ty > 0 && ty < MAP_ROWS && !isSolid(st.tiles, Math.floor(tx), Math.floor(ty))) {
        st.thrown.push({ x: p.x, y: p.y, tx, ty, t: 0 });
        game.stats.coinsThrown++;
        logEvent(game, 'Coin tossed — listen…');
      }
    }
  }

  // --- thrown coins land and ring (rings age first, so a fresh ring survives its birth tick) ---
  for (const r of st.rings) r.r += dt * 3.2;
  st.rings = st.rings.filter((r) => r.r < r.max);
  for (const c of st.thrown) {
    c.t += dt * 2.2;
    if (c.t >= 1) {
      c.landed = true;
      st.rings.push({ x: c.tx, y: c.ty, r: 0.2, max: 2.6 });
      game.noise = Math.min(100, game.noise + 55);
      for (const g of [...st.guards, ...st.dogs]) {
        if (Math.hypot(g.x - c.tx, g.y - c.ty) < 3.4 && g.state !== 'alarm') {
          g.investigate = { x: c.tx, y: c.ty };
          g.state = 'suspicious';
        }
      }
    }
  }
  st.thrown = st.thrown.filter((c) => !c.landed);
  game.noise = Math.max(0, game.noise - dt * 26);
  if (p.running) game.noise = Math.min(100, game.noise + dt * 14);

  // --- guards ---
  let maxAware = 0;
  for (const g of st.guards) {
    const sees = !p.hidden && canSee(st.tiles, g, g.dir, p, CONE_RANGE / TILE, CONE_HALF_ANGLE);
    const hear = game.noise > 60 && Math.hypot(g.x - p.x, g.y - p.y) < 2.5;
    if (sees) {
      const lit = nearLantern(st, p.x, p.y) ? 1.5 : 1;
      const dist = Math.hypot(g.x - p.x, g.y - p.y);
      const rate = (p.crouch ? 26 : 58) * lit * Math.max(0.4, 1 - dist / 9);
      g.aware = Math.min(100, g.aware + rate * dt);
    } else if (hear) {
      g.aware = Math.min(100, g.aware + 22 * dt);
    } else {
      g.aware = Math.max(0, g.aware - 16 * dt);
    }
    if (g.aware >= 100 && g.state !== 'alarm') {
      g.state = 'alarm';
      game.ghost = false;
      game.stats.spotted++;
      st.alertBubble = { text: 'WHAT WAS THAT?!', t: 1.6 };
      logEvent(game, g.name + ' spotted you — ALARM!');
    } else if (g.aware >= 45 && g.state === 'calm') {
      g.state = 'suspicious';
      st.alertBubble = { text: 'Hm… what was that?', t: 1.4 };
      logEvent(game, g.name + ' is suspicious…');
    } else if (g.aware < 20 && g.state === 'suspicious' && !g.investigate) {
      g.state = 'calm';
    }
    if (g.state === 'alarm') {
      // Chase the player's last seen tile.
      const dx = p.x - g.x, dy = p.y - g.y, dist = Math.hypot(dx, dy) || 1;
      g.dir = Math.atan2(dy, dx);
      const step = Math.min(dist, (GUARD_SPEED * 1.7 / TILE) * dt);
      moveWithCollision(st, g, (dx / dist) * step, (dy / dist) * step);
      if (dist < 0.55) { game.screen = 'caught'; logEvent(game, 'Caught by ' + g.name + '.'); return; }
      if (!sees) g.aware = Math.max(40, g.aware - 6 * dt);
      if (g.aware < 40) { g.state = 'suspicious'; g.investigate = { x: p.x, y: p.y }; }
    } else if (g.investigate) {
      const dx = g.investigate.x - g.x, dy = g.investigate.y - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.25) { g.investigate = null; g.pause = 1.4; }
      else {
        g.dir = Math.atan2(dy, dx);
        const step = Math.min(dist, (GUARD_SPEED * 1.25 / TILE) * dt);
        moveWithCollision(st, g, (dx / dist) * step, (dy / dist) * step);
      }
    } else {
      walkWaypoints(st, g, dt);
    }
    maxAware = Math.max(maxAware, g.aware);
  }

  // --- dogs: short cone, keen nose, fast ---
  for (const d of st.dogs) {
    const sees = !p.hidden && canSee(st.tiles, d, d.dir, p, 3.6, 0.9);
    const smells = !p.hidden && Math.hypot(d.x - p.x, d.y - p.y) < 1.6;
    if (sees || smells) d.aware = Math.min(100, d.aware + 70 * dt);
    else d.aware = Math.max(0, d.aware - 20 * dt);
    if (d.aware >= 100 && d.state !== 'alarm') {
      d.state = 'alarm'; game.ghost = false; game.stats.spotted++;
      st.alertBubble = { text: 'WOOF! WOOF!', t: 1.4 };
      logEvent(game, d.name + ' caught your scent!');
    } else if (d.aware >= 45 && d.state === 'calm') d.state = 'suspicious';
    else if (d.aware < 20 && d.state === 'suspicious' && !d.investigate) d.state = 'calm';
    if (d.state === 'alarm') {
      const dx = p.x - d.x, dy = p.y - d.y, dist = Math.hypot(dx, dy) || 1;
      d.dir = Math.atan2(dy, dx);
      const step = Math.min(dist, (DOG_SPEED * 1.25 / TILE) * dt);
      moveWithCollision(st, d, (dx / dist) * step, (dy / dist) * step);
      if (dist < 0.5) { game.screen = 'caught'; logEvent(game, 'Caught by ' + d.name + ' the dog.'); return; }
      if (!sees && !smells) d.aware = Math.max(40, d.aware - 8 * dt);
      if (d.aware < 40) { d.state = 'suspicious'; d.investigate = { x: p.x, y: p.y }; }
    } else if (d.investigate) {
      const dx = d.investigate.x - d.x, dy = d.investigate.y - d.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.25) { d.investigate = null; d.pause = 1.2; }
      else {
        d.dir = Math.atan2(dy, dx);
        const step = Math.min(dist, (DOG_SPEED / TILE) * dt);
        moveWithCollision(st, d, (dx / dist) * step, (dy / dist) * step);
      }
    } else walkWaypoints(st, d, dt);
    maxAware = Math.max(maxAware, d.aware);
  }

  // --- cameras sweep; seeing you raises the alarm ---
  for (const cam of st.cameras) {
    cam.t += dt * 0.45;
    const span = cam.sweep[1] - cam.sweep[0];
    cam.dir = cam.sweep[0] + (Math.sin(cam.t) * 0.5 + 0.5) * span;
    const sees = !p.hidden && canSee(st.tiles, cam.at, cam.dir, p, 5.2, 0.5);
    cam.aware = sees ? Math.min(100, cam.aware + 65 * dt) : Math.max(0, cam.aware - 25 * dt);
    cam.state = cam.aware >= 100 ? 'alarm' : cam.aware >= 45 ? 'suspicious' : 'calm';
    if (cam.aware >= 100 && game.ghost) {
      game.ghost = false; game.stats.spotted++;
      st.alertBubble = { text: 'CAMERA LOCK!', t: 1.6 };
      logEvent(game, 'Camera locked on you!');
    }
    maxAware = Math.max(maxAware, cam.aware);
  }

  // --- tripwires ---
  for (const w of st.tripwires) {
    if (!w.tripped && Math.floor(p.x) === w.c && Math.floor(p.y) === w.r) {
      w.tripped = true;
      game.alarm = Math.min(100, game.alarm + 45);
      game.ghost = false;
      st.alertBubble = { text: 'TRIPWIRE!', t: 1.6 };
      logEvent(game, 'Tripwire tripped!');
      for (const g of st.guards) {
        if (g.state === 'calm') { g.state = 'suspicious'; g.investigate = { x: p.x, y: p.y }; }
      }
    }
  }

  // --- pickups ---
  for (const t of st.treasures) {
    if (!t.taken && Math.floor(p.x) === t.c && Math.floor(p.y) === t.r) {
      t.taken = true;
      st.treasuresGot++;
      const value = LEVELS_META[game.levelIndex].loot;
      game.money += value;
      game.stats.treasures++;
      game.stats.loot += value;
      st.popups.push({ x: p.x, y: p.y, text: '+' + '$' + value, t: 1.8, color: '#ffd34d' });
      logEvent(game, LEVELS_META[game.levelIndex].treasure + ' +$' + value);
    }
  }
  for (const c of st.coins) {
    if (!c.taken && Math.floor(p.x) === c.c && Math.floor(p.y) === c.r) {
      c.taken = true;
      game.money += 200;
      game.stats.loot += 200;
      st.popups.push({ x: p.x, y: p.y, text: '+$200', t: 1.6, color: '#ffd34d' });
      logEvent(game, 'Gold coin pocketed. +$200');
    }
  }
  for (const pop of st.popups) pop.t -= dt;
  st.popups = st.popups.filter((pop) => pop.t > 0);
  if (st.alertBubble) {
    st.alertBubble.t -= dt;
    if (st.alertBubble.t <= 0) st.alertBubble = null;
  }

  // --- exit opens once every treasure of the level is taken ---
  st.exitOpen = st.treasures.every((t) => t.taken);
  if (st.exitOpen && Math.floor(p.x) === Math.floor(st.exit.x) && Math.floor(p.y) === Math.floor(st.exit.y)) {
    if (game.levelIndex >= 2) {
      game.screen = 'victory';
      if (game.ghost) { game.money += 500; logEvent(game, 'GHOST BONUS +$500!'); }
    } else {
      game.screen = 'levelclear';
      logEvent(game, LEVELS_META[game.levelIndex].name + ' cleared.');
    }
  }

  // --- alarm heat follows the hottest watcher ---
  const target = Math.max(maxAware, game.alarm * 0.6);
  game.alarm = Math.max(0, Math.min(100, game.alarm + (target - game.alarm) * dt * 0.8 - dt * 1.5));
  game.detection = maxAware;
  game.visibility = visibilityOf(game);
}

export function visibilityOf(game) {
  const st = game.state;
  if (!st) return 0;
  const p = st.player;
  if (p.hidden) return 8;
  let v = p.crouch ? 30 : 55;
  if (nearLantern(st, p.x, p.y)) v += 25;
  if (p.running) v += 15;
  return Math.min(100, v);
}

export function scoreBreakdown(game) {
  const loot = game.stats.loot;
  const ghost = game.ghost ? 500 : 0;
  const timeBonus = game.screen === 'victory'
    ? Math.max(0, 900 - Math.floor(game.time) * 2)
    : 0;
  return [
    { label: 'Loot stolen', value: loot },
    { label: 'Ghost bonus (never seen)', value: ghost },
    { label: 'Speed bonus', value: timeBonus },
    { label: 'TOTAL', value: loot + ghost + timeBonus },
  ];
}
