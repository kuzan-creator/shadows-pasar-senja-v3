// Shadows of Pasar Senja — the three heists: maps, patrols, cameras, dogs.
// Every map is 21 x 18 tiles. Legend:
//   # wall   K kiosk (wall)   X container (wall)   . floor   R red carpet (floor)
//   B bush (hides you)   L lantern (warm light pool)   E exit   T named treasure
//   o gold coin (+$200)   C security camera   W tripwire   D guard dog
//   P player start. Guards patrol between tile waypoints listed below.
import { MAP_COLS, MAP_ROWS } from './config.js';

const L1 = [
  '#####################',
  '#P....K.....K......E#',
  '#.....K..B..K...T...#',
  '#..L..K.....K.......#',
  '#.....KKKKKKK...#...#',
  '#.........o.........#',
  '#..K.....K.....K....#',
  '#..K..B..K..L..K...o#',
  '#..K.....K.....K....#',
  '#.....KKKKK.....#...#',
  '#...................#',
  '#.K.....K...B....K..#',
  '#.K..T..K........K..#',
  '#.K.....K...L....K..#',
  '#..KKKKKK....KKKK...#',
  '#...................#',
  '#.oB....L....T......#',
  '#####################',
];

const L2 = [
  '#####################',
  '#P....#......#.....E#',
  '#..R..#..T...#..C...#',
  '#..R..#......#......#',
  '#..R....WWWW....#...#',
  '#...................#',
  '#....RRRRRRRRR......#',
  '#.o..R.......R..B...#',
  '#....R...T...R......#',
  '#....R.......R..C...#',
  '#....RRRRRRRRR......#',
  '#...................#',
  '#..K....#.....#..T..#',
  '#..K....#..L..#.....#',
  '#..K....WWWW........#',
  '#...................#',
  '#..B....L....o......#',
  '#####################',
];

const L3 = [
  '#####################',
  '#P....X.....X......E#',
  '#.....X..D..X...T...#',
  '#..L..X.....X.......#',
  '#.....XXXXXXX...#...#',
  '#...................#',
  '#..X.....X.....X....#',
  '#..X..B..X..D..X....#',
  '#..X.....X.....X....#',
  '#.....XXXXX.....#...#',
  '#.o.................#',
  '#.X.....X...B....X..#',
  '#.X..T..X........X..#',
  '#.X.....X...L....X..#',
  '#..XXXXX.....XXXX...#',
  '#...................#',
  '#..B....L....T...o..#',
  '#####################',
];

// Patrol waypoints are [col, row] tile pairs on floor tiles.
export const LEVELS = [
  {
    map: L1,
    guards: [
      { name: 'Bimo', waypoints: [[2, 5], [18, 5]] },
      { name: 'Sari', waypoints: [[16, 1], [16, 3]] },
      { name: 'Agus', waypoints: [[2, 10], [18, 10]] },
      { name: 'Dewi', waypoints: [[18, 15], [2, 15]] },
    ],
    cameras: [],
    dogs: [],
    tripwires: [],
    par: 150,
  },
  {
    map: L2,
    guards: [
      { name: 'Raka', waypoints: [[2, 5], [18, 5]] },
      { name: 'Laras', waypoints: [[18, 11], [2, 11]] },
      { name: 'Bimo', waypoints: [[10, 1], [10, 3]] },
      { name: 'Sari', waypoints: [[5, 15], [15, 15]] },
      { name: 'Tono', waypoints: [[18, 7], [18, 9]] },
    ],
    cameras: [
      { at: [16, 2], sweep: [-0.4, 1.9] },
      { at: [16, 9], sweep: [1.9, 3.6] },
    ],
    dogs: [],
    tripwires: [[8, 4], [9, 4], [10, 4], [11, 4], [8, 14], [9, 14], [10, 14], [11, 14]],
    par: 180,
  },
  {
    map: L3,
    guards: [
      { name: 'Joko', waypoints: [[2, 5], [18, 5]] },
      { name: 'Mira', waypoints: [[18, 10], [2, 10]] },
      { name: 'Bimo', waypoints: [[10, 15], [18, 15]] },
      { name: 'Sari', waypoints: [[16, 1], [16, 3]] },
    ],
    cameras: [],
    dogs: [
      { name: 'Kala', at: [9, 2], waypoints: [[7, 2], [11, 2]] },
      { name: 'Rimba', at: [12, 7], waypoints: [[11, 7], [14, 7]] },
    ],
    tripwires: [],
    par: 210,
  },
];

// Turn a raw map into tiles plus the entities sitting on it.
export function parseLevel(index) {
  const def = LEVELS[index];
  const tiles = [];
  const lanterns = [];
  const treasures = [];
  const coins = [];
  const bushes = [];
  let player = { x: 1.5, y: 1.5 };
  let exit = { x: 19.5, y: 1.5 };
  for (let r = 0; r < MAP_ROWS; r++) {
    const row = [];
    for (let c = 0; c < MAP_COLS; c++) {
      const ch = (def.map[r] && def.map[r][c]) || '#';
      let kind = 'floor';
      if (ch === '#') kind = 'wall';
      else if (ch === 'K') kind = 'kiosk';
      else if (ch === 'X') kind = 'container';
      else if (ch === 'R') kind = 'carpet';
      else if (ch === 'B') { kind = 'bush'; bushes.push({ c, r }); }
      else if (ch === 'L') { kind = 'floor'; lanterns.push({ c, r }); }
      else if (ch === 'E') { kind = 'exit'; exit = { x: c + 0.5, y: r + 0.5 }; }
      else if (ch === 'T') { kind = 'floor'; treasures.push({ c, r, taken: false }); }
      else if (ch === 'o') { kind = 'floor'; coins.push({ c, r, taken: false }); }
      else if (ch === 'C' || ch === 'W' || ch === 'D') kind = 'floor';
      else if (ch === 'P') { kind = 'floor'; player = { x: c + 0.5, y: r + 0.5 }; }
      row.push(kind);
    }
    tiles.push(row);
  }
  return { def, tiles, lanterns, treasures, coins, bushes, player, exit };
}

export function isSolid(tiles, c, r) {
  if (c < 0 || r < 0 || c >= MAP_COLS || r >= MAP_ROWS) return true;
  const k = tiles[r][c];
  return k === 'wall' || k === 'kiosk' || k === 'container';
}

// Line of sight on the tile grid (Bresenham): true when no solid tile blocks the ray.
export function hasLineOfSight(tiles, ax, ay, bx, by) {
  let x0 = Math.floor(ax), y0 = Math.floor(ay);
  const x1 = Math.floor(bx), y1 = Math.floor(by);
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (let guard = 0; guard < 64; guard++) {
    if (x0 === x1 && y0 === y1) return true;
    if (isSolid(tiles, x0, y0) && !(x0 === Math.floor(ax) && y0 === Math.floor(ay))) return false;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
  return true;
}
