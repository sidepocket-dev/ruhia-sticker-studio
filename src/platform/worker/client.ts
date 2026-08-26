import DetectWorker from './detect.worker.ts?worker&inline';
import { detectStickers } from '../../core/image/detect.js';
import type { DetectOutcome } from '../../core/image/detect.js';
import type { PixelBuffer } from '../../core/image/types.js';
import type { DetectRequest, DetectResponse } from './detect.worker.js';

/**
 * 解析を別スレッドで行う。大きなシートでも画面が固まらないようにするため。
 *
 * `?worker&inline` にしているのは、オフライン版を単一HTMLにしても
 * 動くようにするため（別ファイルを取りに行かない）。
 */
let worker: Worker | null = null;
let workerUsable = true;
let nextId = 1;

function getWorker(): Worker {
  worker ??= new DetectWorker();
  return worker;
}

/**
 * 解析する。別スレッドが使えない環境では同じ処理をこのスレッドで行う。
 *
 * 環境によっては Worker を起動できないことがあるが、解析自体は同じ純粋関数なので
 * 結果は変わらない。動かないより、少し待たせてでも動くほうを選ぶ。
 */
export async function detectSheet(buffer: PixelBuffer): Promise<DetectOutcome> {
  if (!workerUsable) return detectStickers(buffer);

  try {
    return await detectInWorker(buffer);
  } catch (cause) {
    console.warn('[RUHiA Sticker Studio] 別スレッドを使えないため、この画面で処理します', cause);
    workerUsable = false;
    worker = null;
    return detectStickers(buffer);
  }
}

function detectInWorker(buffer: PixelBuffer): Promise<DetectOutcome> {
  const id = nextId++;
  const instance = getWorker();

  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<DetectResponse>): void => {
      if (event.data.id !== id) return;
      cleanup();
      resolve(event.data.outcome);
    };
    const onError = (event: ErrorEvent): void => {
      cleanup();
      reject(new Error(event.message));
    };
    const cleanup = (): void => {
      instance.removeEventListener('message', onMessage);
      instance.removeEventListener('error', onError);
    };

    instance.addEventListener('message', onMessage);
    instance.addEventListener('error', onError);

    // コピーを渡して所有権ごと移す。元のバッファは残るので、
    // 別スレッドが失敗してもこのスレッドで処理をやり直せる。
    const copy = new Uint8ClampedArray(buffer.data);
    const request: DetectRequest = {
      id,
      buffer: { data: copy, width: buffer.width, height: buffer.height },
    };
    instance.postMessage(request, [copy.buffer]);
  });
}
