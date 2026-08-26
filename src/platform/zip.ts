import { zipSync } from 'fflate';
import { asBytes } from '../core/bytes.js';
import type { Bytes } from '../core/bytes.js';

export interface ZipEntry {
  name: string;
  bytes: Bytes;
}

/**
 * ZIPを作る。PNGは既に圧縮済みなので、再圧縮せずそのまま格納する
 * （時間がかかるだけで、ほとんど小さくならない）。
 */
export function createZip(entries: ZipEntry[]): Bytes {
  const files: Record<string, Uint8Array> = {};
  for (const entry of entries) files[entry.name] = entry.bytes;
  return asBytes(zipSync(files, { level: 0 }));
}

/** ブラウザにファイルとして保存させる。 */
export function downloadBytes(bytes: Bytes, fileName: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // 保存が始まるのを待ってから解放する
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
