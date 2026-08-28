import { describe, expect, it } from 'vitest';
import { STYLE_PRESETS, findStyle } from '../../src/core/text/styles.js';
import { buildBatchStickerPrompt, buildStickerPrompt } from '../../src/core/text/sticker-prompt.js';
import { buildPlans, groupBySheet } from '../../src/core/text/plan.js';
import { COMPOSITION_LABELS } from '../../src/core/text/poses.js';
import { readFileSync } from 'node:fs';

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

  it('実機で5枚生成できた文面と、1文字も違わない', () => {
    // 以前の文面では、同じシートが重複して2枚しか返らなかった。
    // この文面は実機で5枚すべて生成できたもの。勝手に変えない
    const template = readFileSync(
      new URL('../fixtures/batch-prompt-verified.md', import.meta.url).pathname,
      'utf8',
    ).trimEnd();

    let expected = template;
    sheets.forEach((plans, index) => {
      const body = plans
        .map(
          (plan, position) =>
            `${position + 1}. 「${plan.text}」／${plan.action}／${COMPOSITION_LABELS[plan.pose.composition]}`,
        )
        .join('\n');
      expected = expected.replace(`{{SHEET_${index + 1}}}`, body);
    });

    expect(prompt).toBe(expected);
  });

  it('出力画像とシートの対応を、冒頭と末尾の2か所で示す', () => {
    // これが無いと、同じシートが重複して返ることがあった
    const occurrences = prompt.split('- 画像1 = シート1').length - 1;
    expect(occurrences, '対応表が2か所に出る').toBe(2);
    for (let sheet = 1; sheet <= 5; sheet++) {
      expect(prompt).toContain(`- 画像${sheet} = シート${sheet}`);
    }
  });

  it('重複・省略・混在を、それぞれ名指しで禁止する', () => {
    for (const rule of [
      '同じシートを重複して生成しないでください。',
      'シートを省略しないでください。',
      '他のシートの内容を混ぜないでください。',
    ]) {
      expect(prompt.split(rule).length - 1, `「${rule}」が2か所に出る`).toBe(2);
    }
  });

  it('1枚にまとめないことを、冒頭と末尾の2か所で言う', () => {
    // いちばん多い失敗がコラージュになること（追加仕様 §2 / §6.3）
    expect(prompt).toContain('5セットを1枚の巨大な画像やコラージュにまとめないでください');
    expect(prompt).toContain('45種類を1枚の画像にまとめないでください');

    const lines = prompt.split('\n');
    const firstWarning = lines.findIndex((line) => line.includes('コラージュにまとめない'));
    const lastWarning = lines.findIndex((line) => line.includes('45種類を1枚'));
    expect(firstWarning).toBeLessThan(20);
    expect(lastWarning).toBeGreaterThan(lines.length - 3);
  });

  it('5枚を別々の画像として頼む', () => {
    expect(prompt).toContain('5枚をそれぞれ別々の正方形（1:1）画像として出力してください');
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
    expect(lines[start + 2]?.startsWith('1. ')).toBe(true);
    expect(lines[start + 10]?.startsWith('9. ')).toBe(true);
  });

  it('5枚を同じシリーズとして統一するよう伝える', () => {
    expect(prompt).toContain('5枚すべてで同一キャラクターとして統一してください');
    expect(prompt).toContain('同じシリーズとして');
    expect(prompt).toContain('別の画風や別シリーズのデザインにならないように');
  });

  it('特定のキャラクターの特徴を書かない', () => {
    // 汎用テンプレートであること（追加仕様 §3 / §4）
    for (const word of ['黄色', '水玉', 'スカーフ', 'リュック', '毛並み', 'アヒル', 'ひよこ']) {
      expect(prompt, word).not.toContain(word);
    }
    expect(prompt).toContain('参照画像で確認できる外見、衣装、体の特徴を維持してください');
  });

  it('おまかせでは、検証済みの文面に何も足さない', () => {
    // 書かれていない指示を勝手に加えない
    const withStyle = buildBatchStickerPrompt(sheets, 'text');
    expect(withStyle.length).toBeGreaterThan(prompt.length);
    expect(withStyle).toContain('カラフル');
    expect(prompt).not.toContain('カラフル');
  });

  it('枚数が変わっても文面が噛み合う', () => {
    const two = buildBatchStickerPrompt(sheets.slice(0, 2), 'auto');
    expect(two).toContain('ステッカーシートを2枚生成してください');
    expect(two).toContain('必ず2枚の独立した画像を生成してください');
    expect(two).toContain('出力は必ず合計2枚にしてください');
    expect(two).toContain('18種類を1枚の画像にまとめないでください');
    expect(two).toContain('- 画像2 = シート2');
    expect(two).not.toContain('- 画像3 = シート3');
    expect(two).not.toContain('# シート3');
  });
});
