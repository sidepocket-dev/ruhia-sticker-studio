import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BACKGROUND_OPTIONS,
  removeBackground,
  sampleBackgroundColors,
} from '../../src/core/image/background.js';
import { DEFAULT_PREPARE_OPTIONS, prepareSheet } from '../../src/core/image/prepare.js';
import { DEFAULT_DETECT_OPTIONS } from '../../src/core/image/detect.js';
import { toAlphaMask } from '../../src/core/image/alpha-mask.js';
import type { PixelBuffer } from '../../src/core/image/types.js';
import { loadPng } from '../helpers/png.js';
import { checkInvariants } from '../helpers/invariants.js';

/** 背景色で塗った画像を作る。paint で中身を描く。 */
function makeImage(
  size: number,
  background: (x: number, y: number) => [number, number, number],
  paint?: (x: number, y: number) => [number, number, number] | null,
): PixelBuffer {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const content = paint?.(x, y) ?? null;
      const [r, g, b] = content ?? background(x, y);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { data, width: size, height: size };
}

const alphaAt = (buffer: PixelBuffer, x: number, y: number): number =>
  buffer.data[(y * buffer.width + x) * 4 + 3] ?? 0;

describe('背景色の判定', () => {
  it('画像の縁から背景色を拾う', () => {
    const colors = sampleBackgroundColors(
      makeImage(80, () => [250, 248, 240]),
      DEFAULT_BACKGROUND_OPTIONS,
    );
    expect(colors).toHaveLength(1);
    expect(colors[0]?.[0]).toBeGreaterThan(240);
  });

  it('白と決め打ちしない', () => {
    const colors = sampleBackgroundColors(
      makeImage(80, () => [120, 130, 140]),
      DEFAULT_BACKGROUND_OPTIONS,
    );
    expect(colors[0]).toEqual([120, 130, 140]);
  });

  it('市松模様は2色として拾う', () => {
    // 透過に見せかけた偽の背景。AIが描いてくることがある
    const checker = makeImage(96, (x, y) =>
      (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0 ? [255, 255, 255] : [204, 204, 204],
    );
    const colors = sampleBackgroundColors(checker, DEFAULT_BACKGROUND_OPTIONS);
    expect(colors).toHaveLength(2);
  });
});

describe('背景を抜く', () => {
  it('外側からつながっている背景だけを抜く', () => {
    const image = makeImage(
      60,
      () => [255, 255, 255],
      (x, y) => (x >= 20 && x < 40 && y >= 20 && y < 40 ? [200, 30, 30] : null),
    );
    const { buffer } = removeBackground(image);

    expect(alphaAt(buffer, 2, 2), '外側の背景').toBe(0);
    expect(alphaAt(buffer, 30, 30), '絵の部分').toBe(255);
  });

  it('囲まれた白は残す', () => {
    // キャラクターの中の白（目の白目や白い模様）を消してはいけない
    const image = makeImage(
      60,
      () => [255, 255, 255],
      (x, y) => {
        const inRing = x >= 15 && x < 45 && y >= 15 && y < 45;
        const inHole = x >= 25 && x < 35 && y >= 25 && y < 35;
        if (inHole) return [255, 255, 255];
        if (inRing) return [40, 40, 40];
        return null;
      },
    );
    const { buffer } = removeBackground(image);

    expect(alphaAt(buffer, 2, 2), '外側の白').toBe(0);
    expect(alphaAt(buffer, 30, 30), '囲まれた白').toBe(255);
  });

  it('市松模様の背景も抜ける', () => {
    const image = makeImage(
      96,
      (x, y) => ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0 ? [255, 255, 255] : [204, 204, 204]),
      (x, y) => (x >= 32 && x < 64 && y >= 32 && y < 64 ? [200, 30, 30] : null),
    );
    const result = removeBackground(image);

    expect(alphaAt(result.buffer, 2, 2)).toBe(0);
    expect(alphaAt(result.buffer, 12, 4)).toBe(0);
    expect(alphaAt(result.buffer, 48, 48)).toBe(255);
    expect(result.removedRatio).toBeGreaterThan(0.5);
  });

  it('縁をなじませて、ギザつきを抑える', () => {
    // 透過画像を不透明な背景へ焼き込むと、輪郭に中間色の帯ができる。
    // 中央に絵を置く。縁を占めるのは背景色だけにしておかないと、
    // 絵の色が背景と誤判定される
    const image = makeImage(
      60,
      () => [255, 255, 255],
      (x, y) => {
        const inBox = x >= 16 && x < 44 && y >= 16 && y < 44;
        if (!inBox) return null;
        const inCore = x >= 20 && x < 40 && y >= 20 && y < 40;
        // 白からの距離が約35。許容値26を超え、なじませ幅の中に入る色
        return inCore ? [30, 30, 30] : [235, 235, 235];
      },
    );
    const { buffer } = removeBackground(image);

    expect(alphaAt(buffer, 2, 30), '外側の背景').toBe(0);
    // 背景から2画素までが対象
    for (const x of [16, 17]) {
      const alpha = alphaAt(buffer, x, 30);
      expect(alpha, `x=${x} の透明度`).toBeGreaterThan(0);
      expect(alpha, `x=${x} の透明度`).toBeLessThan(255);
    }
    expect(alphaAt(buffer, 30, 30), '絵の中身').toBe(255);
  });

  it('全部抜けてしまったら知らせる', () => {
    const result = removeBackground(makeImage(60, () => [255, 255, 255]));
    expect(result.removedRatio).toBeGreaterThan(0.97);
    expect(result.warnings).toContain('almost-everything-removed');
  });

  it('明るい背景では、白い縁と紛れる恐れを知らせる', () => {
    const result = removeBackground(
      makeImage(60, () => [255, 255, 255], (x, y) => (x > 30 && y > 30 ? [10, 10, 10] : null)),
    );
    expect(result.warnings).toContain('light-outline-risk');
  });

  it('元の画素を書き換えない', () => {
    const image = makeImage(40, () => [255, 255, 255], (x) => (x > 20 ? [0, 0, 0] : null));
    const before = Array.from(image.data);
    removeBackground(image);
    expect(Array.from(image.data)).toEqual(before);
  });
});

