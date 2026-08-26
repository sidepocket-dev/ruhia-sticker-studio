/**
 * 抽出結果を目で確かめるための開発用スクリプト。
 *
 *   npx vite-node scripts/preview-extraction.ts sheet-a.png
 *
 * tests/fixtures/ の画像を読み、抽出した9個をコンタクトシートとして書き出す。
 * 不変条件（取りこぼし・重なり）は自動で測れるが、「装飾が正しいスタンプに
 * ついているか」は人の目でしか判断できないため、その確認に使う。
 */
import { writeFileSync } from 'node:fs';
import { encode } from 'fast-png';
import { DEFAULT_DETECT_OPTIONS, detectStickers } from '../src/core/image/detect.js';
import type { StickerRegion } from '../src/core/image/types.js';
import { loadPng } from '../tests/helpers/png.js';
import { checkInvariants } from '../tests/helpers/invariants.js';
import type { PixelBuffer } from '../src/core/image/types.js';

const CELL = 340;

function contactSheet(buffer: PixelBuffer, regions: StickerRegion[], path: string): void {
  const columns = 3;
  const rows = Math.ceil(regions.length / columns);
  const width = CELL * columns;
  const height = CELL * rows;
  const out = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const checker = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0 ? 236 : 208;
      out[i] = checker;
      out[i + 1] = checker;
      out[i + 2] = checker;
      out[i + 3] = 255;
    }
  }

  regions.forEach((region, index) => {
    const b = region.bounds;
    const scale = Math.min(CELL / b.width, CELL / b.height) * 0.94;
    const dw = Math.round(b.width * scale);
    const dh = Math.round(b.height * scale);
    const ox = (index % columns) * CELL + Math.round((CELL - dw) / 2);
    const oy = Math.floor(index / columns) * CELL + Math.round((CELL - dh) / 2);

    for (let y = 0; y < dh; y++) {
      for (let x = 0; x < dw; x++) {
        const sx = b.x + Math.floor(x / scale);
        const sy = b.y + Math.floor(y / scale);
        const si = (sy * buffer.width + sx) * 4;
        const alpha = (buffer.data[si + 3] ?? 0) / 255;
        const di = ((oy + y) * width + (ox + x)) * 4;
        for (let channel = 0; channel < 3; channel++) {
          const src = buffer.data[si + channel] ?? 0;
          const dst = out[di + channel] ?? 0;
          out[di + channel] = Math.round(src * alpha + dst * (1 - alpha));
        }
      }
    }

    // 抽出範囲を赤枠で示す
    const paint = (x: number, y: number): void => {
      const di = ((oy + y) * width + (ox + x)) * 4;
      out[di] = 220;
      out[di + 1] = 40;
      out[di + 2] = 40;
    };
    for (let x = 0; x < dw; x++) { paint(x, 0); paint(x, dh - 1); }
    for (let y = 0; y < dh; y++) { paint(0, y); paint(dw - 1, y); }
  });

  writeFileSync(path, encode({ width, height, data: out, channels: 4, depth: 8 }));
}

for (const name of process.argv.slice(2)) {
  const buffer = loadPng(`tests/fixtures/${name}`);
  const outcome = detectStickers(buffer);

  if (!outcome.ok) {
    console.log(`${name}: 単純分割では抽出できません (${outcome.reason})`);
    continue;
  }

  const report = checkInvariants(buffer, outcome.result.regions, DEFAULT_DETECT_OPTIONS.alphaThreshold);
  const out = `preview-${name}`;
  contactSheet(buffer, outcome.result.regions, out);
  console.log(
    `${name}: ${outcome.result.regions.length}個  ` +
      `取りこぼし ${((1 - report.coverage) * 100).toFixed(4)}%  重なり ${report.overlapArea}px  → ${out}`,
  );
}
