import { readFileSync } from 'node:fs';
import { decode } from 'fast-png';
import type { PixelBuffer } from '../../src/core/image/types.js';

/** テスト用にPNGを読み込む。ブラウザ側のデコードは src/platform/decode.ts。 */
export function loadPng(path: string): PixelBuffer {
  const png = decode(readFileSync(path));
  const { width, height, channels } = png;
  const source = png.data;

  if (source instanceof Uint16Array) {
    throw new Error('16bit PNG はテストヘルパーが未対応です');
  }

  // 常にRGBA 4チャンネルへ揃える
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    if (channels === 4) {
      data[i * 4] = source[i * 4] ?? 0;
      data[i * 4 + 1] = source[i * 4 + 1] ?? 0;
      data[i * 4 + 2] = source[i * 4 + 2] ?? 0;
      data[i * 4 + 3] = source[i * 4 + 3] ?? 0;
    } else if (channels === 3) {
      data[i * 4] = source[i * 3] ?? 0;
      data[i * 4 + 1] = source[i * 3 + 1] ?? 0;
      data[i * 4 + 2] = source[i * 3 + 2] ?? 0;
      data[i * 4 + 3] = 255;
    } else {
      const value = source[i * channels] ?? 0;
      data[i * 4] = value;
      data[i * 4 + 1] = value;
      data[i * 4 + 2] = value;
      data[i * 4 + 3] = channels === 2 ? (source[i * 2 + 1] ?? 255) : 255;
    }
  }

  return { data, width, height };
}
