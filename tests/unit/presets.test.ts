import { describe, expect, it } from 'vitest';
import { CATEGORY_COUNT, TOTAL_SLOTS, categoryAt } from '../../src/core/text/categories.js';
import { USE_PRESETS, findPreset } from '../../src/core/text/presets.js';
import type { Tone } from '../../src/core/text/presets.js';

const TONES: Tone[] = ['polite', 'casual'];

describe('用途プリセット', () => {
  it('idが重複していない', () => {
    const ids = USE_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('仕様書が求める用途がそろっている', () => {
    // PRODUCT_SPEC.md §22 の最低限（カスタムはUI側の扱い）
    const ids = USE_PRESETS.map((preset) => preset.id);
    for (const required of ['daily', 'business', 'friends', 'couple']) {
      expect(ids).toContain(required);
    }
  });

  it('存在しない用途を引くと分かる形で失敗する', () => {
    // @ts-expect-error 存在しないidを渡した場合の動作を確認する
    expect(() => findPreset('nothing')).toThrow();
  });
});

describe.each(USE_PRESETS)('$label のセリフ表', (preset) => {
  it('45件ちょうど用意されている', () => {
    expect(preset.texts).toHaveLength(TOTAL_SLOTS);
  });

  it.each(TONES)('%s のセリフが重複していない', (tone) => {
    const texts = preset.texts.map((slot) => slot[tone]);
    const duplicates = texts.filter((text, index) => texts.indexOf(text) !== index);
    expect(duplicates, `重複: ${duplicates.join(' / ')}`).toEqual([]);
  });

  it.each(TONES)('%s のセリフが空でない', (tone) => {
    for (let position = 1; position <= TOTAL_SLOTS; position++) {
      const text = preset.texts[position - 1]?.[tone] ?? '';
      expect(text.trim(), `位置 ${position}`).not.toBe('');
    }
  });

  it.each(TONES)('%s のセリフがスタンプに載る長さに収まる', (tone) => {
    // 長すぎる文字はスタンプの絵を圧迫する
    for (let position = 1; position <= TOTAL_SLOTS; position++) {
      const text = preset.texts[position - 1]?.[tone] ?? '';
      expect(text.length, `位置 ${position}「${text}」`).toBeLessThanOrEqual(16);
    }
  });

  it('ていねいとカジュアルが全件で違う言い方になっている', () => {
    const same = preset.texts.filter((slot) => slot.polite === slot.casual);
    expect(same.map((slot) => slot.polite), '同じ文字列になっている').toEqual([]);
  });

  it('1シート分（9件）に同じセリフが入らない', () => {
    for (let round = 0; round < TOTAL_SLOTS / CATEGORY_COUNT; round++) {
      for (const tone of TONES) {
        const sheet = preset.texts
          .slice(round * CATEGORY_COUNT, (round + 1) * CATEGORY_COUNT)
          .map((slot) => slot[tone]);
        expect(new Set(sheet).size, `${round + 1}枚目の ${tone}`).toBe(CATEGORY_COUNT);
      }
    }
  });

  it('あいさつの位置に、あいさつらしいセリフが入っている', () => {
    // カテゴリの並びとセリフ表がずれていないことの、ゆるい確認
    const greetings = [
      'おは', 'おっは', 'こんに', 'こんば', 'ちわ', 'やっほ',
      'ただいま', 'おかえり', 'ひさし', '久しぶり', 'ご無沙汰',
      '元気', 'げんき', 'おきてる', '起きて',
      'お疲れ', 'おつかれ', 'お世話', 'いつもどうも', 'お待たせ', 'おまたせ',
      'ねえ', 'おーい', '呼び', 'せんせ',
    ];
    for (let position = 1; position <= TOTAL_SLOTS; position++) {
      if (categoryAt(position) !== 'greeting') continue;
      const text = preset.texts[position - 1]?.casual ?? '';
      expect(
        greetings.some((word) => text.includes(word)),
        `位置 ${position}「${text}」があいさつに見えない`,
      ).toBe(true);
    }
  });
});
