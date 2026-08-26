import type { ProjectSnapshot } from '../../core/project.js';
import type { ProjectStore } from './types.js';

/**
 * 保存が使えない環境のための受け皿。
 *
 * その場かぎりで、ページを閉じると消える。
 * この場合はUIで「自動保存ができません」と案内し、
 * プロジェクトの書き出しで持ち運んでもらう。
 */
export function createMemoryStore(): ProjectStore {
  let held: ProjectSnapshot | null = null;

  return {
    available: false,
    async save(snapshot) {
      held = snapshot;
    },
    async load() {
      return held;
    },
    async clear() {
      held = null;
    },
  };
}
