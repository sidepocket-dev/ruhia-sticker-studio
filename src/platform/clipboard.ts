/**
 * 文字列をクリップボードへ入れる。
 *
 * 環境によっては新しい方式が使えないため、古い方式へ落とす。
 * どちらも失敗したら false を返し、UI側で「手で選んでコピーしてください」と案内する。
 */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // 古い方式へ落とす
  }

  try {
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    return copied;
  } catch {
    return false;
  }
}

/** テキストをファイルとして保存させる。 */
export function downloadText(value: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([value], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
