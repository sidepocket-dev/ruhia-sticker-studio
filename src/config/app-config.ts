/**
 * 画像処理のチューニング定数。
 *
 * LINEの規格ではなく、本ツールの判断基準。規格値は line-spec.ts に置くこと。
 * ここの値を変えると抽出結果が変わるため、変更したら必ず画像回帰テストを実行する。
 */
export const IMAGE_CONFIG = {
  /**
   * この値未満のアルファを「透明」とみなす (0-255)。
   * 低すぎると薄いドロップシャドウを内容として拾い、高すぎるとアンチエイリアスの
   * 輪郭が削れる。PRODUCT_SPEC.md §77.4 参照。
   */
  alphaThreshold: 16,

  /**
   * 「この画像には実質的に透過が無い」と判定する閾値。
   * 透明画素の割合がこれ未満なら、背景除去を提案する (§77.7)。
   */
  minTransparentRatio: 0.02,

  /**
   * 3 × 3 の切断位置を探す窓の広さ。画像の幅/高さに対する比率。
   * W/3 の位置から ±12% の範囲で「透明の谷」を探す (§77.4)。
   */
  gutterSearchWindow: 0.12,

  /**
   * 谷とみなすために必要な、切断線上の不透明画素の最大割合。
   * これを超える内容が乗っていたら、そこは切れない。
   */
  gutterMaxContentRatio: 0.005,

  /**
   * 単純分割が安全とみなせる、切断線上の内容の最大割合。
   * 超えたら Smart Detection へ自動エスカレーションする (§16 / §77.4)。
   */
  simpleSplitMaxEdgeContentRatio: 0.01,

  /** 切り出したスタンプの周囲に足す安全余白 (px)。§77.8 */
  safeMarginPx: 8,

  /**
   * 他のスタンプと比べてこの割合より小さい抽出は、スタンプ本体ではなく
   * 破片を拾った可能性があるとみなして確認を促す。
   */
  suspiciousAreaRatio: 0.4,

  /** Smart Detection の解析解像度。長辺をこの値以下へ縮小してから解析する。§77.5 */
  analysisMaxDimension: 1024,

  /** ノイズとみなす成分の面積。シート全体に対する比率。§77.5 */
  minComponentAreaRatio: 0.0002,

  /**
   * 近接成分を同じスタンプへまとめる距離。セルの短辺に対する比率。§77.5
   */
  componentMergeDistanceRatio: 0.12,
} as const;

/** 出力方針 */
export const EXPORT_CONFIG = {
  /**
   * true にすると全スタンプを最大サイズの透明キャンバスへ統一する。
   * 既定は false (内容トリム)。理由は PRODUCT_SPEC.md §77.8 参照。
   */
  uniformCanvas: false,
} as const;
