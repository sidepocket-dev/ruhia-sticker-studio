/**
 * バイト列。
 *
 * TypeScript 5.7 以降 Uint8Array は裏づけとなるバッファで型が分かれる。
 * Blob へ渡せるのは ArrayBuffer 版だけなので、扱う型をこちらへ揃える。
 */
export type Bytes = Uint8Array<ArrayBuffer>;

/**
 * SharedArrayBuffer の可能性を含む型を、ArrayBuffer 前提の型へ揃える。
 * 実際に SharedArrayBuffer 上に確保することはないが、外部ライブラリの型定義が
 * 両方を含む形になっているため、コピーせずに橋渡しする。
 */
export function asBytes(view: Uint8Array): Bytes {
  return new Uint8Array(view.buffer as ArrayBuffer, view.byteOffset, view.byteLength);
}
