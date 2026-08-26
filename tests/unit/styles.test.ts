import { describe, expect, it } from 'vitest';
import { STYLE_PRESETS, findStyle } from '../../src/core/text/styles.js';
import { buildBatchStickerPrompt, buildStickerPrompt } from '../../src/core/text/sticker-prompt.js';
import { buildPlans, groupBySheet } from '../../src/core/text/plan.js';

const sheets = groupBySheet(buildPlans({ preset: 'business', tone: 'polite', targetCount: 40 }));
const first = sheets[0] ?? [];

describe('仕上がり設定', () => {
  it('仕様が挙げた5つがそろっている', () => {
    expect(STYLE_PRESETS.map((style) => style.label)).toEqual([
      'おまかせ',
      'キャラクター重視',
      'バランス',
      '文字くっきり',
      '落ち着いた仕上がり',
    ]);
  });

  it('おまかせは何も足さない', () => {
    // モデル本来のステッカー表現を活かすため（追加仕様 §5 / §6）
    expect(findStyle('auto').lines).toEqual([]);
  });

  it('標準では文字色や書体を固定しない', () => {
    const prompt = buildStickerPrompt(first, 'auto');
    expect(prompt).not.toContain('カラフル');
    expect(prompt).not.toContain('太字');
    expect(prompt).not.toContain('丸みのある');
  });

  it('文字くっきりでだけ、文字を目立たせる指定が入る', () => {
    expect(buildStickerPrompt(first, 'text')).toContain('カラフル');
    for (const id of ['auto', 'character', 'balanced', 'calm'] as const) {
      expect(buildStickerPrompt(first, id), id).not.toContain('カラフル');
    }
  });

  it('キャラクター重視と文字くっきりで、内容がはっきり違う', () => {
    // 見た目が変わらない設定は置かない（追加仕様 §8.3）
    const character = buildStickerPrompt(first, 'character');
    const text = buildStickerPrompt(first, 'text');
    expect(character).not.toBe(text);
    expect(character).toContain('キャラクターを主役');
    expect(text).toContain('セリフを大きく');
  });

  it('どの設定でも、抽出に必要な条件は消えない', () => {
    for (const style of STYLE_PRESETS) {
      const prompt = buildStickerPrompt(first, style.id);
      expect(prompt, style.label).toContain('幅広い完全透明の隙間');
      expect(prompt, style.label).toContain('接触・重複させないでください');
      expect(prompt, style.label).toContain('背景、床、背景装飾、背景色、影は追加しないでください');
      expect(prompt, style.label).toContain('キャラクターを1体だけ');
      expect(prompt, style.label).toContain('白い縁');
    }
  });
});

describe('まとめて頼むプロンプト', () => {
  const prompt = buildBatchStickerPrompt(sheets, 'auto');

  it('1枚にまとめないことを、冒頭と末尾の2か所で言う', () => {
    // いちばん多い失敗がコラージュになること（追加仕様 §2 / §6.3）
    expect(prompt).toContain('5セットを1枚の巨大な画像やコラージュにまとめないでください');
    expect(prompt).toContain('45種類を1枚の画像にまとめないでください');

    const lines = prompt.split('\n');
    const firstWarning = lines.findIndex((line) => line.includes('コラージュにまとめない'));
    const lastWarning = lines.findIndex((line) => line.includes('45種類を1枚'));
    expect(firstWarning).toBeLessThan(10);
    expect(lastWarning).toBeGreaterThan(lines.length - 5);
  });

  it('5枚を別々の画像として頼む', () => {
    expect(prompt).toContain('それぞれ別々の正方形（1:1）画像として合計5枚生成してください');
    expect(prompt).toContain('完全透明背景');
  });

  it('シート1〜5を見出しで分ける', () => {
    for (let sheet = 1; sheet <= 5; sheet++) {
      expect(prompt).toContain(`# シート${sheet}`);
    }
  });

  it('45件すべてのセリフが入る', () => {
    for (const sheet of sheets) {
      for (const plan of sheet) expect(prompt).toContain(`「${plan.text}」`);
    }
  });

  it('各シートの番号は1〜9でふり直す', () => {
    const lines = prompt.split('\n');
    const start = lines.findIndex((line) => line === '# シート2');
    expect(start).toBeGreaterThan(-1);
    expect(lines[start + 1]?.startsWith('1. ')).toBe(true);
    expect(lines[start + 9]?.startsWith('9. ')).toBe(true);
    expect(lines[start + 10]).toBe('');
  });

  it('5枚を同じシリーズとして統一するよう伝える', () => {
    expect(prompt).toContain('5枚すべてで同一キャラクターとして統一してください');
    expect(prompt).toContain('同じシリーズとして');
    expect(prompt).toContain('別の画風や別シリーズのデザインにならないように');
  });

  it('特定のキャラクターの特徴を書かない', () => {
    // 汎用テンプレートであること（追加仕様 §3）
    for (const word of ['黄色', '水玉', 'スカーフ', 'リュック', '毛並み', 'アヒル', 'ひよこ']) {
      expect(prompt, word).not.toContain(word);
    }
    expect(prompt).toContain('参照画像で確認できる外見、衣装、体の特徴を維持してください');
  });

  it('仕上がり設定が反映される', () => {
    expect(buildBatchStickerPrompt(sheets, 'text')).toContain('カラフル');
    expect(buildBatchStickerPrompt(sheets, 'auto')).not.toContain('カラフル');
  });

  it('枚数が変わっても文面が噛み合う', () => {
    const two = buildBatchStickerPrompt(sheets.slice(0, 2), 'auto');
    expect(two).toContain('ステッカーシートを2枚生成してください');
    expect(two).toContain('18種類を1枚の画像にまとめないでください');
    expect(two).not.toContain('# シート3');
  });
});
