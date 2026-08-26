import { detectAlignedSheet } from '../../core/image/detect.js';
import type { DetectOutcome } from '../../core/image/detect.js';
import type { PixelBuffer } from '../../core/image/types.js';

export interface DetectRequest {
  id: number;
  buffer: { data: Uint8ClampedArray; width: number; height: number };
}

export interface DetectResponse {
  id: number;
  outcome: DetectOutcome;
}

self.onmessage = (event: MessageEvent<DetectRequest>) => {
  const { id, buffer } = event.data;
  const pixels: PixelBuffer = buffer;
  const response: DetectResponse = { id, outcome: detectAlignedSheet(pixels) };
  self.postMessage(response);
};
