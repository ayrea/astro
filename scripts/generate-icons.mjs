import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "..", "public");

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type);
  const crcInput = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function createPng(size) {
  const background = { r: 5, g: 8, b: 20 };
  const star = { r: 248, g: 250, b: 252 };
  const rows = [];

  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0;
    for (let x = 0; x < size; x += 1) {
      const dx = x - size / 2;
      const dy = y - size / 2;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const inCircle = distance <= size * 0.42;
      const inStar =
        (Math.abs(dx) < size * 0.04 && Math.abs(dy) < size * 0.22) ||
        (Math.abs(dy) < size * 0.04 && Math.abs(dx) < size * 0.22) ||
        (Math.abs(dx - dy) < size * 0.035 && distance < size * 0.16) ||
        (Math.abs(dx + dy) < size * 0.035 && distance < size * 0.16);

      const color = inStar
        ? star
        : inCircle
          ? background
          : { r: 30, g: 41, b: 75 };
      const offset = 1 + x * 3;
      row[offset] = color.r;
      row[offset + 1] = color.g;
      row[offset + 2] = color.b;
    }
    rows.push(row);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(Buffer.concat(rows));
  return Buffer.concat([
    signature,
    createChunk("IHDR", ihdr),
    createChunk("IDAT", compressed),
    createChunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const outputPath = path.join(publicDir, `pwa-${size}x${size}.png`);
  fs.writeFileSync(outputPath, createPng(size));
  console.log(`Wrote ${outputPath}`);
}
