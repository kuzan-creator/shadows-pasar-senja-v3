// Shadows of Pasar Senja — shared constants for the stealth heist.
// One screen, one job: every number the engine and the renderer agree on lives here.
export const VIEW = { w: 1280, h: 800 };
export const HUD = { top: 64, left: 188, right: 192, bottom: 8 };
export const TILE = 40;
export const MAP_COLS = 21;
export const MAP_ROWS = 18;
// Play-field origin inside the canvas (between the two HUD side panels).
export const FIELD = { x: 196, y: 76, w: 868, h: 724 };
export const PLAYER_SPEED = 132;
export const PLAYER_CROUCH_SPEED = 72;
export const GUARD_SPEED = 58;
export const DOG_SPEED = 96;
export const CONE_RANGE = 235;
export const CONE_HALF_ANGLE = 0.61; // ~35 degrees each side
export const COLORS = {
  floor: '#0b0f1e',
  floorAlt: '#0d1224',
  wall: '#1c2438',
  wallTop: '#3a4a6e',
  kiosk: '#241a12',
  kioskTop: '#8a5a22',
  container: '#17252b',
  containerTop: '#2e6f7e',
  carpet: '#3d0f1e',
  bush: '#0e2f1a',
  bushLeaf: '#1d5c33',
  lantern: '#ffb347',
  exit: '#2eff8a',
  gold: '#ffd34d',
  calm: '#7fd4ff',
  suspicious: '#ffd34d',
  alarm: '#ff4d5e',
  player: '#e8ecff',
  panel: 'rgba(8, 12, 26, 0.88)',
  panelEdge: '#2a3550',
  text: '#e8ecff',
  muted: '#93a0c0',
};
export const LEVELS_META = [
  { name: 'PASAR MALAM', sub: 'Night Market', treasure: 'Keris Pusaka', loot: 600 },
  { name: 'MUSEUM PUSAKA', sub: 'Heritage Gallery', treasure: 'Mahkota Senja', loot: 800 },
  { name: 'PELABUHAN SENJA', sub: 'Dusk Harbour', treasure: 'Mutiara Pelabuhan', loot: 1000 },
];
