import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const SRC_ROOT = new URL('../../src/', import.meta.url).pathname;

/** dir 以下の .ts / .tsx を再帰的に集める (リポジトリルートからの相対パス)。 */
export function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (/\.tsx?$/.test(entry)) {
        out.push(full);
      }
    }
  };
  walk(dir);
  return out.sort();
}

export function readSource(path: string): string {
  return readFileSync(path, 'utf8');
}

export function repoRelative(path: string): string {
  return relative(new URL('../../', import.meta.url).pathname, path);
}

/**
 * コメントを取り除く。
 * 規約チェックはコードに対して行うため、説明のためにコメントへ書いた語は対象外にする。
 */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
}
