import { describe, expect, it } from 'vitest';
import { encode } from 'fast-png';
import { LINE_STATIC_STICKER_SPEC, stickerFileName } from '../../src/config/line-spec.js';
import { PNG_COLOR_TYPE_RGBA, readPngInfo } from '../../src/core/line/png-info.js';
import { asBytes } from '../../src/core/bytes.js';
import type { Bytes } from '../../src/core/bytes.js';
import { validateExport } from '../../src/core/line/validator.js';
import type { ExportCandidate, ExportedImage } from '../../src/core/line/validator.js';

const SPEC = LINE_STATIC_STICKER_SPEC;

function png(width: number, height: number, channels: 3 | 4 = 4): Bytes {
  const data = new Uint8Array(width * height * channels);
  return asBytes(encode({ width, height, data, channels, depth: 8 }));
}

function image(name: string, width: number, height: number, channels: 3 | 4 = 4): ExportedImage {
  return { name, bytes: png(width, height, channels) };
}

function candidate(overrides: Partial<ExportCandidate> = {}): ExportCandidate {
  const stickers = Array.from({ length: 8 }, (_, i) => image(stickerFileName(i + 1), 240, 320));
  return {
    targetCount: 8,
    stickers,
    main: image('main.png', SPEC.main.width, SPEC.main.height),
    tab: image('tab.png', SPEC.tab.width, SPEC.tab.height),
    totalBytes: 500_000,
    ...overrides,
  };
}

const messages = (c: ExportCandidate): string[] =>
  validateExport(c).issues.map((issue) => issue.message);

describe('PNGヘッダの読み取り', () => {
  it('寸法とカラータイプを読める', () => {
    expect(readPngInfo(png(96, 74))).toEqual({
      width: 96,
      height: 74,
      bitDepth: 8,
      colorType: PNG_COLOR_TYPE_RGBA,
    });
  });

  it('PNGでなければ null', () => {
    expect(readPngInfo(new Uint8Array([1, 2, 3, 4]))).toBeNull();
    expect(readPngInfo(new Uint8Array(40))).toBeNull();
  });
});

describe('書き出し前の確認', () => {
  it('問題がなければ書き出せる', () => {
    const report = validateExport(candidate());
    expect(report.issues).toEqual([]);
    expect(report.canExport).toBe(true);
  });

  it('個数が足りなければ、あと何個必要かを伝える', () => {
    const c = candidate({ stickers: Array.from({ length: 6 }, (_, i) => image(stickerFileName(i + 1), 240, 320)) });
    expect(messages(c)).toContain('8個セットには、あと2個必要です。');
    expect(validateExport(c).canExport).toBe(false);
  });

  it('個数が多ければ、あと何個外すかを伝える', () => {
    const c = candidate({ stickers: Array.from({ length: 10 }, (_, i) => image(stickerFileName(i + 1), 240, 320)) });
    expect(messages(c)).toContain('2個多く選ばれています。あと2個外してください。');
  });

  it('LINEにない個数を拒否する', () => {
    const c = candidate({ targetCount: 12, stickers: Array.from({ length: 12 }, (_, i) => image(stickerFileName(i + 1), 240, 320)) });
    expect(messages(c)).toContain('12個のセットはLINEでは作れません。');
  });

  it('スタンプが大きすぎれば止める', () => {
    const stickers = candidate().stickers;
    stickers[0] = image('01.png', SPEC.sticker.maxWidth + 2, SPEC.sticker.maxHeight);
    expect(messages(candidate({ stickers }))).toContain('01.png（1個目）の画像が大きすぎます。');
  });

  it('サイズが奇数なら止める', () => {
    const stickers = candidate().stickers;
    stickers[2] = image('03.png', 241, 320);
    expect(messages(candidate({ stickers }))).toContain('03.png（3個目）のサイズが偶数になっていません。');
  });

  it('背景が透明でなければ止める', () => {
    const stickers = candidate().stickers;
    stickers[1] = image('02.png', 240, 320, 3);
    expect(messages(candidate({ stickers }))).toContain('02.png（2個目）の背景が透明になっていません。');
  });

  it('1枚が容量超過なら止める', () => {
    const stickers = candidate().stickers;
    stickers[0] = { name: '01.png', bytes: inflateTo(png(240, 320), SPEC.sticker.maxBytes + 1) };
    expect(messages(candidate({ stickers }))).toContain('01.png（1個目）のファイルサイズが大きすぎます。');
  });

  it('メイン画像が無ければ止める', () => {
    expect(messages(candidate({ main: null }))).toContain('メイン画像が選ばれていません。');
  });

  it('メイン画像の寸法が違えば止める', () => {
    expect(messages(candidate({ main: image('main.png', 200, 240) }))).toContain(
      'メイン画像のサイズが違います。',
    );
  });

  it('タブ画像が無ければ止める', () => {
    expect(messages(candidate({ tab: null }))).toContain('タブ画像が選ばれていません。');
  });

  it('タブ画像の寸法が違えば止める', () => {
    expect(messages(candidate({ tab: image('tab.png', 96, 72) }))).toContain(
      'タブ画像のサイズが違います。',
    );
  });

  it('全体が容量超過なら止める', () => {
    expect(messages(candidate({ totalBytes: SPEC.zipMaxBytes + 1 }))).toContain(
      'データ全体が大きすぎます。スタンプの数を減らしてください。',
    );
  });

  it('文言に技術用語を使わない', () => {
    const forbidden = ['PNG形式', 'RGBA', 'colorType', 'alpha', 'canvas', 'ZIP構造'];
    const c = candidate({ main: null, tab: null, totalBytes: SPEC.zipMaxBytes + 1 });
    for (const message of messages(c)) {
      for (const term of forbidden) {
        expect(message.toLowerCase()).not.toContain(term.toLowerCase());
      }
    }
  });
});

/** バイト数だけを指定サイズまで水増しする（容量チェック用） */
function inflateTo(bytes: Bytes, size: number): Bytes {
  const out = new Uint8Array(size);
  out.set(bytes.subarray(0, Math.min(bytes.length, size)));
  return out;
}
