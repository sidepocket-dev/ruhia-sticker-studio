import { describe, expect, it } from 'vitest';
import { STYLE_PRESETS, findStyle } from '../../src/core/text/styles.js';
import { buildBatchStickerPrompt, buildStickerPrompt } from '../../src/core/text/sticker-prompt.js';
import { buildPlans, groupBySheet } from '../../src/core/text/plan.js';
import { COMPOSITION_LABELS } from '../../src/core/text/poses.js';
import { readFileSync } from 'node:fs';

const sheets = groupBySheet(buildPlans({ preset: 'business', tone: 'polite', targetCount: 40 }));
/** 実機で5枚とも別内容を生成できたときの条件（§77.26） */
const verified = groupBySheet(buildPlans({ preset: 'school', tone: 'casual', targetCount: 40 }));
const first = sheets[0] ?? [];

describe('仕上がり設定', () => {
  it('生成して差が出た4つだけを置く', () => {
    // 「バランス」は文字くっきりと見分けがつかず削除した（§77.24）。
    // 選ぶ時点で違いを予測できない設定は、選択肢として働かない
    expect(STYLE_PRESETS.map((style) => style.label)).toEqual([
      'おまかせ',
      'キャラクター重視',
      '文字くっきり',
      '落ち着いた仕上がり',
    ]);
  });

  it('4つが2つの軸で並んでいる', () => {
    // 主役をどちらにするか / 派手か落ち着いているか。
    // どの2つを比べても、足す文が違う
    const lines = STYLE_PRESETS.map((style) => style.lines.join('\n'));
    expect(new Set(lines).size, '同じ指定の設定がある').toBe(STYLE_PRESETS.length);
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
    for (const id of ['auto', 'character', 'calm'] as const) {
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

  it('程度を表す言葉だけで指定しない', () => {
    // 実測：「派手にしすぎず」「両方はっきり」は効かず、
    // 「文字色は1〜2色」「飾りは付けない」は効いた（§77.24）
    const calm = findStyle('calm').lines.join('\n');
    expect(calm).toContain('1〜2色');
    expect(calm).toContain('飾りは付けないでください');
    expect(calm).not.toContain('派手にしすぎず');

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
  const prompt = buildBatchStickerPrompt(verified, 'auto');

  it('実機で5枚とも別内容を生成できた文面と、1文字も違わない', () => {
    // ここは4回失敗している。うち1回は「5枚返ったが中身が全部同じ」だった。
    // 直ったのは禁止事項を足したからではなく、画像ごとにセリフを
    // 直下へ置いたから（§77.26）。勝手に変えない
    const template = readFileSync(
      new URL('../fixtures/batch-prompt-verified.md', import.meta.url).pathname,
      'utf8',
    ).trimEnd();

    let expected = template;
    verified.forEach((plans, index) => {
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

  it('画像ごとに、その画像のセリフを直下へ置く', () => {
    // 対応表を冒頭に、セリフを末尾にまとめると中身が混ざった
    const lines = prompt.split('\n');
    for (let sheet = 1; sheet <= 5; sheet++) {
      const at = lines.indexOf(`## 画像${sheet}`);
      expect(at, `画像${sheet}の見出しが無い`).toBeGreaterThan(-1);
      expect(lines[at + 2]).toBe(`${sheet}枚目の画像には、次の9種類だけを入れてください。`);
      expect(lines[at + 3]).toBe('他の画像に書かれた内容は入れないでください。');
      // 4行あとから、そのシートのセリフが始まる
      expect(lines[at + 5]?.startsWith('1. 「')).toBe(true);
      expect(lines[at + 13]?.startsWith('9. 「')).toBe(true);
    }
  });

  it('セリフが画像の見出しより後ろにまとまっていない', () => {
    // 末尾に9×5をまとめる形へ戻っていないこと
    const lines = prompt.split('\n');
    const lastHeading = lines.lastIndexOf('## 画像5');
    const serifuAfter = lines.slice(lastHeading).filter((l) => /^\d\. 「/.test(l));
    expect(serifuAfter).toHaveLength(9);
  });

  it('上下の隙間まで指定する', () => {
    // 段と段がくっついて分割できないシートが公開前テストで2枚出た（§77.25）
    expect(prompt).toContain('左右だけでなく、上下の段の間にも幅広い隙間を設けてください。');
    expect(prompt).toContain('文字や小物が、上下左右のスタンプへはみ出さないようにしてください。');
  });

  it('同じ内容を2枚作らないよう、末尾で念押しする', () => {
    const tail = prompt.split('\n').slice(-4);
    expect(tail).toEqual([
      '画像1から画像5まで、それぞれ別の内容で、合計5枚生成してください。',
      '同じ内容の画像を2枚以上作らないでください。',
      '45種類を1枚の画像にまとめないでください。',
      '1枚生成した時点で終了せず、必ず5枚すべて生成してください。',
    ]);
  });

  it('45件すべてのセリフが入る', () => {
    for (const sheet of verified) {
      for (const plan of sheet) expect(prompt).toContain(`「${plan.text}」`);
    }
  });

  it('各シートの番号は1〜9でふり直す', () => {
    const lines = prompt.split('\n');
    const at = lines.indexOf('## 画像2');
    expect(lines[at + 5]?.startsWith('1. ')).toBe(true);
    expect(lines[at + 13]?.startsWith('9. ')).toBe(true);
  });

  it('5枚を同じシリーズとして統一するよう伝える', () => {
    expect(prompt).toContain('5枚すべてで同一キャラクターとして統一してください');
    expect(prompt).toContain('同じシリーズとして');
  });

  it('特定のキャラクターの特徴を書かない', () => {
    for (const word of ['黄色', '水玉', 'スカーフ', 'リュック', '毛並み', 'アヒル', 'ひよこ']) {
      expect(prompt, word).not.toContain(word);
    }
    expect(prompt).toContain('参照画像で確認できる外見、衣装、体の特徴を維持してください');
  });

  it('仕上がり設定だけが、検証済みの文面との違いになる', () => {
    const withStyle = buildBatchStickerPrompt(verified, 'text');
    expect(withStyle.length).toBeGreaterThan(prompt.length);
    const added = withStyle.split('\n').filter((line) => !prompt.split('\n').includes(line));
    expect(added).toEqual([
      'セリフを大きく、はっきり目立たせてください。',
      '文字色はカラフルで楽しい印象にして構いません。',
    ]);
  });

  it('枚数が変わっても文面が噛み合う', () => {
    const two = buildBatchStickerPrompt(verified.slice(0, 2), 'auto');
    expect(two).toContain('ステッカーシートを2枚生成してください');
    expect(two).toContain('「画像1」から「画像2」まで');
    expect(two).toContain('## 画像2');
    expect(two).not.toContain('## 画像3');
    expect(two).toContain('18種類を1枚の画像にまとめないでください');
    expect(two).toContain('必ず2枚すべて生成してください');
  });
});
