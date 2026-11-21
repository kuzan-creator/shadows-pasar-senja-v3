// Shadows of Pasar Senja — deterministic staged frames for the four screenshots.
// Every shot is a real render of the game's own code, frozen at one focal moment.
import { loadLevel, logEvent } from './engine.js';

export function stageShot(game, name) {
  game.shot = name;
  game.time = 12.3; // frozen so the treasure pulse and lanterns never vary
  if (name === 'title') {
    game.screen = 'title';
    game.selectedLevel = 0;
    return;
  }
  if (name === 'victory') {
    game.screen = 'victory';
    game.money = 2400;
    game.ghost = true;
    game.time = 342;
    game.stats = { spotted: 0, coinsThrown: 3, loot: 2400, treasures: 9 };
    game.log = ['Keris Pusaka +$600', 'Mahkota Senja +$800', 'Mutiara Pelabuhan +$1000', 'GHOST BONUS +$500!'];
    return;
  }
  if (name === 'cover') {
    loadLevel(game, 0);
    game.screen = 'play';
    game.money = 200;
    game.detection = 62;
    game.alarm = 35;
    game.noise = 40;
    const st = game.state;
    // The player, crouched HIDDEN in the bush; the guard's yellow cone sweeps just past.
    st.player.x = 9.5; st.player.y = 2.5;
    st.player.crouch = true; st.player.hidden = true; st.player.dir = 0;
    const bimo = st.guards[0];
    bimo.x = 11.5; bimo.y = 2.5; bimo.dir = Math.PI; bimo.state = 'suspicious'; bimo.aware = 62;
    const sari = st.guards[1];
    sari.x = 16.5; sari.y = 1.5; sari.dir = Math.PI / 2; sari.state = 'calm'; sari.aware = 0;
    st.treasures[0].taken = true;
    st.treasuresGot = 1;
    st.rings.push({ x: 10.5, y: 3.5, r: 1.8, max: 2.6 });
    st.popups.push({ x: 10.5, y: 4.5, text: '+$200', t: 1.8, color: '#ffd34d' });
    st.alertBubble = { text: 'WHAT WAS THAT?', t: 99 };
    game.log = ['Gold coin pocketed. +$200', 'Bimo is suspicious…', 'Coin tossed — listen…', 'Stay low — cone on you.'];
    return;
  }
  if (name === 'museum') {
    loadLevel(game, 1);
    game.screen = 'play';
    game.money = 800;
    game.detection = 55;
    game.alarm = 28;
    game.noise = 12;
    const st = game.state;
    st.player.x = 10.5; st.player.y = 8.5;
    st.player.crouch = true; st.player.hidden = false; st.player.dir = -Math.PI / 2;
    const raka = st.guards[0];
    raka.x = 14.5; raka.y = 5.5; raka.dir = Math.PI; raka.state = 'suspicious'; raka.aware = 48;
    const cam = st.cameras[0];
    cam.dir = 1.2; cam.state = 'suspicious'; cam.aware = 55;
    st.treasures[0].taken = true;
    st.treasuresGot = 1;
    st.alertBubble = { text: 'Hm… what was that?', t: 99 };
    game.log = ['Mahkota Senja +$800', 'Camera sweeping…', 'Tripwire ahead!', 'Raka is suspicious…'];
    return;
  }
  // Fallback: plain play frame of level 1.
  loadLevel(game, 0);
  game.screen = 'play';
  logEvent(game, 'Heist started — stay unseen.');
}
