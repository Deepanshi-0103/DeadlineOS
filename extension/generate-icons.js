/**
 * Pure Node.js PNG icon generator — no external dependencies.
 * Run: node generate-icons.js
 */
const zlib = require("zlib");
const fs   = require("fs");
const path = require("path");

/* ── CRC32 ──────────────────────────────────────────────────────── */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/* ── PNG builder ────────────────────────────────────────────────── */
function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

function createPNG(size, pixelFn) {
  // Raw scanlines: filter byte (0) + RGB per pixel
  const raw = Buffer.alloc(size * (1 + size * 3));
  let pos = 0;
  for (let y = 0; y < size; y++) {
    raw[pos++] = 0; // filter = None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelFn(x, y, size);
      raw[pos++] = r; raw[pos++] = g; raw[pos++] = b;
    }
  }

  const sig   = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr  = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ── Draw the icon ──────────────────────────────────────────────── */
function deadlineOsPixel(x, y, size) {
  const cx = size / 2, cy = size / 2, r = size / 2;
  const rr = size * 0.18;                  // corner radius

  // Rounded-rect test
  const dx = Math.max(Math.abs(x + 0.5 - cx) - (r - rr), 0);
  const dy = Math.max(Math.abs(y + 0.5 - cy) - (r - rr), 0);
  if (dx * dx + dy * dy > rr * rr) return [245, 246, 248]; // outside

  // Background gradient: coral (#E3542F) → amber (#F0A500)
  const t  = (x + y) / (size * 2 - 2);
  const bg = [
    Math.round(227 + (240 - 227) * t),
    Math.round(84  + (165 -  84) * t),
    Math.round(47  + (  0 -  47) * t),
  ];

  // Draw letter "D" as a simple white shape
  const lx = (x + 0.5 - size * 0.24) / size;  // normalised letter coords
  const ly = (y + 0.5 - size * 0.17) / size;
  const lw = 0.5, lh = 0.64;

  if (lx >= 0 && lx <= lw && ly >= 0 && ly <= lh) {
    const thick = 0.09;
    // Left vertical stroke
    if (lx < thick) return [255, 255, 255];
    // Top horizontal stroke
    if (ly < thick && lx < 0.35) return [255, 255, 255];
    // Bottom horizontal stroke
    if (ly > lh - thick && lx < 0.35) return [255, 255, 255];
    // Right curve of D
    const cx2 = 0.35, cy2 = lh / 2;
    const rdx = lx - cx2, rdy = ly - cy2;
    const dist = Math.sqrt(rdx * rdx + rdy * rdy);
    if (dist >= lh * 0.42 - thick * 1.2 && dist <= lh * 0.42 && lx > cx2 - 0.02) return [255, 255, 255];
  }

  return bg;
}

/* ── Write files ────────────────────────────────────────────────── */
const iconsDir = path.join(__dirname, "icons");
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

for (const size of [16, 48, 128]) {
  const png = createPNG(size, deadlineOsPixel);
  const out = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(out, png);
  console.log(`✓  icons/icon${size}.png  (${png.length} bytes)`);
}
console.log("Done! Icons generated.");
