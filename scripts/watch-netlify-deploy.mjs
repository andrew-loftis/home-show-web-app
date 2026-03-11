import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();

const IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  '.netlify',
  'dist',
  'build'
]);

const WATCH_EXTS = new Set([
  '.html',
  '.js',
  '.mjs',
  '.css',
  '.json',
  '.toml',
  '.txt',
  '.md',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.ico'
]);

let deployInFlight = false;
let pendingDeploy = false;
let debounceTimer = null;

function shouldIgnore(fullPath) {
  const rel = path.relative(PROJECT_ROOT, fullPath);
  if (!rel || rel.startsWith('..')) return true;

  const parts = rel.split(path.sep);
  if (parts.some(p => IGNORE_DIRS.has(p))) return true;

  const ext = path.extname(fullPath).toLowerCase();
  if (ext && !WATCH_EXTS.has(ext)) return true;

  return false;
}

function runNetlifyDeploy() {
  return new Promise((resolve, reject) => {
    const args = ['deploy', '--prod', '--dir', '.'];
    const child = spawn('netlify', args, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      shell: true
    });

    child.on('exit', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`netlify deploy exited with code ${code}`));
    });
  });
}

async function deployNow() {
  if (deployInFlight) {
    pendingDeploy = true;
    return;
  }

  deployInFlight = true;
  pendingDeploy = false;

  const started = new Date();
  console.log(`\n[watch-deploy] Deploying to Netlify prod… (${started.toLocaleTimeString()})`);

  try {
    await runNetlifyDeploy();
    const ended = new Date();
    const seconds = Math.max(1, Math.round((ended.getTime() - started.getTime()) / 1000));
    console.log(`[watch-deploy] Deploy complete in ~${seconds}s`);
  } catch (e) {
    console.error('[watch-deploy] Deploy failed:', e?.message || e);
  } finally {
    deployInFlight = false;
    if (pendingDeploy) {
      console.log('[watch-deploy] Changes queued during deploy; redeploying…');
      await deployNow();
    }
  }
}

function scheduleDeploy(changedPath) {
  if (shouldIgnore(changedPath)) return;

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void deployNow();
  }, 750);
}

function watchDir(dir) {
  fs.watch(dir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    const fullPath = path.join(dir, filename);
    scheduleDeploy(fullPath);
  });
}

console.log('[watch-deploy] Watching for changes…');
console.log('[watch-deploy] Running: netlify deploy --prod --dir .');
console.log('[watch-deploy] Press Ctrl+C to stop.');

watchDir(PROJECT_ROOT);
