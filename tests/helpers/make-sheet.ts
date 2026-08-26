import type { PixelBuffer, Rect } from '../../src/core/image/types.js';

export interface Shape extends Rect {
  /** 0-255。省略時は 250（実データに合わせ、255ではない） */
  alpha?: number;
}

/**
 * 合成シートを作る。
 *
 * 実画像に頼らず境界条件を意図的に作れるのが利点。
 * アルファ値の既定を255にしないのは、実測したAI生成画像の
 * 完全不透明画素が全体の0.12%しか無かったため。
 */
export function makeSheet(width: number, height: number, shapes: Shape[]): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);

  for (const shape of shapes) {
    const alpha = shape.alpha ?? 250;
    const x1 = Math.min(width, shape.x + shape.width);
    const y1 = Math.min(height, shape.y + shape.height);

    for (let y = Math.max(0, shape.y); y < y1; y++) {
      for (let x = Math.max(0, shape.x); x < x1; x++) {
        const i = (y * width + x) * 4;
        data[i] = 240;
        data[i + 1] = 200;
        data[i + 2] = 60;
        data[i + 3] = alpha;
      }
    }
  }

  return { data, width, height };
}

export interface GridOptions {
  /** シートの一辺 */
  size: number;
  /** シート外周の余白 */
  margin: number;
  /** スタンプ間の隙間 */
  gap: number;
  /** セル内でスタンプをどれだけ内側に置くか（0 = セルいっぱい） */
  inset?: number;
  /** 各セルの位置をずらす量。[cellIndex] = {dx, dy} */
  offsets?: Record<number, { dx: number; dy: number }>;
}

/** 3 × 3 に9個並べた合成シートと、その正解矩形を作る。 */
export function makeAlignedGrid(options: GridOptions): { buffer: PixelBuffer; expected: Rect[] } {
  const { size, margin, gap, inset = 0, offsets = {} } = options;
  const cell = Math.floor((size - margin * 2 - gap * 2) / 3);
  const shapes: Shape[] = [];
  const expected: Rect[] = [];

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cellIndex = row * 3 + col;
      const offset = offsets[cellIndex] ?? { dx: 0, dy: 0 };
      const rect: Rect = {
        x: margin + col * (cell + gap) + inset + offset.dx,
        y: margin + row * (cell + gap) + inset + offset.dy,
        width: cell - inset * 2,
        height: cell - inset * 2,
      };
      shapes.push(rect);
      expected.push(rect);
    }
  }

  return { buffer: makeSheet(size, size, shapes), expected };
}

/** 画像全体に薄いアルファを敷く（ドロップシャドウの再現）。 */
export function addFaintHaze(buffer: PixelBuffer, alpha: number): PixelBuffer {
  const data = new Uint8ClampedArray(buffer.data);
  for (let i = 0; i < buffer.width * buffer.height; i++) {
    const at = i * 4 + 3;
    if ((data[at] ?? 0) === 0) data[at] = alpha;
  }
  return { data, width: buffer.width, height: buffer.height };
}

/** ランダムではない、決まった位置に微小なノイズ点を打つ。 */
export function addSpeckles(buffer: PixelBuffer, alpha: number, step: number): PixelBuffer {
  const data = new Uint8ClampedArray(buffer.data);
  for (let y = step; y < buffer.height; y += step) {
    for (let x = step; x < buffer.width; x += step) {
      const at = (y * buffer.width + x) * 4 + 3;
      if ((data[at] ?? 0) === 0) data[at] = alpha;
    }
  }
  return { data, width: buffer.width, height: buffer.height };
}

/**
 * 行ごとに横位置をずらした3 × 3。
 *
 * 実測した自由配置シート（sheet-b）の構造を再現する。各行の隙間の位置が
 * ずれるため、縦一直線に空く列が存在せず、単純分割は成立しない。
 * それでもスタンプどうしは離れているので、まとめ上げなら扱える。
 */
export function makeStaggeredGrid(options: GridOptions & { rowShift: number }): {
  buffer: PixelBuffer;
  expected: Rect[];
} {
  const { size, margin, gap, inset = 0, rowShift } = options;
  const cell = Math.floor((size - margin * 2 - gap * 2) / 3);
  const shifts = [0, rowShift, -rowShift];
  const shapes: Shape[] = [];
  const expected: Rect[] = [];

  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      const rect: Rect = {
        x: margin + column * (cell + gap) + inset + (shifts[row] ?? 0),
        y: margin + row * (cell + gap) + inset,
        width: cell - inset * 2,
        height: cell - inset * 2,
      };
      shapes.push(rect);
      expected.push(rect);
    }
  }

  return { buffer: makeSheet(size, size, shapes), expected };
}
