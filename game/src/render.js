// Shadows of Pasar Senja — every pixel: the dark floor, lantern pools, the big
// coloured vision cones, the guards, the HUD panels and the title/victory screens.
import { VIEW, TILE, FIELD, HUD, MAP_COLS, MAP_ROWS, CONE_RANGE, CONE_HALF_ANGLE, COLORS, LEVELS_META } from './config.js';
import { isSolid } from './levels.js';
import { scoreBreakdown, visibilityOf } from './engine.js';

export const FX = FIELD.x + 14; // play-field origin in canvas pixels
export const FY = FIELD.y + 2;

export function tileToPx(tx, ty) { return { x: FX + tx * TILE, y: FY + ty * TILE }; }
export function pxToTile(px, py) { return { x: (px - FX) / TILE, y: (py - FY) / TILE }; }

// Ray-cast one vision cone against the walls so the light hugs the architecture.
export function conePolygon(tiles, from, dir, range, halfAngle) {
  const pts = [{ x: from.x, y: from.y }];
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const a = dir - halfAngle + (2 * halfAngle * i) / steps;
    const dx = Math.cos(a), dy = Math.sin(a);
    let r = range;
    for (let d = 8; d <= range; d += 7) {
      const tx = Math.floor(from.x + dx * (d / TILE));
      const ty = Math.floor(from.y + dy * (d / TILE));
      if (isSolid(tiles, tx, ty)) { r = d; break; }
    }
    pts.push({ x: from.x + dx * (r / TILE), y: from.y + dy * (r / TILE) });
  }
  return pts;
}

function coneColor(state) {
  return state === 'alarm' ? COLORS.alarm : state === 'suspicious' ? COLORS.suspicious : COLORS.calm;
}

