import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import {
  SRC_ROOT,
  listSourceFiles,
  readSource,
  repoRelative,
  stripComments,
} from '../helpers/source-files.js';

/**
 * PRODUCT_SPEC.md §4: 通常画面に内部の技術用語を出さない。
 *
 * ユーザー向け文言は日本語なので、「日本語を含む文字列」と「JSXのテキスト」だけを
 * 対象にする。クラス名や import パスなどのコードは対象外。
 */
const FORBIDDEN_TERMS = [
  'Alpha',
  'アルファ',
  'Connected Component',
  'Bounding Box',
  'バウンディング',
  'Canvas',
  'キャンバス',
  'Flood Fill',
  'Blob',
  'ブロブ',
  'Cluster',
  'クラスタ',
  'DPI',
  'PNG compression',
];

const HAS_JAPANESE = /[぀-ヿ一-龯]/;

/** ユーザーに見える可能性のあるテキストを抜き出す。 */
function extractUserFacingText(source: string): string[] {
  const stripped = stripComments(source);
  const found: string[] = [];

  // 日本語を含む文字列リテラル
  for (const match of stripped.matchAll(/(['"`])((?:\\.|(?!\1)[\s\S])*)\1/g)) {
    const value = match[2] ?? '';
    if (HAS_JAPANESE.test(value)) found.push(value);
  }

  // JSX のテキストノード
  for (const match of stripped.matchAll(/>([^<>{}]+)</g)) {
    const value = (match[1] ?? '').trim();
    if (value && HAS_JAPANESE.test(value)) found.push(value);
  }

  return found;
}

describe('UI文言', () => {
  it('ユーザー向けの文言に内部の技術用語が含まれない', () => {
    const violations: string[] = [];

    for (const file of listSourceFiles(join(SRC_ROOT, 'ui'))) {
      for (const text of extractUserFacingText(readSource(file))) {
        for (const term of FORBIDDEN_TERMS) {
          if (text.toLowerCase().includes(term.toLowerCase())) {
            violations.push(`${repoRelative(file)}  「${text}」に "${term}"`);
          }
        }
      }
    }

    expect(
      violations,
      `内部用語がユーザーに見える場所に出ています:\n${violations.join('\n')}`,
    ).toEqual([]);
  });
});
