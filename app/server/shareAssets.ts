import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

// Reused by both fixed-canvas share renderers; only local, bundled brand assets enter these promises.
export const shareFont = readFile(join(process.cwd(), 'scripts/assets/Poppins-SemiBold.ttf'));
export const shareMascot = readFile(join(process.cwd(), 'public/brand/chef-grdn-mascot.png'))
  .then((bytes) => sharp(bytes).resize(240, 240, { fit: 'inside' }).png().toBuffer())
  .then((bytes) => `data:image/png;base64,${bytes.toString('base64')}`);
