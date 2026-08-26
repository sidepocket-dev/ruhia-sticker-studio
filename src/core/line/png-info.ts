/** PNGの先頭から読み取れる情報。書き出した画像を実地で検証するために使う。 */
export interface PngInfo {
  width: number;
  height: number;
  /** PNGのカラータイプ。6 = RGBA */
  colorType: number;
  /** 1チャンネルあたりのビット数 */
  bitDepth: number;
}

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** RGBA（アルファつきトゥルーカラー）を表すカラータイプ */
export const PNG_COLOR_TYPE_RGBA = 6;

/**
 * PNGのヘッダ（IHDR）を読む。PNGでなければ null。
 *
 * 自分で書き出した画像であっても、実際のバイト列を検証する。
 * 「そう書いたつもり」と「実際にそうなっている」は別物のため。
 */
export function readPngInfo(bytes: Uint8Array): PngInfo | null {
  if (bytes.length < 26) return null;
  for (let i = 0; i < SIGNATURE.length; i++) {
    if (bytes[i] !== SIGNATURE[i]) return null;
  }
  // 8-11: チャンク長, 12-15: チャンク種別 "IHDR"
  if (bytes[12] !== 0x49 || bytes[13] !== 0x48 || bytes[14] !== 0x44 || bytes[15] !== 0x52) {
    return null;
  }

  return {
    width: readUint32(bytes, 16),
    height: readUint32(bytes, 20),
    bitDepth: bytes[24] ?? 0,
    colorType: bytes[25] ?? 0,
  };
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) << 24) |
    ((bytes[offset + 1] ?? 0) << 16) |
    ((bytes[offset + 2] ?? 0) << 8) |
    (bytes[offset + 3] ?? 0)
  ) >>> 0;
}
