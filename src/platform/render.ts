import type { Bytes } from '../core/bytes.js';
import type { ImageLayout } from '../core/line/layout.js';
import type { Rect } from '../core/image/types.js';
import type { LoadedSheet } from './decode.js';

/**
 * シートの一部を、指定した設計どおりのPNGへ描き出す。
 *
 * キャンバスは初期状態で透明なので、描いた部分以外は透明のまま残る。
 * これがLINEの求める「背景が透明」を満たす。
 */
export async function renderToPng(
  sheet: LoadedSheet,
  source: Rect,
  layout: ImageLayout,
): Promise<Bytes> {
  const canvas = new OffscreenCanvas(layout.canvas.width, layout.canvas.height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('画像を作れませんでした');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    sheet.bitmap,
    source.x,
    source.y,
    source.width,
    source.height,
    layout.draw.x,
    layout.draw.y,
    layout.draw.width,
    layout.draw.height,
  );

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return new Uint8Array(await blob.arrayBuffer());
}

/** 同じ内容を、画面表示用のURLとして得る。 */
export async function renderToObjectUrl(
  sheet: LoadedSheet,
  source: Rect,
  layout: ImageLayout,
): Promise<string> {
  const bytes = await renderToPng(sheet, source, layout);
  return URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
}
