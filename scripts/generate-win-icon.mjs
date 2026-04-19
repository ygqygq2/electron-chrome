#!/usr/bin/env node
// Assembles public/icons/app.ico from pre-rendered PNG files.
// No external dependencies – uses only Node.js built-ins.
// ICO format: https://en.wikipedia.org/wiki/ICO_(file_format)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.join(__dirname, "../public/icons");

// Sizes to bundle into the ICO (from smallest to largest).
const SIZES = [16, 32, 48, 64, 128, 256];

const pngBuffers = SIZES.map((size) => {
  const file = path.join(ICONS_DIR, `app-${size}.png`);
  const buf = fs.readFileSync(file);
  // Validate PNG signature
  if (buf[0] !== 0x89 || buf[1] !== 0x50) {
    throw new Error(`${file} is not a valid PNG`);
  }
  return buf;
});

//
// ICO file layout:
//   6  bytes  – file header  (reserved=0, type=1, count=N)
//   16*N bytes – directory entries, one per image
//   then each PNG blob in order
//

const N = pngBuffers.length;
const HEADER_SIZE = 6;
const DIR_ENTRY_SIZE = 16;
const dirOffset = HEADER_SIZE + DIR_ENTRY_SIZE * N;

// Calculate byte offsets for each image blob
const offsets = [];
let currentOffset = dirOffset;
for (const buf of pngBuffers) {
  offsets.push(currentOffset);
  currentOffset += buf.length;
}

const header = Buffer.alloc(HEADER_SIZE);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type=1 (icon)
header.writeUInt16LE(N, 4); // count

const dirEntries = pngBuffers.map((buf, i) => {
  const size = SIZES[i];
  const entry = Buffer.alloc(DIR_ENTRY_SIZE);
  // width / height: 0 means 256 in ICO spec
  entry.writeUInt8(size >= 256 ? 0 : size, 0);
  entry.writeUInt8(size >= 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2);  // color count (0 = no palette)
  entry.writeUInt8(0, 3);  // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(buf.length, 8);  // size of image data
  entry.writeUInt32LE(offsets[i], 12); // offset of image data
  return entry;
});

const output = Buffer.concat([header, ...dirEntries, ...pngBuffers]);
const outPath = path.join(ICONS_DIR, "app.ico");
fs.writeFileSync(outPath, output);
console.log(`✓ Written ${outPath} (${(output.length / 1024).toFixed(1)} KB, ${N} sizes)`);
