import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '../public/icons');
fs.mkdirSync(dir, { recursive: true });

// Minimal valid 1x1 PNG — browsers accept; replace with real brand icons later
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);
fs.writeFileSync(path.join(dir, 'icon-192.png'), png);
fs.writeFileSync(path.join(dir, 'icon-512.png'), png);
console.log('icons written');
