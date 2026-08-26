import type { Bytes } from '../core/bytes.js';
import { downloadBytes } from './zip.js';

export type DeliverResult = 'shared' | 'downloaded' | 'cancelled';

/**
 * ファイルを端末へ渡す。
 *
 * スマートフォンでは共有シートを使う。ダウンロードだと、どこへ入ったのか
 * 分からないという問題が実際に起きた（iOSではブラウザの外に保存され、
 * 保存先の案内も出ない）。共有シートなら「ファイルに保存」「LINEで送る」など
 * ユーザーが行き先を選べる。
 *
 * 共有が使えない環境では、これまでどおりダウンロードする。
 *
 * 注意：共有はユーザーの操作から続けて呼ばないと拒否される。
 * この関数を呼ぶまでの間に await を挟まないこと。
 */
export function deliverFile(bytes: Bytes, fileName: string, mimeType: string): Promise<DeliverResult> {
  if (shouldShare()) {
    const file = new File([bytes], fileName, { type: mimeType });
    return navigator
      .share({ files: [file] })
      .then<DeliverResult>(() => 'shared')
      .catch((cause: unknown) => {
        // ユーザーが閉じただけなら、勝手にダウンロードしない
        if (cause instanceof Error && cause.name === 'AbortError') return 'cancelled';
        console.warn('[RUHiA Sticker Studio] 共有できなかったので保存に切り替えます', cause);
        downloadBytes(bytes, fileName, mimeType);
        return 'downloaded';
      });
  }

  downloadBytes(bytes, fileName, mimeType);
  return Promise.resolve('downloaded');
}

/**
 * 共有シートで渡すべき環境か。
 *
 * 「共有できるか」だけで決めてはいけない。デスクトップのSafariも
 * canShare が true を返すため、それだけで判断するとパソコンでも
 * 共有シートが開き、ダウンロードを期待した人が戸惑う。
 *
 * 困っているのは「保存先が分からない」環境、つまり指で操作する端末。
 * そこを条件にする。パソコンでは今までどおりダウンロードする。
 */
export function shouldShare(): boolean {
  if (typeof navigator.canShare !== 'function') return false;
  if (typeof matchMedia === 'function' && !matchMedia('(pointer: coarse)').matches) return false;
  try {
    return navigator.canShare({
      files: [new File([new Uint8Array(1)], 'a.zip', { type: 'application/zip' })],
    });
  } catch {
    return false;
  }
}

/** 渡し方に応じた案内文。どこへ行ったか分からない状態にしない。 */
export function describeDelivery(result: DeliverResult, fileName: string): string {
  switch (result) {
    case 'shared':
      return `${fileName} を渡しました。`;
    case 'downloaded':
      return `${fileName} を保存しました。端末の「ファイル」アプリや、ブラウザのダウンロード一覧から開けます。`;
    case 'cancelled':
      return '';
  }
}
