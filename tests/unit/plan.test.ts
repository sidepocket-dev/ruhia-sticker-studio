import { describe, expect, it } from 'vitest';
import { LINE_STATIC_STICKER_SPEC, STICKERS_PER_SHEET } from '../../src/config/line-spec.js';
import { CATEGORY_COUNT } from '../../src/core/text/categories.js';
import { buildPlans, groupBySheet } from '../../src/core/text/plan.js';
import { buildIdeaPrompt } from '../../src/core/text/idea-prompt.js';
import { buildAllStickerPrompts, buildStickerPrompt } from '../../src/core/text/sticker-prompt.js';
import { buildTextsJson, buildTextsTxt } from '../../src/core/text/export-texts.js';
import { describeDuplicates, findDuplicates, normalizeText } from '../../src/core/text/duplicates.js';
import { USE_PRESETS } from '../../src/core/text/presets.js';
import type { Tone } from '../../src/core/text/presets.js';

const daily = (targetCount: number) =>
  buildPlans({ preset: 'daily', tone: 'casual', targetCount });

describe('計画の組み立て', () => {
  it.each([
    [8, 9, 1],
    [16, 18, 2],
    [24, 27, 3],
    [32, 36, 4],
    [40, 45, 5],
  ])('%i個セットで候補%i件・シート%i枚になる', (target, candidates, sheets) => {
    const plans = daily(target);
    expect(plans).toHaveLength(candidates);
    expect(groupBySheet(plans)).toHaveLength(sheets);
  });

  it('目標個数ぶんだけ最初から有効になっている', () => {
    const plans = daily(8);
    expect(plans.filter((plan) => plan.enabled)).toHaveLength(8);
    expect(plans[8]?.enabled).toBe(false);
  });

  it('各シートがちょうど9件になる', () => {
    for (const sheet of groupBySheet(daily(40))) {
      expect(sheet).toHaveLength(STICKERS_PER_SHEET);
    }
  });

  it('各シートに同じカテゴリが2つ入らない', () => {
    for (const sheet of groupBySheet(daily(40))) {
      expect(new Set(sheet.map((plan) => plan.category)).size).toBe(CATEGORY_COUNT);
    }
  });

  it('どの個数でもセリフが重複しない', () => {
    for (const target of LINE_STATIC_STICKER_SPEC.allowedCounts) {
      const texts = daily(target).map((plan) => plan.text);
      expect(new Set(texts).size, `${target}個セット`).toBe(texts.length);
    }
  });

  it('どの個数でもポーズが重複しない', () => {
    for (const target of LINE_STATIC_STICKER_SPEC.allowedCounts) {
      const poses = daily(target).map((plan) => plan.pose.pose);
      expect(new Set(poses).size, `${target}個セット`).toBe(poses.length);
    }
  });

  it('言葉づかいを変えるとセリフが変わり、ポーズは変わらない', () => {
    const casual = buildPlans({ preset: 'daily', tone: 'casual', targetCount: 8 });
    const polite = buildPlans({ preset: 'daily', tone: 'polite', targetCount: 8 });

    expect(casual.map((plan) => plan.text)).not.toEqual(polite.map((plan) => plan.text));
    expect(casual.map((plan) => plan.pose)).toEqual(polite.map((plan) => plan.pose));
  });

  it('用途を変えるとセリフが変わり、ポーズは変わらない', () => {
    const daily8 = buildPlans({ preset: 'daily', tone: 'casual', targetCount: 8 });
    const business8 = buildPlans({ preset: 'business', tone: 'polite', targetCount: 8 });

    expect(daily8.map((plan) => plan.pose)).toEqual(business8.map((plan) => plan.pose));
    expect(daily8.map((plan) => plan.text)).not.toEqual(business8.map((plan) => plan.text));
  });

  it('同じ指定なら毎回まったく同じ結果になる', () => {
    expect(daily(40)).toEqual(daily(40));
  });

  it('シート番号と位置が通し番号と噛み合っている', () => {
    const plans = daily(40);
    expect(plans[0]).toMatchObject({ id: 1, sheet: 1, position: 1 });
    expect(plans[8]).toMatchObject({ id: 9, sheet: 1, position: 9 });
    expect(plans[9]).toMatchObject({ id: 10, sheet: 2, position: 1 });
    expect(plans[44]).toMatchObject({ id: 45, sheet: 5, position: 9 });
  });
});

