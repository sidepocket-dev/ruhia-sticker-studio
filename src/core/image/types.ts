/**
 * 画像処理コアの型。
 *
 * このディレクトリ (src/core/**) は DOM に依存しない純粋関数のみで構成する。
 * Canvas / ImageBitmap / File といったブラウザAPIは src/platform/** に隔離する。
 * 理由と規約は PRODUCT_SPEC.md §77.3、検証は tests/unit/architecture.test.ts。
 */

/** 矩形。x, y は左上。単位はピクセル。 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** RGBA画素バッファ。ブラウザの ImageData と互換だが、DOMに依存しない。 */
export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** 不透明かどうかだけを持つ二値マスク。1 = 不透明、0 = 透明。 */
export interface AlphaMask {
  data: Uint8Array;
  width: number;
  height: number;
}

/** 行・列ごとの不透明画素数。3 × 3 の切断位置探索に使う。 */
export interface AlphaProfile {
  /** columns[x] = x列目の不透明画素数 */
  columns: Int32Array;
  /** rows[y] = y行目の不透明画素数 */
  rows: Int32Array;
  /** マスク全体の不透明画素数 */
  totalOpaque: number;
}

/** 連結成分ひとつ分の情報。 */
export interface ConnectedComponent {
  id: number;
  bounds: Rect;
  /** 不透明画素数 */
  area: number;
  /** 重心 */
  centerX: number;
  centerY: number;
}

/** 1個のスタンプとして認識された領域。 */
export interface StickerRegion {
  /** 3 × 3 上の位置。0 = 左上、8 = 右下。 */
  cellIndex: number;
  /** 元シート上での切り出し範囲 (安全余白を含む) */
  bounds: Rect;
  /** 安全余白を含まない、内容そのものの範囲 */
  contentBounds: Rect;
  /** 0.0 - 1.0。低いものだけユーザーに確認を促す。 */
  confidence: number;
}

/** どちらの方式で抽出したか。UIには表示しない (PRODUCT_SPEC.md §11)。 */
export type DetectionStrategy = 'simple-split' | 'smart-detection';

/** 抽出結果。 */
export interface DetectionResult {
  strategy: DetectionStrategy;
  regions: StickerRegion[];
  /** シート全体の不透明画素数。内容欠損チェック (TEST_PLAN.md §4 C1) に使う。 */
  totalOpaquePixels: number;
}
