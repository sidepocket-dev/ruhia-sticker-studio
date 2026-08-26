/**
 * セリフの重複を見つける（PRODUCT_SPEC.md §29）。
 *
 * v1では日本語の意味解析はしない。表記ゆれをそろえたうえでの一致と、
 * 片方がもう片方をまるごと含む場合だけを見る。
 * 意味の重複は、そもそも枠を先に決めることで起きにくくしている。
 */

export interface DuplicateGroup {
  /** そろえたあとの文字列 */
  normalized: string;
  /** 重複していた項目の位置（0始まり） */
  indexes: number[];
  kind: 'same' | 'contained';
}

/**
 * 表記のゆれをそろえる。
 * 全角半角、かぎかっこ、末尾の記号、空白を取り除く。
 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[「」『』“”"'（）()]/g, '')
    .replace(/[!！?？…。、.,~〜ー♪♡★☆]+$/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .trim();
}

/** 完全一致と、片方がもう片方を含む組を見つける。 */
export function findDuplicates(texts: readonly string[]): DuplicateGroup[] {
  const normalized = texts.map(normalizeText);
  const groups: DuplicateGroup[] = [];

  const byValue = new Map<string, number[]>();
  normalized.forEach((value, index) => {
    if (value === '') return;
    const found = byValue.get(value);
    if (found) found.push(index);
    else byValue.set(value, [index]);
  });

  const alreadySame = new Set<number>();
  for (const [value, indexes] of byValue) {
    if (indexes.length < 2) continue;
    groups.push({ normalized: value, indexes, kind: 'same' });
    for (const index of indexes) alreadySame.add(index);
  }

  // 片方がもう片方を含む場合（「ありがとう」と「ありがとうございます」など）
  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const left = normalized[i] ?? '';
      const right = normalized[j] ?? '';
      if (left === '' || right === '' || left === right) continue;
      if (alreadySame.has(i) && alreadySame.has(j)) continue;

      const shorter = left.length <= right.length ? left : right;
      const longer = left.length <= right.length ? right : left;
      // 短すぎる文字列は偶然含まれやすいので対象にしない
      if (shorter.length < 3) continue;
      if (longer.includes(shorter)) {
        groups.push({ normalized: shorter, indexes: [i, j], kind: 'contained' });
      }
    }
  }

  return groups;
}

/** 重複の説明文。技術用語を使わない（PRODUCT_SPEC.md §63）。 */
export function describeDuplicates(groups: readonly DuplicateGroup[]): string {
  if (groups.length === 0) return '';
  const same = groups.filter((group) => group.kind === 'same').length;
  const contained = groups.length - same;

  const parts: string[] = [];
  if (same > 0) parts.push(`同じセリフが${same}組`);
  if (contained > 0) parts.push(`似ているセリフが${contained}組`);
  return `${parts.join('、')}あります。使うものを選び直すと、より使いやすいセットになります。`;
}
