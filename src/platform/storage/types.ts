import type { ProjectSnapshot } from '../../core/project.js';

/**
 * プロジェクトの保存先。
 *
 * 実装を差し替えられるようにしてあるのは、保存が使えない環境があるため。
 * プライベートブラウジングや容量制限で失敗しうる（PRODUCT_SPEC.md §77.9）。
 */
export interface ProjectStore {
  /** 自動保存が使えるか */
  readonly available: boolean;
  save(snapshot: ProjectSnapshot): Promise<void>;
  load(): Promise<ProjectSnapshot | null>;
  clear(): Promise<void>;
}
