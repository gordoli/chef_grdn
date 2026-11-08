import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

// Layout is deterministic; the generated portrait remains the single source of truth.
const project = new URL('../', import.meta.url);
const mark = await readFile(new URL('public/brand/chef-grdn-mascot.png', project));
const font = new URL('scripts/assets/Poppins-SemiBold.ttf', project);
const imageUrl = `data:image/png;base64,${mark.toString('base64')}`;
await mkdir(new URL('public/icons/', project), { recursive: true });
function render(svg) {
  return new Resvg(svg, {
    font: { fontFiles: [fileURLToPath(font)], loadSystemFonts: false },
  })
    .render()
    .asPng();
}
function icon(size, background, inset = 0) {
  const inner = size - inset * 2;
  return render(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${background ? `<rect width="100%" height="100%" fill="${background}"/>` : ''}<image href="${imageUrl}" x="${inset}" y="${inset}" width="${inner}" height="${inner}"/></svg>`,
  );
}
for (const size of [32, 48, 64, 192, 512]) {
  await writeFile(new URL(`public/icons/icon-${size}.png`, project), icon(size));
}
await writeFile(new URL('public/icons/apple-touch-icon.png', project), icon(180, '#ffffff', 12));
await writeFile(new URL('public/icons/maskable-512.png', project), icon(512, '#ffffff', 72));
const favicon = icon(48);
const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
icoHeader[6] = 48;
icoHeader[7] = 48;
icoHeader.writeUInt16LE(1, 10);
icoHeader.writeUInt16LE(32, 12);
icoHeader.writeUInt32LE(favicon.length, 14);
icoHeader.writeUInt32LE(22, 18);
await writeFile(new URL('public/favicon.ico', project), Buffer.concat([icoHeader, favicon]));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#ffffff"/><image href="${imageUrl}" x="580" y="135" width="440" height="440"/><text x="800" y="707" text-anchor="middle" font-family="Poppins" font-size="72" font-weight="600" fill="#201b28">Chef GRDN</text></svg>`;
await writeFile(new URL('public/og-image.png', project), render(svg));
console.log('Generated favicon, 7 icon sizes, maskable icon, and 1600×900 social preview.');