describe('シートの前処理', () => {
  const options = { ...DEFAULT_PREPARE_OPTIONS, allowBackgroundRemoval: true };
  const TH = DEFAULT_DETECT_OPTIONS.alphaThreshold;

  it('すでに透過しているシートには手を出さない', () => {
    const buffer = loadPng(new URL('../fixtures/sheet-1.png', import.meta.url).pathname);
    const result = prepareSheet(buffer, options);

    expect(result.status).toBe('ready');
    expect(result.background, '背景処理は行われない').toBeNull();
    expect(result.buffer, '同じバッファがそのまま返る').toBe(buffer);
  });

  it('背景を抜く許可がないときは、抜かずに知らせる', () => {
    const buffer = loadPng(new URL('../fixtures/sheet-1-white.png', import.meta.url).pathname);
    const result = prepareSheet(buffer, { ...options, allowBackgroundRemoval: false });

    expect(result.status).toBe('needs-background-removal');
    expect(result.outcome).toBeNull();
    expect(result.background).toBeNull();
  });

  it.each([
    ['sheet-1-white.png', '白背景に焼き込んだシート'],
    ['sheet-1-checker.png', '市松模様に焼き込んだシート'],
  ])('%s から9個取り出せる（%s）', (file) => {
    const buffer = loadPng(new URL(`../fixtures/${file}`, import.meta.url).pathname);
    const result = prepareSheet(buffer, options);

    expect(result.status).toBe('ready');
    expect(result.background).not.toBeNull();
    expect(result.outcome?.ok).toBe(true);
    if (!result.outcome?.ok) return;

    expect(result.outcome.result.regions).toHaveLength(9);
    const invariants = checkInvariants(result.buffer, result.outcome.result.regions, TH);
    expect(invariants.coverage).toBeGreaterThanOrEqual(0.995);
    expect(invariants.overlapArea).toBe(0);
  });

  it('抜いた結果が、元の透過画像とおおむね一致する', () => {
    // sheet-1-white.png は sheet-1.png を白背景へ焼き込んだもの。
    // 抜いたあとの形が元にどれだけ近いかを測る。
    // 白いステッカー縁は背景と同じ白でつながっており復元できないため、
    // その分は失われる。縁は生成時のプロンプトで付けてもらう方針とした。
    const original = loadPng(new URL('../fixtures/sheet-1.png', import.meta.url).pathname);
    const flat = loadPng(new URL('../fixtures/sheet-1-white.png', import.meta.url).pathname);

    const originalMask = toAlphaMask(original, TH);
    const result = prepareSheet(flat, options);
    const mask = toAlphaMask(result.buffer, TH);

    let both = 0;
    let onlyOriginal = 0;
    let onlyNew = 0;
    for (let i = 0; i < mask.data.length; i++) {
      const a = originalMask.data[i] === 1;
      const b = mask.data[i] === 1;
      if (a && b) both++;
      else if (a) onlyOriginal++;
      else if (b) onlyNew++;
    }

    // 背景が残っていないこと
    expect(onlyNew / (both + onlyNew), '余分に残った割合').toBeLessThan(0.01);
    // 絵の主要部分は残っていること
    expect(both / (both + onlyOriginal), '元の内容を残せた割合').toBeGreaterThan(0.7);
  });

  it('中身のない画像は失敗として返す', () => {
    const buffer = loadPng(new URL('../fixtures/opaque.png', import.meta.url).pathname);
    const result = prepareSheet(buffer, options);
    expect(result.status).toBe('failed');
  });
});
