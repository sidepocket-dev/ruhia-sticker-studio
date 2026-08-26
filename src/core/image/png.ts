import { zlibSync } from 'fflate';
import { asBytes } from '../bytes.js';
import type { Bytes } from '../bytes.js';
import type { PixelBuffer } from './types.js';

/**
 * RGBA画素からPNGを組み立てる。
 *
 * ブラウザの `convertToBlob` を使わない理由は2つ。
 *
 * 1. 実測で、大きな画像から切り出したキャンバスに対して1枚あたり約1秒かかった。
 *    40個セットの書き出しが41秒かかり、実用に耐えなかった。
 * 2. 出力形式をこちらで保証できる。LINEは8bit・背景透過を求めるため、
 *    カラータイプ6（RGBA）・ビット深度8で必ず書き出す必要がある。
 *
 * DOMに依存しない純粋関数なので、そのまま単体テストできる。
 */
export function encodePng(buffer: PixelBuffer): Bytes {
  const { width, height, data } = buffer;
  const raw = applyFilters(data, width, height);
  const compressed = zlibSync(raw, { level: 6 });

  const ihdr = new Uint8Array(13);
  writeUint32(ihdr, 0, width);
  writeUint32(ihdr, 4, height);
  ihdr[8] = 8; // ビット深度
  ihdr[9] = 6; // カラータイプ 6 = RGBA
  ihdr[10] = 0; // 圧縮方式
  ihdr[11] = 0; // フィルタ方式
  ihdr[12] = 0; // インターレースなし

  const chunks = [
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', new Uint8Array(0)),
  ];

  const total = 8 + chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  out.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);

  let offset = 8;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }

  return asBytes(out);
}

/**
 * 各行にフィルタを掛ける。
 *
 * PNGは行ごとにフィルタ方式を選べる。差分の絶対値の合計が最も小さいものを選ぶ
 * （PNG仕様が推奨する一般的な方法）。透明な余白の多い画像ではよく効く。
 */
function applyFilters(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const stride = width * 4;
  const out = new Uint8Array((stride + 1) * height);
  const candidate = new Uint8Array(stride);
  const best = new Uint8Array(stride);

  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    const previousStart = rowStart - stride;
    let bestType = 0;
    let bestScore = Infinity;

    for (let type = 0; type <= 4; type++) {
      let score = 0;
      for (let i = 0; i < stride; i++) {
        const value = data[rowStart + i] ?? 0;
        const left = i >= 4 ? (data[rowStart + i - 4] ?? 0) : 0;
        const up = y > 0 ? (data[previousStart + i] ?? 0) : 0;
        const upLeft = y > 0 && i >= 4 ? (data[previousStart + i - 4] ?? 0) : 0;

        let filtered: number;
        switch (type) {
          case 1:
            filtered = value - left;
            break;
          case 2:
            filtered = value - up;
            break;
          case 3:
            filtered = value - ((left + up) >> 1);
            break;
          case 4:
            filtered = value - paeth(left, up, upLeft);
            break;
          default:
            filtered = value;
        }

        const byte = filtered & 0xff;
        candidate[i] = byte;
        // 0 に近いほど圧縮しやすい。符号付きとみなして絶対値を足す
        score += byte < 128 ? byte : 256 - byte;
      }

      if (score < bestScore) {
        bestScore = score;
        bestType = type;
        best.set(candidate);
      }
    }

    out[y * (stride + 1)] = bestType;
    out.set(best, y * (stride + 1) + 1);
  }

  return out;
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const distanceLeft = Math.abs(estimate - left);
  const distanceUp = Math.abs(estimate - up);
  const distanceUpLeft = Math.abs(estimate - upLeft);
  if (distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft) return left;
  return distanceUp <= distanceUpLeft ? up : upLeft;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  writeUint32(out, 0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  writeUint32(out, 8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function writeUint32(target: Uint8Array, offset: number, value: number): void {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let value = i;
    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ (CRC_TABLE[(crc ^ (bytes[i] ?? 0)) & 0xff] ?? 0);
  }
  return (crc ^ -1) >>> 0;
}
