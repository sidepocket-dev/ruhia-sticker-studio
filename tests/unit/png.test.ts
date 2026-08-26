import { describe, expect, it } from 'vitest';
import { decode } from 'fast-png';
import { encodePng } from '../../src/core/image/png.js';
import { PNG_COLOR_TYPE_RGBA, readPngInfo } from '../../src/core/line/png-info.js';
import { LINE_STATIC_STICKER_SPEC } from '../../src/config/line-spec.js';
import type { PixelBuffer } from '../../src/core/image/types.js';

/** 決まった模様の画像を作る（乱数を使わないので結果が毎回同じ） */
function pattern(width: number, height: number): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const inside = x > width / 4 && x < (width * 3) / 4 && y > height / 4 && y < (height * 3) / 4;
      data[i] = (x * 7) % 256;
      data[i + 1] = (y * 13) % 256;
      data[i + 2] = (x * y) % 256;
      data[i + 3] = inside ? 250 : 0;
    }
  }
  return { data, width, height };
}

describe('PNGの書き出し', () => {
  it('LINEが求める形式で書き出す', () => {
    const info = readPngInfo(encodePng(pattern(40, 24)));
    expect(info).toEqual({
      width: 40,
      height: 24,
      bitDepth: 8,
      colorType: PNG_COLOR_TYPE_RGBA,
    });
  });

  it('画素が1つも変わらずに復元できる', () => {
    const source = pattern(64, 48);
    const decoded = decode(encodePng(source));

    expect(decoded.width).toBe(64);
    expect(decoded.height).toBe(48);
    expect(decoded.channels).toBe(4);
    expect(Array.from(decoded.data)).toEqual(Array.from(source.data));
  });

  it('透明な部分が透明のまま残る', () => {
    const source = pattern(32, 32);
    const decoded = decode(encodePng(source));
    let transparent = 0;
    for (let i = 3; i < decoded.data.length; i += 4) if (decoded.data[i] === 0) transparent++;
    expect(transparent).toBeGreaterThan(0);
  });

  it.each([
    [1, 1],
    [2, 2],
    [1, 100],
    [100, 1],
    [370, 320],
  ])('%i x %i でも正しく書き出せる', (width, height) => {
    const source = pattern(width, height);
    const decoded = decode(encodePng(source));
    expect(decoded.width).toBe(width);
    expect(decoded.height).toBe(height);
    expect(Array.from(decoded.data)).toEqual(Array.from(source.data));
  });

  it('全体が透明でも書き出せる', () => {
    const source: PixelBuffer = { data: new Uint8ClampedArray(20 * 20 * 4), width: 20, height: 20 };
    const decoded = decode(encodePng(source));
    expect(decoded.width).toBe(20);
    expect(Array.from(decoded.data).every((value) => value === 0)).toBe(true);
  });

  it('同じ入力からは必ず同じバイト列になる', () => {
    const source = pattern(30, 30);
    expect(Array.from(encodePng(source))).toEqual(Array.from(encodePng(source)));
  });

  it('スタンプ1枚がLINEの容量制限に十分収まる', () => {
    // 実際のキャンバス出力と同じく、透明な部分はRGBも0になる
    const source = pattern(370, 320);
    for (let i = 0; i < source.data.length; i += 4) {
      if (source.data[i + 3] === 0) {
        source.data[i] = 0;
        source.data[i + 1] = 0;
        source.data[i + 2] = 0;
      }
    }

    const bytes = encodePng(source);
    expect(bytes.byteLength).toBeLessThan(LINE_STATIC_STICKER_SPEC.sticker.maxBytes);

    // 全面が不透明な同じ大きさの画像より小さい（フィルタと圧縮が効いている）
    const dense: PixelBuffer = {
      data: new Uint8ClampedArray(pattern(370, 320).data),
      width: 370,
      height: 320,
    };
    for (let i = 3; i < dense.data.length; i += 4) dense.data[i] = 255;
    expect(bytes.byteLength).toBeLessThan(encodePng(dense).byteLength);
  });
});
