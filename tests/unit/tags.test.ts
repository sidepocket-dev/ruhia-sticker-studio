import { describe, expect, it } from 'vitest';
import { buildTagDrafts, buildTagsTxt } from '../../src/core/text/tags.js';
import { buildPlans } from '../../src/core/text/plan.js';
import { STICKER_CATEGORIES } from '../../src/core/text/categories.js';

const plans = buildPlans({ preset: 'daily', tone: 'casual', targetCount: 40 }).slice(0, 40);

describe('タグを探す手がかり', () => {
  const drafts = buildTagDrafts(plans);

  it('番号が提出順（ZIPの 01.png）と一致する', () => {
    // ここがずれると、別のスタンプにタグを付けてしまう
    expect(drafts.map((draft) => draft.id)).toEqual(plans.map((_, index) => index + 1));
  });

  it('セリフと、種類の名前を出す', () => {
    const first = drafts[0];
    expect(first?.words[0]).toBe(plans[0]?.text);
    expect(STICKER_CATEGORIES.map((category) => category.label)).toContain(first?.words[1]);
  });

  it('セリフを最初に置く', () => {
    // トークで打つ言葉とタグが合っているのが本来の形。
    // 種類の名前は、セリフで見つからなかったときの広い言葉
    for (const draft of drafts) expect(draft.words[0]).toBe(draft.text);
  });

  it('同じ言葉を2つ出さない', () => {
    for (const draft of drafts) {
      expect(new Set(draft.words).size, draft.words.join('/')).toBe(draft.words.length);
    }
  });

  it('空の言葉を出さない', () => {
    for (const draft of drafts) {
      for (const word of draft.words) expect(word.trim().length).toBeGreaterThan(0);
    }
  });

  it('選んだ個数ぶんだけ出る', () => {
    expect(buildTagDrafts(plans.slice(0, 8))).toHaveLength(8);
    expect(buildTagDrafts([])).toEqual([]);
  });
});

describe('tags.txt', () => {
  const txt = buildTagsTxt(plans);

  it('探し方を先に書く', () => {
    // タグは自由入力ではなく一覧から選ぶ。それを知らないと使えない
    expect(txt).toContain('一覧から選ぶ形式');
    expect(txt).toContain('ページ内検索');
  });

  it('番号つきで全部並ぶ', () => {
    const lines = txt.split('\n').filter((line) => /^\d\d /.test(line));
    expect(lines).toHaveLength(40);
    expect(lines[0]).toBe(`01 ${plans[0]?.text} / あいさつ`);
    expect(lines[39]?.startsWith('40 ')).toBe(true);
  });

  it('タグそのものだとは言わない', () => {
    // ここに出す言葉がLINEのタグ名だとは限らない（§34）
    expect(txt).toContain('手がかり');
    expect(txt).not.toContain('このタグを設定してください');
  });
});
