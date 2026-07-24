import { existsSync, mkdirSync, rmSync, cpSync } from 'fs';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..');
const frontendDir = path.resolve(backendDir, '..', 'frontend');
const frontendOut = path.join(frontendDir, 'out');
const backendDist = path.join(backendDir, 'dist');

console.log('[build] Building frontend…');
const frontendBuild = spawnSync('npm', ['run', 'build'], {
  cwd: frontendDir,
  stdio: 'inherit',
  shell: true,
});
if (frontendBuild.status !== 0) {
  process.exit(frontendBuild.status || 1);
}

if (!existsSync(frontendOut)) {
  console.error('[build] frontend/out not found');
  process.exit(1);
}

console.log('[build] Copying frontend/out → backend/dist');
if (existsSync(backendDist)) {
  rmSync(backendDist, { recursive: true, force: true });
}
mkdirSync(backendDist, { recursive: true });
cpSync(frontendOut, backendDist, { recursive: true });

console.log('[build] Bundling backend server.js');
const esbuild = spawnSync(
  'npx',
  [
    'esbuild',
    'server.ts',
    '--bundle',
    '--platform=node',
    '--format=esm',
    '--packages=external',
    '--outfile=server.js',
  ],
  { cwd: backendDir, stdio: 'inherit', shell: true }
);
if (esbuild.status !== 0) {
  process.exit(esbuild.status || 1);
}

console.log('[build] Done. Production: cd backend && npm start');
