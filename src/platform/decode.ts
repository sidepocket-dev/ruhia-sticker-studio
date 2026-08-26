import { encodePng } from '../core/image/png.js';
import type { PixelBuffer, Rect } from '../core/image/types.js';

/** 読み込んだシート1枚分。ビットマップは切り出しに再利用するので保持する。 */
export interface LoadedSheet {
  name: string;
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** 画像ファイルを読み込む。ここから先はブラウザAPIに依存しない形へ渡す。 */
export async function loadSheet(file: File): Promise<LoadedSheet> {
  const bitmap = await createImageBitmap(file);
  return { name: file.name, bitmap, width: bitmap.width, height: bitmap.height };
}

/** 解析用に画素を取り出す。取り出したバッファは解析後に破棄してよい。 */
export function readPixels(sheet: LoadedSheet): PixelBuffer {
  const canvas = new OffscreenCanvas(sheet.width, sheet.height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('画像を読み取れませんでした');

  context.drawImage(sheet.bitmap, 0, 0);
  const imageData = context.getImageData(0, 0, sheet.width, sheet.height);
  return { data: imageData.data, width: sheet.width, height: sheet.height };
}

/**
 * シートの一部を切り出して、指定した長辺に収まる縮小画像のURLを作る。
 * 一覧表示用。元のビットマップは保持したまま、必要な分だけ描き出す。
 */
export function cropToObjectUrl(
  sheet: LoadedSheet,
  region: Rect,
  maxSide: number,
  excludeRects: readonly Rect[] = [],
): string {
  const scale = Math.min(1, maxSide / Math.max(region.width, region.height));
  const width = Math.max(1, Math.round(region.width * scale));
  const height = Math.max(1, Math.round(region.height * scale));

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('画像を作れませんでした');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  // 別のスタンプが写り込む場合は、元の大きさで消してから縮小する
  const source = excludeRects.length === 0 ? sheet.bitmap : cleanRegion(sheet, region, excludeRects);
  const sourceX = excludeRects.length === 0 ? region.x : 0;
  const sourceY = excludeRects.length === 0 ? region.y : 0;

  context.drawImage(source, sourceX, sourceY, region.width, region.height, 0, 0, width, height);

  const imageData = context.getImageData(0, 0, width, height);
  const bytes = encodePng({ data: imageData.data, width, height });
  return URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
}

/** 別のスタンプの画素を消した、元の大きさの切り出しを作る。 */
function cleanRegion(
  sheet: LoadedSheet,
  region: Rect,
  excludeRects: readonly Rect[],
): OffscreenCanvas {
  const canvas = new OffscreenCanvas(region.width, region.height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('画像を作れませんでした');

  context.drawImage(
    sheet.bitmap,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    region.width,
    region.height,
  );
  for (const rect of excludeRects) {
    context.clearRect(rect.x - region.x, rect.y - region.y, rect.width, rect.height);
  }
  return canvas;
}
