// Vice City Platinum Path — the hand-in program for the gta6-trophy-guide-01 bounty.
//
// The guide itself is the static web app under app/ (index.html, style.css, app.js and
// data/trophies.json): plain files a desktop browser opens with the network off. This
// program's whole job is to hand that app in the way the bounty asks: copy app/ and
// screenshots/ into the output directory, then write dossier.json — the summary the
// judge reads (the screenshots, the first load's files and bytes, and the source
// outline) — with the kit's vendored library, vendor/makefun-frontend.ts, untouched,
// because the scorer rebuilds the dossier with its own copy and compares byte for byte.
//
// Before anything is copied, the program checks the entry against the caps the gate
// enforces, so a broken hand-in fails here with words instead of failing silently at
// the scorer: at most 4 screenshots, each a PNG or JPEG of at most 256 KiB, and a
// trophies.json that names trophies and gives every one a non-blank guide.
//
// Run it the way the grader does (Node 22, standard library only, no network):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// MAKEFUN_OUTPUT_DIR stands in for /output outside the grader's container.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's caps, as the kit's RULES.txt states them.
const SCREENSHOT_MAX = 4;
const SCREENSHOT_MAX_BYTES = 256 * 1024;
const APP_MAX_FILES = 993;
const APP_MAX_BYTES = 48 * 1024 * 1024;
const DOSSIER_TEXT_MAX_BYTES = 163_840;

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

function checkScreenshots(dir: string): void {
  if (!existsSync(dir)) fail('screenshots/ is missing: the entry needs 3 or 4 screenshots of the guide');
  const shots = readdirSync(dir).filter((name) => !name.startsWith('.'));
  if (shots.length < 3 || shots.length > SCREENSHOT_MAX) {
    fail(`screenshots/ holds ${shots.length} files: the gate takes 3 to ${SCREENSHOT_MAX}`);
  }
  for (const name of shots) {
    const path = join(dir, name);
    const { size } = statSync(path);
    if (size > SCREENSHOT_MAX_BYTES) fail(`screenshots/${name} is ${size} bytes: the cap is ${SCREENSHOT_MAX_BYTES}`);
    const head = readFileSync(path).subarray(0, 3);
    const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e;
    const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    if (!isPng && !isJpeg) fail(`screenshots/${name} is neither a PNG nor a JPEG`);
  }
}

function checkTrophyData(appDir: string): void {
  const path = join(appDir, 'data', 'trophies.json');
  if (!existsSync(path)) fail('app/data/trophies.json is missing');
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  const list = Array.isArray(parsed) ? parsed : parsed.trophies;
  if (!Array.isArray(list) || list.length === 0) fail('app/data/trophies.json holds no trophies array');
  for (const item of list) {
    if (typeof item?.name !== 'string' || item.name.trim() === '') fail('a trophy in trophies.json has no name');
    if (typeof item?.guide !== 'string' || item.guide.trim() === '') {
      fail(`trophy "${item?.name}" has a blank guide: every trophy needs one`);
    }
  }
}

function checkAppSize(appDir: string): void {
  let files = 0;
  let bytes = 0;
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      const stat = statSync(path);
      if (stat.isDirectory()) walk(path);
      else {
        files += 1;
        bytes += stat.size;
      }
    }
  };
  walk(appDir);
  if (files > APP_MAX_FILES) fail(`app/ holds ${files} files: the cap is ${APP_MAX_FILES}`);
  if (bytes > APP_MAX_BYTES) fail(`app/ is ${bytes} bytes: the cap is ${APP_MAX_BYTES}`);
}

// After the hand-in, read the output back: the dossier on disk must be, byte for byte,
// what the library produced (buildDossier hands back the dossier as bytes), and the
// copied tree must hold the app's entry page and every screenshot. The grader runs
// this program twice and compares the two outputs, so a hand-in that verifies itself
// here cannot drift between runs unnoticed.
function verifyHandIn(expectedDossier: Uint8Array): void {
  const written = readFileSync(join(outputDir, 'dossier.json'));
  const same =
    written.length === expectedDossier.length && written.every((byte, i) => byte === expectedDossier[i]);
  if (!same) fail('dossier.json on disk differs from what buildDossier produced');
  if (!existsSync(join(outputDir, 'app', 'index.html'))) fail('the output is missing app/index.html');
  const shots = readdirSync(join(outputDir, 'screenshots')).filter((name) => !name.startsWith('.'));
  if (shots.length < 3) fail(`the output holds only ${shots.length} screenshots`);
}

function handIn(): void {
  const appDir = join(repoRoot, 'app');
  const shotsDir = join(repoRoot, 'screenshots');
  checkScreenshots(shotsDir);
  checkTrophyData(appDir);
  checkAppSize(appDir);

  mkdirSync(outputDir, { recursive: true });
  cpSync(appDir, join(outputDir, 'app'), { recursive: true });
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

  const dossier = buildDossier(outputDir, {
    text_max_bytes: DOSSIER_TEXT_MAX_BYTES,
    screenshots: { max: SCREENSHOT_MAX, max_bytes: SCREENSHOT_MAX_BYTES },
    app_max_files: APP_MAX_FILES,
    app_max_bytes: APP_MAX_BYTES,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  verifyHandIn(dossier);
  console.log(`main.ts: handed in app/ and screenshots/ with dossier.json (${dossier.length} bytes) to ${outputDir}`);
}

handIn();
