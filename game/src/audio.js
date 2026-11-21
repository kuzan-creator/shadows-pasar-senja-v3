// Shadows of Pasar Senja — tiny WebAudio blips (no files, no network).
// Everything is guarded: no context exists until the player first interacts.
let ctx = null;
export function ensureAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* audio is garnish; the game plays without it */ }
}
function blip(freq, dur, type, gain) {
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain || 0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  } catch { /* ignore */ }
}
export const sfx = {
  coin() { blip(1320, 0.12, 'sine', 0.07); setTimeout(() => blip(1760, 0.16, 'sine', 0.06), 70); },
  alarm() { blip(220, 0.35, 'sawtooth', 0.05); setTimeout(() => blip(180, 0.35, 'sawtooth', 0.05), 160); },
  treasure() { [660, 880, 1320].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'triangle', 0.07), i * 90)); },
  caught() { blip(110, 0.5, 'sawtooth', 0.08); },
};
