import { createIndexedDbStore } from './indexeddb-store.js';
import { createMemoryStore } from './memory-store.js';
import type { ProjectStore } from './types.js';

let cached: Promise<ProjectStore> | null = null;

/**
 * 使える保存先を返す。
 *
 * 使えるかどうかは実測で決める。ブラウザや設定によって差があるため、
 * 「この環境なら使えるはず」という前提を置かない（PRODUCT_SPEC.md §77.9）。
 */
export function getProjectStore(): Promise<ProjectStore> {
  cached ??= createIndexedDbStore().then((store) => store ?? createMemoryStore());
  return cached;
}

export type { ProjectStore } from './types.js';
