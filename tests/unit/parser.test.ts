import { describe, expect, it } from 'vitest';
import { describeParseResult, parsePastedText } from '../../src/core/text/parser.js';

const parse = (input: string) => parsePastedText(input).entries;

describe('TC12: 番号の書き方のゆれ', () => {
  it.each([
    ['1. おはよう｜手を振る', 1],
    ['1) おはよう｜手を振る', 1],
    ['1 おはよう｜手を振る', 1],
    ['1、おはよう｜手を振る', 1],
    ['01. おはよう｜手を振る', 1],
    ['１. おはよう｜手を振る', 1],
    ['① おはよう｜手を振る', 1],
    ['①おはよう｜手を振る', 1],
    ['- 1. おはよう｜手を振る', 1],
  ])('%s を読み取れる', (line, number) => {
    const entries = parse(line);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.number).toBe(number);
    expect(entries[0]?.text).toBe('おはよう');
    expect(entries[0]?.action).toBe('手を振る');
  });

  it('丸数字の20より大きい番号も読み取れる', () => {
    expect(parse('㉑ ありがとう')[0]?.number).toBe(21);
    expect(parse('㊱ ありがとう')[0]?.number).toBe(36);
  });
});

describe('TC12: 区切り記号のゆれ', () => {
  it.each(['｜', '|', '：', ':', '／', '/', '-', '－', '–', '—', '='])(
    '「%s」で本文と動作を分けられる',
    (separator) => {
      const entries = parse(`1. おはよう${separator}元気に手を振る`);
      expect(entries[0]?.text).toBe('おはよう');
      expect(entries[0]?.action).toBe('元気に手を振る');
    },
  );

  it('区切りが無ければ本文だけになる', () => {
    const entries = parse('1. おはよう');
    expect(entries[0]?.text).toBe('おはよう');
    expect(entries[0]?.action).toBe('');
  });

  it('かぎかっこを外す', () => {
    expect(parse('1. 「おはよう」｜手を振る')[0]?.text).toBe('おはよう');
    expect(parse('1. おはよう｜「手を振る」')[0]?.action).toBe('手を振る');
  });
});

describe('TC11: 45件の読み取り', () => {
  const lines = Array.from({ length: 45 }, (_, i) => `${i + 1}. セリフ${i + 1}｜ポーズ${i + 1}`);

  it('45件すべて読み取れる', () => {
    const entries = parse(lines.join('\n'));
    expect(entries).toHaveLength(45);
    expect(entries[0]?.text).toBe('セリフ1');
    expect(entries[44]?.text).toBe('セリフ45');
    expect(entries[44]?.number).toBe(45);
  });

  it('見出しや前置きが混ざっていても読み取れる', () => {
    const messy = [
      'もちろんです！以下の45件をご提案します。',
      '',
      '### グループ1：あいさつ',
      lines[0],
      lines[1],
      '',
      '---',
      '## グループ2：お礼',
      ...lines.slice(2),
      '',
      '以上です。ご確認ください。',
    ].join('\n');

    const entries = parse(messy);
    expect(entries).toHaveLength(45);
  });

  it('空行や区切り線を項目として数えない', () => {
    expect(parse('1. あ\n\n\n2. い\n---\n3. う')).toHaveLength(3);
  });
});

describe('番号が無い場合', () => {
  it('箇条書きだけでも順番に読み取れる', () => {
    const entries = parse('- おはよう｜手を振る\n- ありがとう｜お辞儀\n・またね');
    expect(entries).toHaveLength(3);
    expect(entries.map((entry) => entry.number)).toEqual([1, 2, 3]);
    expect(entries[2]?.text).toBe('またね');
  });

  it('番号つきの行が1つでもあれば、そちらを優先する', () => {
    const entries = parse('よろしくお願いします\n1. おはよう\n2. ありがとう');
    expect(entries).toHaveLength(2);
    expect(entries[0]?.text).toBe('おはよう');
  });
});

describe('読み取れない行', () => {
  it('番号だけで本文が無い行を失敗として返す', () => {
    const result = parsePastedText('1. おはよう\n2.\n3. ありがとう');
    expect(result.entries).toHaveLength(2);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.lineNumber).toBe(2);
    expect(result.failed[0]?.source).toBe('2.');
  });

  it('失敗した行が元のまま返る（修正できるように）', () => {
    const result = parsePastedText('1. 「」｜手を振る');
    expect(result.failed[0]?.source).toBe('1. 「」｜手を振る');
  });

  it('空の入力でも壊れない', () => {
    expect(parsePastedText('')).toEqual({ entries: [], failed: [] });
    expect(parsePastedText('   \n\n  ')).toEqual({ entries: [], failed: [] });
  });
});

describe('PRODUCT_SPEC §28 の案内文', () => {
  it('ちょうどのとき', () => {
    expect(describeParseResult(45, 45)).toBe('45件読み込みました');
  });

  it('足りないとき', () => {
    expect(describeParseResult(42, 45)).toBe('42件読み込みました。あと3件必要です。');
  });

  it('多いとき', () => {
    expect(describeParseResult(47, 45)).toBe('47件あります。使用する45件を選んでください。');
  });
});
