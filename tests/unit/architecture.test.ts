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
 * PRODUCT_SPEC.md §77.3 / AGENTS.md §2 の依存規約を機械的に検証する。
 *
 * これらのテストが落ちたら、規約を緩めるのではなく設計を直すこと。
 */
describe('レイヤ依存の方向', () => {
  it('src/core/** は platform / ui / state に依存しない', () => {
    const violations: string[] = [];

    for (const file of listSourceFiles(join(SRC_ROOT, 'core'))) {
      const source = stripComments(readSource(file));
      const importPaths = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1] ?? '');

      for (const importPath of importPaths) {
        if (/(^|\/)(platform|ui|state)\//.test(importPath)) {
          violations.push(`${repoRelative(file)} → ${importPath}`);
        }
      }
    }

    expect(violations, `core が上位レイヤを import しています:\n${violations.join('\n')}`).toEqual(
      [],
    );
  });

  it('src/config/** は他のどのレイヤにも依存しない', () => {
    const violations: string[] = [];

    for (const file of listSourceFiles(join(SRC_ROOT, 'config'))) {
      const source = stripComments(readSource(file));
      const importPaths = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1] ?? '');

      for (const importPath of importPaths) {
        if (importPath.startsWith('.') && !/(^|\/)config\//.test(importPath)) {
          const isSiblingInConfig = /^\.\/[^/]+$/.test(importPath);
          if (!isSiblingInConfig) violations.push(`${repoRelative(file)} → ${importPath}`);
        }
      }
    }

    expect(violations, `config が他レイヤを import しています:\n${violations.join('\n')}`).toEqual(
      [],
    );
  });
});

/**
 * PRODUCT_SPEC.md §6: LINE仕様は line-spec.ts で一元管理する。
 * 規格値がコード中へ散らばると、LINEの仕様変更時に追随できなくなる。
 */
describe('LINE規格値の一元管理', () => {
  const LINE_SPEC_NUMBERS = [370, 320, 240, 96, 74];

  it('規格値が line-spec.ts の外にリテラルとして現れない', () => {
    const violations: string[] = [];
    const pattern = new RegExp(`(?<![\\w.])(${LINE_SPEC_NUMBERS.join('|')})(?![\\w.])`, 'g');

    for (const file of listSourceFiles(SRC_ROOT)) {
      if (file.endsWith('line-spec.ts')) continue;

      const lines = stripComments(readSource(file)).split('\n');
      lines.forEach((line, index) => {
        // 個別に理由がある場合のみ、この印で除外できる
        if (line.includes('line-spec-exempt')) return;
        const found = line.match(pattern);
        if (found) {
          violations.push(`${repoRelative(file)}:${index + 1}  ${found.join(', ')}  「${line.trim()}」`);
        }
      });
    }

    expect(
      violations,
      `LINE規格値が line-spec.ts の外に書かれています:\n${violations.join('\n')}`,
    ).toEqual([]);
  });
});
