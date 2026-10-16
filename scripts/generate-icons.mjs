import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function makePng(size, rFactor) {
  // Cœur bonbon (rose, contour cacao) sur fond crème
  // Équation implicite du cœur : (u² + v² − 1)³ − u²·v³ ≤ 0 (v vers le haut)
  // rFactor 0.3 pour l'icône standard ; 0.26 pour la maskable (contenu dans le
  // cercle de sûreté de rayon 0.4 exigé par la spec maskable)
  const cx = size / 2;
  const cy = size * 0.47;
  const r = size * rFactor;
  const bg = [253, 243, 231];
  const fg = [242, 126, 157];
  const outline = [209, 74, 110];
  const rowLen = size * 3;
  const raw = Buffer.alloc((rowLen + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (rowLen + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const ux = (x - cx) / r;
      const uy = -(y - cy) / r;
      const d = (ux * ux + uy * uy - 1) ** 3 - ux * ux * uy * uy * uy;
      let color = bg;
      if (d <= 0) {
        color = fg;
      } else if (d <= 0.15) {
        color = outline;
      }
      const offset = rowStart + 1 + x * 3;
      raw[offset] = color[0];
      raw[offset + 1] = color[1];
      raw[offset + 2] = color[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(outDir, { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(join(outDir, `icon-${size}.png`), makePng(size, 0.3));
  writeFileSync(join(outDir, `icon-${size}-maskable.png`), makePng(size, 0.26));
  console.log(`icon-${size}.png et icon-${size}-maskable.png générés`);
}
