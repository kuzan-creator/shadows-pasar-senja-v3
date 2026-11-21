// Shadows of Pasar Senja — the hand-in program for make.fun's best stealth game bounty.
//
// The game itself is plain static files under game/ (index.html plus ES modules, no
// build step, no network), and four screenshots under screenshots/. This program
// gathers exactly those two folders into the output directory and writes
// dossier.json with the kit's vendored buildDossier, so the sealed scorer can
// check the entry and the judge can read it.
//
// It runs on Node 22 with the standard library only, from any working directory:
// every path is resolved from this file's own folder, and the output directory
// comes from MAKEFUN_OUTPUT_DIR (the grader's /output by default). It only ever
// creates directories and copies files in — it never deletes, unlinks or chmods
// anything under the output directory, because on the grader that directory can
// be a bind-mount.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');

if (!existsSync(join(gameDir, 'index.html'))) {
  throw new Error('game/index.html is missing next to main.ts');
}
if (!existsSync(shotsDir) || readdirSync(shotsDir).filter((f) => !f.startsWith('.')).length < 3) {
  throw new Error('screenshots/ needs at least 3 images next to main.ts');
}

mkdirSync(outDir, { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
for (const name of readdirSync(shotsDir).sort()) {
  if (name.startsWith('.')) continue;
  cpSync(join(shotsDir, name), join(outDir, 'screenshots', name));
}

writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
