import { prepareSheet } from '../../core/image/prepare.js';
import { DEFAULT_PREPARE_OPTIONS } from '../../core/image/prepare.js';
import type { PrepareStatus } from '../../core/image/prepare.js';
import type { DetectOutcome } from '../../core/image/detect.js';
import type { PixelBuffer } from '../../core/image/types.js';

export interface DetectRequest {
  id: number;
  buffer: { data: Uint8ClampedArray; width: number; height: number };
  /** 背景を抜いてよいか。ユーザーが指示したときだけ true */
  allowBackgroundRemoval: boolean;
}

export interface DetectResponse {
  id: number;
  status: PrepareStatus;
  outcome: DetectOutcome | null;
  /** 背景を抜いた場合だけ、抜いたあとの画素を返す */
  processed: { data: Uint8ClampedArray; width: number; height: number } | null;
  /** 背景を抜いたときの注意 */
  warnings: string[];
}

self.onmessage = (event: MessageEvent<DetectRequest>) => {
  const { id, buffer, allowBackgroundRemoval } = event.data;
  const pixels: PixelBuffer = buffer;

  const result = prepareSheet(pixels, { ...DEFAULT_PREPARE_OPTIONS, allowBackgroundRemoval });
  const removed = result.background !== null;

  const response: DetectResponse = {
    id,
    status: result.status,
    outcome: result.outcome,
    processed: removed
      ? { data: result.buffer.data, width: result.buffer.width, height: result.buffer.height }
      : null,
    warnings: result.background?.warnings ?? [],
  };

  // 抜いたあとの画素は所有権ごと渡す
  self.postMessage(response, removed ? [response.processed!.data.buffer] : []);
};