describe('画像生成プロンプト', () => {
  const sheets = groupBySheet(daily(40));
  const first = sheets[0] ?? [];
  const prompt = buildStickerPrompt(first);

  it('9件すべてのセリフが入る', () => {
    for (const plan of first) expect(prompt).toContain(plan.text);
  });

  it('抽出しやすくするための指示が必ず入る', () => {
    // 実測で抽出の成否に直結する（PRODUCT_SPEC.md §10 / §77.4）
    expect(prompt).toContain('幅広で完全に透明な隙間');
    expect(prompt).toContain('接触または重ならない');
    expect(prompt).toContain('背景、背景装飾、影は追加しないでください');
    expect(prompt).toContain('3×3');
    expect(prompt).toContain('正方形（1:1）');
  });

  it('1体だけ描くよう伝える', () => {
    // 相手が必要な動作を指示すると2体描かれることがあった
    expect(prompt).toContain('キャラクターを1体だけ描いてください');
  });

  it('白い縁を付けるよう伝える', () => {
    // スタンプらしい見た目になるだけでなく、白い縁が本体・文字・装飾をつないで
    // 1つの連結領域にするため抽出も安定する。
    // 背景が不透明な画像では白い縁と白い背景を色で区別できないので、
    // 後から描き足すのではなく生成時に付けてもらう（PRODUCT_SPEC.md §10）
    expect(prompt).toContain('白い縁を付けてください');
  });

  it('キャラクターの見た目を勝手に文章化しない', () => {
    // 参照画像が正（PRODUCT_SPEC.md §18）
    expect(prompt).toContain('添付画像のとおり');
    expect(prompt).toContain('衣装や体の特徴を変えないでください');
  });

  it('番号は1〜9でふり直される（シートごとに独立）', () => {
    const second = buildStickerPrompt(sheets[1] ?? []);
    expect(second).toContain('1. ');
    expect(second).toContain('9. ');
    expect(second).not.toContain('10. ');
  });

  it('シート枚数ぶん作られる', () => {
    const all = buildAllStickerPrompts(sheets);
    expect(all).toHaveLength(5);
    expect(all.map((item) => item.sheet)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('セリフ依頼プロンプト', () => {
  const plans = daily(40);
  const prompt = buildIdeaPrompt(plans, 'daily', 'casual');

  it('枠の数を明示する', () => {
    expect(prompt).toContain('45個');
  });

  it('45枠すべての番号が入る', () => {
    for (const plan of plans) expect(prompt).toContain(`${plan.id}. `);
  });

  it('自由に考えさせず、枠ごとに1件書かせる', () => {
    expect(prompt).toContain('1つずつ');
    expect(prompt).toContain('枠の番号は変えないでください');
  });

  it('用途と言葉づかいを伝える', () => {
    expect(prompt).toContain('日常用');
    expect(prompt).toContain('カジュアル');
  });
});

describe('テキストの書き出し', () => {
  const plans = daily(8).filter((plan) => plan.enabled);

  it('texts.txt が 01 からの連番になる', () => {
    const lines = buildTextsTxt(plans).trim().split('\n');
    expect(lines).toHaveLength(8);
    expect(lines[0]).toBe(`01 ${plans[0]?.text}`);
    expect(lines[7]?.startsWith('08 ')).toBe(true);
  });

  it('texts.json が読み込める形になる', () => {
    const parsed: unknown = JSON.parse(buildTextsJson(plans));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(8);
    expect((parsed as { id: number }[])[0]?.id).toBe(1);
  });
});

describe('TC13: 重複の検出', () => {
  it('表記のゆれをそろえる', () => {
    expect(normalizeText('「ありがとう！」')).toBe('ありがとう');
    expect(normalizeText('ａｒｉｇａｔｏ')).toBe('arigato');
    expect(normalizeText(' ありがとう 。')).toBe('ありがとう');
  });

  it('完全に同じセリフを見つける', () => {
    const groups = findDuplicates(['ありがとう', 'おはよう', 'ありがとう！']);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.kind).toBe('same');
    expect(groups[0]?.indexes).toEqual([0, 2]);
  });

  it('片方がもう片方を含む場合も知らせる', () => {
    const groups = findDuplicates(['ありがとう', 'ありがとうございます']);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.kind).toBe('contained');
  });

  it('短すぎる文字列では誤検出しない', () => {
    expect(findDuplicates(['あ', 'あいさつ'])).toEqual([]);
  });

  it('重複が無ければ空', () => {
    expect(findDuplicates(['おはよう', 'ありがとう', 'またね'])).toEqual([]);
    expect(describeDuplicates([])).toBe('');
  });

  it('用意したセリフ表に、まったく同じセリフが無い', () => {
    for (const preset of USE_PRESETS) {
      for (const tone of ['casual', 'polite'] as Tone[]) {
        const texts = buildPlans({ preset: preset.id, tone, targetCount: 40 }).map(
          (plan) => plan.text,
        );
        const same = findDuplicates(texts).filter((group) => group.kind === 'same');
        expect(same, `${preset.label} / ${tone}`).toEqual([]);
      }
    }
  });

  it('用意したセリフ表で、似すぎている組が増えすぎない', () => {
    // 「ありがとう」と「ほんとにありがとう」のような使い分けは残してよい。
    // ただし「ありがとう」と「ありがと」のような同語の表記違いが紛れ込むと
    // すぐこの数を超えるので、見張りとして上限を置く
    for (const preset of USE_PRESETS) {
      for (const tone of ['casual', 'polite'] as Tone[]) {
        const texts = buildPlans({ preset: preset.id, tone, targetCount: 40 }).map(
          (plan) => plan.text,
        );
        const contained = findDuplicates(texts).filter((group) => group.kind === 'contained');
        expect(contained.length, `${preset.label} / ${tone}`).toBeLessThanOrEqual(4);
      }
    }
  });

  it('説明文に技術用語を使わない', () => {
    const message = describeDuplicates(findDuplicates(['ありがとう', 'ありがとう']));
    expect(message).toContain('同じセリフが1組');
    expect(message).not.toContain('normalize');
  });
});