function drawCone(ctx, tiles, from, dir, range, halfAngle, state, alpha) {
  const poly = conePolygon(tiles, from, dir, range, halfAngle);
  const col = coneColor(state);
  ctx.beginPath();
  ctx.moveTo(FX + poly[0].x * TILE, FY + poly[0].y * TILE);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(FX + poly[i].x * TILE, FY + poly[i].y * TILE);
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.globalAlpha = alpha;
  ctx.fill();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawGuard(ctx, st, g, isDog) {
  const { x, y } = tileToPx(g.x, g.y);
  const col = coneColor(g.state);
  // body
  ctx.beginPath();
  ctx.arc(x, y, isDog ? 11 : 13, 0, Math.PI * 2);
  ctx.fillStyle = isDog ? '#3a2a18' : '#20293f';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = col;
  ctx.stroke();
  // facing tick
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(g.dir) * 19, y + Math.sin(g.dir) * 19);
  ctx.strokeStyle = col;
  ctx.lineWidth = 3;
  ctx.stroke();
  // eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + Math.cos(g.dir) * 5 - Math.sin(g.dir) * 4, y + Math.sin(g.dir) * 5 + Math.cos(g.dir) * 4, 2, 0, Math.PI * 2);
  ctx.arc(x + Math.cos(g.dir) * 5 + Math.sin(g.dir) * 4, y + Math.sin(g.dir) * 5 - Math.cos(g.dir) * 4, 2, 0, Math.PI * 2);
  ctx.fill();
  if (isDog) {
    ctx.fillStyle = '#c98a4b';
    ctx.beginPath();
    ctx.arc(x + Math.cos(g.dir) * 12, y + Math.sin(g.dir) * 12, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // name + awareness arc
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#dfe6ff';
  ctx.fillText(g.name, x, y - 20);
  if (g.aware > 2) {
    ctx.beginPath();
    ctx.arc(x, y, 18, -Math.PI / 2, -Math.PI / 2 + (g.aware / 100) * Math.PI * 2);
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  if (g.state === 'suspicious') {
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = COLORS.suspicious;
    ctx.fillText('?', x, y - 30);
  } else if (g.state === 'alarm') {
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = COLORS.alarm;
    ctx.fillText('!', x, y - 30);
  }
}

function drawWorld(ctx, game) {
  const st = game.state;
  const tiles = st.tiles;
  // floor
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const k = tiles[r][c];
      const x = FX + c * TILE, y = FY + r * TILE;
      if (k === 'wall' || k === 'kiosk' || k === 'container') continue;
      ctx.fillStyle = (c + r) % 2 ? COLORS.floor : COLORS.floorAlt;
      ctx.fillRect(x, y, TILE, TILE);
      if (k === 'carpet') {
        ctx.fillStyle = COLORS.carpet;
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = '#7a2440';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 6, y + 6, TILE - 12, TILE - 12);
      }
      if (k === 'bush') {
        ctx.fillStyle = COLORS.bush;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.bushLeaf;
        ctx.beginPath();
        ctx.arc(x + 12, y + 14, 9, 0, Math.PI * 2);
        ctx.arc(x + 28, y + 12, 10, 0, Math.PI * 2);
        ctx.arc(x + 20, y + 28, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      if (k === 'exit') {
        ctx.fillStyle = '#0d3d22';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = st.exitOpen ? COLORS.exit : '#3f7a58';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = st.exitOpen ? COLORS.exit : '#7ab894';
        ctx.fillText('EXIT', x + TILE / 2, y + TILE / 2 + 4);
      }
    }
  }
  // lantern light pools (warm, on the dark floor)
  for (const l of st.lanterns) {
    const { x, y } = tileToPx(l.c + 0.5, l.r + 0.5);
    const g = ctx.createRadialGradient(x, y, 6, x, y, 95);
    g.addColorStop(0, 'rgba(255, 179, 71, 0.34)');
    g.addColorStop(1, 'rgba(255, 179, 71, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 95, y - 95, 190, 190);
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.lantern;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,179,71,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // walls / kiosks / containers
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const k = tiles[r][c];
      if (k !== 'wall' && k !== 'kiosk' && k !== 'container') continue;
      const x = FX + c * TILE, y = FY + r * TILE;
      ctx.fillStyle = k === 'wall' ? COLORS.wall : k === 'kiosk' ? COLORS.kiosk : COLORS.container;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = k === 'wall' ? COLORS.wallTop : k === 'kiosk' ? COLORS.kioskTop : COLORS.containerTop;
      ctx.fillRect(x, y, TILE, 5);
      if (k === 'kiosk') {
        ctx.fillStyle = '#c98a4b';
        ctx.fillRect(x + 8, y + 14, TILE - 16, 3);
        ctx.fillRect(x + 8, y + 24, TILE - 16, 3);
      }
      if (k === 'container') {
        ctx.strokeStyle = 'rgba(255,255,255,0.14)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(x + i * 10, y + 6);
          ctx.lineTo(x + i * 10, y + TILE - 2);
          ctx.stroke();
        }
      }
    }
  }
  // tripwires
  for (const w of st.tripwires) {
    const { x, y } = tileToPx(w.c, w.r);
    ctx.strokeStyle = w.tripped ? COLORS.alarm : COLORS.suspicious;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(x, y + TILE / 2);
    ctx.lineTo(x + TILE, y + TILE / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // coins + treasures
  for (const c of st.coins) {
    if (c.taken) continue;
    const { x, y } = tileToPx(c.c + 0.5, c.r + 0.5);
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.gold;
    ctx.fill();
    ctx.strokeStyle = '#8a6a12';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  for (const t of st.treasures) {
    if (t.taken) continue;
    const { x, y } = tileToPx(t.c + 0.5, t.r + 0.5);
    const pulse = 0.7 + Math.sin(game.time * 3 + t.c) * 0.3;
    const g = ctx.createRadialGradient(x, y, 2, x, y, 34);
    g.addColorStop(0, 'rgba(255, 211, 77, ' + (0.5 * pulse) + ')');
    g.addColorStop(1, 'rgba(255, 211, 77, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 34, y - 34, 68, 68);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(-9, -9, 18, 18);
    ctx.strokeStyle = '#fff2b0';
    ctx.lineWidth = 2;
    ctx.strokeRect(-9, -9, 18, 18);
    ctx.restore();
  }
  // vision cones — the dominant element of the frame
  for (const cam of st.cameras) {
    drawCone(ctx, tiles, cam.at, cam.dir, 5.2 * TILE, 0.5, cam.state, cam.state === 'calm' ? 0.22 : 0.42);
    const { x, y } = tileToPx(cam.at.x, cam.at.y);
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#101828';
    ctx.fill();
    ctx.strokeStyle = coneColor(cam.state);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(cam.dir) * 14, y + Math.sin(cam.dir) * 14);
    ctx.strokeStyle = coneColor(cam.state);
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  for (const g of st.guards) drawCone(ctx, tiles, g, g.dir, CONE_RANGE, CONE_HALF_ANGLE, g.state, g.state === 'calm' ? 0.26 : 0.45);
  for (const d of st.dogs) drawCone(ctx, tiles, d, d.dir, 3.6 * TILE, 0.9, d.state, d.state === 'calm' ? 0.2 : 0.4);
  // sound rings
  for (const r of st.rings) {
    ctx.beginPath();
    ctx.arc(FX + r.x * TILE, FY + r.y * TILE, r.r * TILE, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 211, 77, ' + Math.max(0, 1 - r.r / r.max) + ')';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // thrown coins in flight
  for (const c of st.thrown) {
    const x = FX + (c.x + (c.tx - c.x) * c.t) * TILE;
    const y = FY + (c.y + (c.ty - c.y) * c.t) * TILE - Math.sin(c.t * Math.PI) * 22;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.gold;
    ctx.fill();
  }
  // guards + dogs + player
  for (const g of st.guards) drawGuard(ctx, st, g, false);
  for (const d of st.dogs) drawGuard(ctx, st, d, true);
  const p = st.player;
  const { x: px, y: py } = tileToPx(p.x, p.y);
  if (p.hidden) {
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9fe8b4';
    ctx.fillText('HIDDEN', px, py - 22);
  }
  ctx.beginPath();
  ctx.arc(px, py, 13, 0, Math.PI * 2);
  ctx.fillStyle = p.crouch ? '#5a6b8f' : COLORS.player;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = p.hidden ? '#2eff8a' : '#0a0e1a';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + Math.cos(p.dir) * 17, py + Math.sin(p.dir) * 17);
  ctx.strokeStyle = '#0a0e1a';
  ctx.lineWidth = 3;
  ctx.stroke();
  // hood
  ctx.beginPath();
  ctx.arc(px, py - 3, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#2b3550';
  ctx.fill();
  // popups
  ctx.textAlign = 'center';
  for (const pop of st.popups) {
    ctx.font = 'bold 20px sans-serif';
    ctx.globalAlpha = Math.min(1, pop.t);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, FX + pop.x * TILE, FY + pop.y * TILE - 26 - (1.8 - pop.t) * 18);
    ctx.globalAlpha = 1;
  }
  // shouted bubble
  if (st.alertBubble) {
    const g = st.guards.find((gg) => gg.state !== 'calm') || st.guards[0];
    if (g) {
      const { x: gx, y: gy } = tileToPx(g.x, g.y);
      ctx.font = 'bold 17px sans-serif';
      const w = ctx.measureText(st.alertBubble.text).width + 22;
      ctx.fillStyle = 'rgba(10, 8, 4, 0.92)';
      ctx.strokeStyle = COLORS.alarm;
      ctx.lineWidth = 2;
      roundRect(ctx, gx - w / 2, gy - 62, w, 28, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillText(st.alertBubble.text, gx, gy - 43);
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bar(ctx, x, y, w, h, frac, color, label) {
  ctx.fillStyle = '#131a2e';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(5, 7, 13, 0.9)';
  ctx.strokeText(label, x + 4, y + h / 2 + 4);
  ctx.fillStyle = '#fff';
  ctx.fillText(label, x + 4, y + h / 2 + 4);
}

function drawHud(ctx, game) {
  const st = game.state;
  const meta = LEVELS_META[game.levelIndex];
  // top bar
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(0, 0, VIEW.w, HUD.top);
  ctx.fillStyle = COLORS.panelEdge;
  ctx.fillRect(0, HUD.top - 2, VIEW.w, 2);
  ctx.textAlign = 'left';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('SHADOWS OF PASAR SENJA', 16, 30);
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = COLORS.gold;
  ctx.fillText('L' + (game.levelIndex + 1) + ' · ' + meta.name + ' — steal the ' + meta.treasure, 16, 52);
  ctx.textAlign = 'right';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = COLORS.gold;
  ctx.fillText('$' + game.money, VIEW.w - 16, 32);
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = game.ghost ? '#2eff8a' : COLORS.muted;
  ctx.fillText(game.ghost ? 'GHOST · +$500 if unseen' : 'SPOTTED — ghost bonus lost', VIEW.w - 16, 52);
  ctx.textAlign = 'left';

  // left panel: objectives, gadgets, event log
  const L = 8, LW = HUD.left - 16;
  ctx.fillStyle = COLORS.panel;
  roundRect(ctx, L, HUD.top + 8, LW, 300, 10);
  ctx.fill();
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.stroke();
  let y = HUD.top + 34;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('OBJECTIVES', L + 12, y);
  y += 26;
  ctx.font = '15px sans-serif';
  const got = st ? st.treasuresGot : 0;
  const total = st ? st.treasures.length : 3;
  ctx.fillStyle = got >= total ? '#2eff8a' : COLORS.text;
  ctx.fillText((got >= total ? '☑ ' : '☐ ') + 'Steal ' + meta.treasure + ' (' + got + '/' + total + ')', L + 12, y);
  y += 24;
  ctx.fillStyle = st && st.exitOpen ? '#2eff8a' : COLORS.muted;
  ctx.fillText((st && st.exitOpen ? '☑ ' : '☐ ') + 'Reach the green EXIT', L + 12, y);
  y += 34;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('GADGETS', L + 12, y);
  y += 24;
  ctx.font = '15px sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('◉ Coins — click to throw', L + 12, y);
  y += 22;
  ctx.fillText('▼ Crouch — SHIFT to hide', L + 12, y);
  y += 22;
  ctx.fillText('✦ Bushes hide you', L + 12, y);
  y += 34;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('EVENT LOG', L + 12, y);
  y += 22;
  ctx.font = '13px sans-serif';
  ctx.fillStyle = COLORS.muted;
  for (const line of game.log.slice(0, 5)) {
    ctx.fillText('· ' + line.slice(0, 28), L + 12, y);
    y += 19;
  }

  // right panel: detection, meters, guards, legend, minimap
  const R = VIEW.w - HUD.right + 8, RW = HUD.right - 16;
  ctx.fillStyle = COLORS.panel;
  roundRect(ctx, R, HUD.top + 8, RW, 560, 10);
  ctx.fill();
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.stroke();
  const det = game.detection || 0;
  const detCol = det >= 100 ? COLORS.alarm : det >= 45 ? COLORS.suspicious : COLORS.calm;
  y = HUD.top + 34;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('DETECTION', R + 12, y);
  ctx.textAlign = 'right';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillStyle = detCol;
  ctx.fillText(Math.round(det) + '%', R + RW - 10, y + 44);
  ctx.textAlign = 'left';
  y += 62;
  bar(ctx, R + 12, y, RW - 24, 20, (game.alarm || 0) / 100, COLORS.alarm, 'ALARM');
  y += 28;
  bar(ctx, R + 12, y, RW - 24, 20, visibilityOf(game) / 100, COLORS.suspicious, 'VISIBILITY');
  y += 28;
  bar(ctx, R + 12, y, RW - 24, 20, (game.noise || 0) / 100, COLORS.calm, 'NOISE');
  y += 40;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('GUARDS', R + 12, y);
  y += 22;
  ctx.font = '14px sans-serif';
  if (st) {
    for (const g of [...st.guards, ...st.dogs]) {
      ctx.fillStyle = coneColor(g.state);
      ctx.beginPath();
      ctx.arc(R + 18, y - 4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.text;
      ctx.fillText(g.name + (g.kind === 'dog' ? ' (dog)' : '') + ' — ' + g.state.toUpperCase(), R + 30, y);
      y += 21;
    }
    for (const cam of st.cameras) {
      ctx.fillStyle = coneColor(cam.state);
      ctx.beginPath();
      ctx.arc(R + 18, y - 4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.text;
      ctx.fillText('Camera — ' + cam.state.toUpperCase(), R + 30, y);
      y += 21;
    }
  }
  y += 10;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('LEGEND', R + 12, y);
  y += 22;
  ctx.font = '13px sans-serif';
  const legend = [
    [COLORS.calm, 'Calm cone — unseen'],
    [COLORS.suspicious, 'Suspicious — hiding?'],
    [COLORS.alarm, 'Alarm — run!'],
  ];
  for (const [c, t] of legend) {
    ctx.fillStyle = c;
    ctx.fillRect(R + 12, y - 10, 14, 10);
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(t, R + 32, y);
    y += 20;
  }
  // minimap
  y += 8;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('MAP', R + 12, y);
  const mx = R + 12, my = y + 8, mw = RW - 24, mh = 118;
  ctx.fillStyle = '#05070d';
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.strokeRect(mx, my, mw, mh);
  if (st) {
    const sx = mw / MAP_COLS, sy = mh / MAP_ROWS;
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        if (isSolid(st.tiles, c, r)) {
          ctx.fillStyle = '#3a4a6e';
          ctx.fillRect(mx + c * sx, my + r * sy, sx, sy);
        }
      }
    }
    for (const t of st.treasures) {
      if (t.taken) continue;
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(mx + t.c * sx, my + t.r * sy, sx, sy);
    }
    for (const g of st.guards) {
      ctx.fillStyle = coneColor(g.state);
      ctx.beginPath();
      ctx.arc(mx + g.x * sx, my + g.y * sy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(mx + st.player.x * sx, my + st.player.y * sy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.exit;
    ctx.fillRect(mx + st.exit.x * sx - 2, my + st.exit.y * sy - 2, 5, 5);
  }
  // bottom hint
  ctx.font = '13px sans-serif';
  ctx.fillStyle = COLORS.muted;
  ctx.fillText('WASD move · SHIFT crouch · click throw coin', 16, VIEW.h - 14);
  ctx.textAlign = 'right';
  ctx.fillText('ENTER next level · R restart', VIEW.w - 16, VIEW.h - 14);
  ctx.textAlign = 'left';
}

function drawTitle(ctx, game) {
  ctx.fillStyle = '#05070d';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  // lantern glow band
  for (let i = 0; i < 7; i++) {
    const x = 120 + i * 170;
    const g = ctx.createRadialGradient(x, 150, 4, x, 150, 130);
    g.addColorStop(0, 'rgba(255,179,71,0.30)');
    g.addColorStop(1, 'rgba(255,179,71,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 130, 20, 260, 260);
    ctx.beginPath();
    ctx.arc(x, 150, 9, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.lantern;
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('SHADOWS OF', VIEW.w / 2, 300);
  ctx.fillStyle = COLORS.gold;
  ctx.fillText('PASAR SENJA', VIEW.w / 2, 372);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = COLORS.muted;
  ctx.fillText('Three heists. One shadow. Never be seen.', VIEW.w / 2, 412);
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = COLORS.calm;
  ctx.fillText('3 heists  ·  13 guards  ·  9 treasures  ·  3 gadgets', VIEW.w / 2, 458);
  // three heist cards
  const cards = [
    ['1 · PASAR MALAM', 'Night Market', 'Keris Pusaka'],
    ['2 · MUSEUM PUSAKA', 'Heritage Gallery', 'Mahkota Senja'],
    ['3 · PELABUHAN SENJA', 'Dusk Harbour', 'Mutiara Pelabuhan'],
  ];
  for (let i = 0; i < 3; i++) {
    const x = VIEW.w / 2 - 480 + i * 330;
    ctx.fillStyle = '#0d1224';
    roundRect(ctx, x, 500, 300, 130, 12);
    ctx.fill();
    ctx.strokeStyle = i === game.selectedLevel ? COLORS.gold : COLORS.panelEdge;
    ctx.lineWidth = i === game.selectedLevel ? 3 : 1.5;
    ctx.stroke();
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(cards[i][0], x + 150, 540);
    ctx.font = '15px sans-serif';
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(cards[i][1], x + 150, 566);
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = COLORS.gold;
    ctx.fillText('◆ ' + cards[i][2], x + 150, 596);
  }
  ctx.font = '18px sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('Click a heist or press ENTER — WASD to move, SHIFT to crouch, click to throw a coin', VIEW.w / 2, 690);
  ctx.fillStyle = COLORS.muted;
  ctx.font = '15px sans-serif';
  ctx.fillText('Ghost bonus +$500 if no guard ever raises the alarm.', VIEW.w / 2, 722);
  ctx.textAlign = 'left';
}

function drawLevelClear(ctx, game) {
  dim(ctx);
  panel(ctx, 'HEIST COMPLETE', LEVELS_META[game.levelIndex].name + ' cleared — ' + LEVELS_META[game.levelIndex].treasure + ' is yours.', 'Loot so far: $' + game.money, 'Press ENTER for the next heist');
}

function drawVictory(ctx, game) {
  ctx.fillStyle = '#05070d';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.textAlign = 'center';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillStyle = COLORS.gold;
  ctx.fillText('ALL THREE HEISTS DONE', VIEW.w / 2, 150);
  ctx.font = '22px sans-serif';
  ctx.fillStyle = game.ghost ? '#2eff8a' : COLORS.text;
  ctx.fillText(game.ghost ? 'GHOST — no one ever saw you.' : 'Seen ' + game.stats.spotted + ' time(s) — the ghost bonus slipped away.', VIEW.w / 2, 192);
  const rows = scoreBreakdown(game);
  let y = 280;
  ctx.font = 'bold 24px sans-serif';
  for (const row of rows) {
    ctx.fillStyle = row.label === 'TOTAL' ? COLORS.gold : COLORS.text;
    ctx.textAlign = 'left';
    ctx.fillText(row.label, VIEW.w / 2 - 260, y);
    ctx.textAlign = 'right';
    ctx.fillText('$' + row.value, VIEW.w / 2 + 260, y);
    y += 52;
    if (row.label === 'Speed bonus') {
      ctx.strokeStyle = COLORS.panelEdge;
      ctx.beginPath();
      ctx.moveTo(VIEW.w / 2 - 260, y - 28);
      ctx.lineTo(VIEW.w / 2 + 260, y - 28);
      ctx.stroke();
    }
  }
  ctx.textAlign = 'center';
  ctx.font = '19px sans-serif';
  ctx.fillStyle = COLORS.muted;
  ctx.fillText('Press ENTER to play again — the night market is always open.', VIEW.w / 2, y + 40);
  ctx.textAlign = 'left';
}

function drawCaught(ctx, game) {
  dim(ctx);
  panel(ctx, 'CAUGHT!', 'A guard closed in — the heist ends here.', 'Loot kept: $' + game.money, 'Press R to try again, ENTER for the title screen');
}

function dim(ctx) {
  ctx.fillStyle = 'rgba(3, 5, 10, 0.72)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
}

function panel(ctx, title, line1, line2, line3) {
  ctx.fillStyle = '#0d1224';
  roundRect(ctx, VIEW.w / 2 - 360, 260, 720, 280, 14);
  ctx.fill();
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText(title, VIEW.w / 2, 330);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(line1, VIEW.w / 2, 382);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(line2, VIEW.w / 2, 428);
  ctx.fillStyle = COLORS.text;
  ctx.font = '18px sans-serif';
  ctx.fillText(line3, VIEW.w / 2, 480);
  ctx.textAlign = 'left';
}

export function render(ctx, game) {
  ctx.clearRect(0, 0, VIEW.w, VIEW.h);
  ctx.fillStyle = '#05070d';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  if (game.screen === 'title') { drawTitle(ctx, game); return; }
  if (game.screen === 'victory') { drawVictory(ctx, game); return; }
  if (!game.state) return;
  drawWorld(ctx, game);
  drawHud(ctx, game);
  if (game.screen === 'levelclear') drawLevelClear(ctx, game);
  if (game.screen === 'caught') drawCaught(ctx, game);
}
