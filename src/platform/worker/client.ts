import DetectWorker from './detect.worker.ts?worker&inline';
import { DEFAULT_PREPARE_OPTIONS, prepareSheet } from '../../core/image/prepare.js';
import type { PrepareStatus } from '../../core/image/prepare.js';
import type { DetectOutcome } from '../../core/image/detect.js';
import type { PixelBuffer } from '../../core/image/types.js';
import type { DetectRequest, DetectResponse } from './detect.worker.js';

/** 前処理の結果。背景を抜いた場合は、抜いたあとの画素も返る。 */
export interface PrepareReply {
  status: PrepareStatus;
  outcome: DetectOutcome | null;
  /** 背景を抜いた場合だけ入る */
  processed: PixelBuffer | null;
  warnings: string[];
}

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
 * シートを前処理する。別スレッドが使えない環境では、同じ処理をこのスレッドで行う。
 *
 * 環境によっては Worker を起動できないことがあるが、処理自体は同じ純粋関数なので
 * 結果は変わらない。動かないより、少し待たせてでも動くほうを選ぶ。
 */
export async function prepareInWorker(
  buffer: PixelBuffer,
  allowBackgroundRemoval: boolean,
): Promise<PrepareReply> {
  if (workerUsable) {
    try {
      return await requestFromWorker(buffer, allowBackgroundRemoval);
    } catch (cause) {
      console.warn('[RUHiA Sticker Studio] 別スレッドを使えないため、この画面で処理します', cause);
      workerUsable = false;
      worker = null;
    }
  }

  const result = prepareSheet(buffer, { ...DEFAULT_PREPARE_OPTIONS, allowBackgroundRemoval });
  return {
    status: result.status,
    outcome: result.outcome,
    processed: result.background === null ? null : result.buffer,
    warnings: result.background?.warnings ?? [],
  };
}

function requestFromWorker(
  buffer: PixelBuffer,
  allowBackgroundRemoval: boolean,
): Promise<PrepareReply> {
  const id = nextId++;
  const instance = getWorker();

  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<DetectResponse>): void => {
      if (event.data.id !== id) return;
      cleanup();
      resolve({
        status: event.data.status,
        outcome: event.data.outcome,
        processed: event.data.processed,
        warnings: event.data.warnings,
      });
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
      allowBackgroundRemoval,
    };
    instance.postMessage(request, [copy.buffer]);
  });
}
