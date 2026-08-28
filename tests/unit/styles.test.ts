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
  const prompt = buildBatchStickerPrompt(sheets, 'text');

  it('実機で5枚生成できた文面と、1文字も違わない', () => {
    // 以前の文面では2通りの失敗が起きた。
    //   1. 同じシートが重複して2枚しか返らない
    //   2. 同じ内容を2枚作り「どちらがいいですか」と聞いて止まる
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

  it('枚数ではなく、生成の手順として書く', () => {
    // 「5枚ほしい」だけでは、1回の生成にまとめられてしまった
    expect(prompt).toContain('【最重要：出力手順】');
    expect(prompt).toContain('1回の画像生成で5シートを表現するのではありません。');
    expect(prompt).toContain('1シートにつき1枚の独立した画像として順番に生成してください。');
  });

  it('出力単位を「画像N = シートNのみ」で示す', () => {
    expect(prompt).toContain('出力単位は必ず以下です。');
    for (let sheet = 1; sheet <= 5; sheet++) {
      expect(prompt).toContain(`- 画像${sheet} = シート${sheet}のみ`);
    }
  });

  it('実際に起きた失敗を、それぞれ名指しで禁止する', () => {
    for (const rule of [
      '- 45種類を1枚の画像にまとめない',
      '- 5シートを1枚のコラージュにしない',
      '- 複数シートを同じ画像内に配置しない',
      '- 同じシートの別バージョンを複数生成しない',
      '- 1枚だけ生成して終了しない',
      '- 途中でユーザーに選択を求めない',
      '- 「どちらがいいですか」などの確認を行わない',
      '- シート1生成後に停止しない',
    ]) {
      expect(prompt, rule).toContain(rule);
    }
  });

  it('確認を挟まず次のシートへ進むよう伝える', () => {
    // 「どちらがいいですか」と聞かれて止まったため
    expect(prompt).toContain(
      'シート1の生成が完了したら、ユーザーへの確認を挟まず、そのままシート2、シート3、シート4、シート5まで順番に生成してください。',
    );
  });

  it('1枚にまとめないことを、冒頭と末尾の2か所で言う', () => {
    const lines = prompt.split('\n');
    const first = lines.findIndex((line) => line.includes('1枚のコラージュにしない'));
    const last = lines.length - 1 - [...lines].reverse().findIndex((line) => line.includes('45種類を1枚の画像にまとめない'));
    expect(first).toBeGreaterThan(-1);
    expect(first).toBeLessThan(25);
    expect(last).toBeGreaterThan(lines.length - 3);
  });

  it('末尾でもう一度、枚数と終了条件を念押しする', () => {
    const tail = prompt.split('\n').slice(-3);
    expect(tail).toEqual([
      'シート1からシート5までを、それぞれ独立した画像として合計5枚生成してください。',
      '45種類を1枚の画像にまとめないでください。',
      '1枚生成した時点で終了せず、必ず5枚すべて生成してください。',
    ]);
  });

  it('5枚を別々の画像として頼む', () => {
    expect(prompt).toContain('5枚とも完全透明背景の正方形ステッカーシートとして別々に出力してください');
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

  it('仕上がり設定だけが、検証済みの文面との違いになる', () => {
    // 書かれていない指示を勝手に加えない
    const auto = buildBatchStickerPrompt(sheets, 'auto');
    expect(auto).not.toContain('カラフル');
    expect(auto.length).toBeLessThan(prompt.length);

    // 差は文字くっきりの2行だけ
    const added = prompt.split('\n').filter((line) => !auto.split('\n').includes(line));
    expect(added).toEqual([
      'セリフを大きく、はっきり目立たせてください。',
      '文字色はカラフルで楽しい印象にして構いません。',
    ]);
  });

  it('枚数が変わっても文面が噛み合う', () => {
    const two = buildBatchStickerPrompt(sheets.slice(0, 2), 'auto');
    expect(two).toContain('ステッカーシートを2枚生成してください');
    expect(two).toContain('画像を合計2枚生成してください');
    expect(two).toContain('1回の画像生成で2シートを表現するのではありません');
    expect(two).toContain('3×3ステッカーシート × 2枚 = 18種類');
    expect(two).toContain('18種類を1枚の画像にまとめないでください');
    expect(two).toContain('必ず2枚すべて生成してください');
    expect(two).toContain('- 画像2 = シート2のみ');
    expect(two).not.toContain('- 画像3 = シート3のみ');
    expect(two).not.toContain('# シート3');
  });
});
