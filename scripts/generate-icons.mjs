import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(projectRoot, "public/icons");
mkdirSync(outputDir, { recursive: true });

for (const size of [192, 512, 1024]) {
  const pixels = new Uint8Array(size * size * 4);
  const scale = size / 512;

  fill(pixels, size, [238, 242, 244, 255]);
  fillRect(pixels, size, 96, 96, 320, 320, [223, 230, 232, 255], scale);
  for (const offset of [96, 176, 256, 336, 416]) {
    fillRect(pixels, size, offset, 96, 3, 320, [195, 207, 211, 255], scale);
    fillRect(pixels, size, 96, offset, 320, 3, [195, 207, 211, 255], scale);
  }

  drawThickLine(pixels, size, 136, 377, 180, 334, 30, [30, 101, 122, 255], scale);
  drawThickLine(pixels, size, 180, 334, 207, 260, 30, [30, 101, 122, 255], scale);
  drawThickLine(pixels, size, 207, 260, 250, 230, 30, [30, 101, 122, 255], scale);
  drawThickLine(pixels, size, 250, 230, 318, 241, 30, [30, 101, 122, 255], scale);
  drawThickLine(pixels, size, 318, 241, 375, 164, 30, [30, 101, 122, 255], scale);

  drawCircle(pixels, size, 136, 377, 38, [255, 255, 255, 255], scale);
  drawCircle(pixels, size, 136, 377, 27, [125, 211, 252, 255], scale);

  drawTriangle(pixels, size, [318, 184], [432, 184], [375, 314], [249, 115, 22, 255], scale);
  drawCircle(pixels, size, 375, 177, 66, [255, 255, 255, 255], scale);
  drawCircle(pixels, size, 375, 177, 54, [249, 115, 22, 255], scale);
  drawCircle(pixels, size, 375, 177, 20, [255, 255, 255, 255], scale);

  writeFileSync(resolve(outputDir, `icon-${size}.png`), encodePng(size, size, pixels, size === 1024));
}

function fill(pixels, size, color) {
  for (let offset = 0; offset < pixels.length; offset += 4) pixels.set(color, offset);
}

function fillRect(pixels, size, x, y, width, height, color, scale) {
  const x1 = Math.max(0, Math.round(x * scale));
  const y1 = Math.max(0, Math.round(y * scale));
  const x2 = Math.min(size, Math.round((x + width) * scale));
  const y2 = Math.min(size, Math.round((y + height) * scale));
  for (let py = y1; py < y2; py++) {
    for (let px = x1; px < x2; px++) setPixel(pixels, size, px, py, color);
  }
}

function drawCircle(pixels, size, centerX, centerY, radius, color, scale) {
  const cx = centerX * scale;
  const cy = centerY * scale;
  const r = radius * scale;
  const minX = Math.max(0, Math.floor(cx - r));
  const maxX = Math.min(size - 1, Math.ceil(cx + r));
  const minY = Math.max(0, Math.floor(cy - r));
  const maxY = Math.min(size - 1, Math.ceil(cy + r));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r ** 2) setPixel(pixels, size, x, y, color);
    }
  }
}

function drawThickLine(pixels, size, x1, y1, x2, y2, width, color, scale) {
  const startX = x1 * scale;
  const startY = y1 * scale;
  const endX = x2 * scale;
  const endY = y2 * scale;
  const steps = Math.max(1, Math.ceil(Math.hypot(endX - startX, endY - startY) * 1.4));
  for (let index = 0; index <= steps; index++) {
    const progress = index / steps;
    drawCircle(
      pixels,
      size,
      (startX + (endX - startX) * progress) / scale,
      (startY + (endY - startY) * progress) / scale,
      width / 2,
      color,
      scale,
    );
  }
}

function drawTriangle(pixels, size, a, b, c, color, scale) {
  const points = [a, b, c].map(([x, y]) => [x * scale, y * scale]);
  const minX = Math.max(0, Math.floor(Math.min(...points.map(([x]) => x))));
  const maxX = Math.min(size - 1, Math.ceil(Math.max(...points.map(([x]) => x))));
  const minY = Math.max(0, Math.floor(Math.min(...points.map(([, y]) => y))));
  const maxY = Math.min(size - 1, Math.ceil(Math.max(...points.map(([, y]) => y))));
  const [pa, pb, pc] = points;
  const area = edge(pa, pb, pc);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const point = [x, y];
      const w1 = edge(pb, pc, point);
      const w2 = edge(pc, pa, point);
      const w3 = edge(pa, pb, point);
      if (area >= 0 ? w1 >= 0 && w2 >= 0 && w3 >= 0 : w1 <= 0 && w2 <= 0 && w3 <= 0) {
        setPixel(pixels, size, x, y, color);
      }
    }
  }
}

function edge([ax, ay], [bx, by], [px, py]) {
  return (px - ax) * (by - ay) - (py - ay) * (bx - ax);
}

function setPixel(pixels, size, x, y, color) {
  pixels.set(color, (y * size + x) * 4);
}

function encodePng(width, height, pixels, stripAlpha = false) {
  const channels = stripAlpha ? 3 : 4;
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    if (stripAlpha) {
      for (let x = 0; x < width; x++) {
        const sourceOffset = (y * width + x) * 4;
        const targetOffset = y * (stride + 1) + 1 + x * 3;
        raw[targetOffset] = pixels[sourceOffset];
        raw[targetOffset + 1] = pixels[sourceOffset + 1];
        raw[targetOffset + 2] = pixels[sourceOffset + 2];
      }
    } else {
      Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", Buffer.concat([uint32(width), uint32(height), Buffer.from([8, stripAlpha ? 2 : 6, 0, 0, 0])])),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  return Buffer.concat([uint32(data.length), typeBuffer, data, uint32(crc32(Buffer.concat([typeBuffer, data])))]);
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
