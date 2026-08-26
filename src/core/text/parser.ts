/**
 * ChatGPTの回答をそのまま貼り付けて読み取る（PRODUCT_SPEC.md §26 / §27）。
 *
 * JSONを要求しない。番号の書き方や区切り記号のゆれ、見出しや前置きの混在を
 * 受け入れる。ユーザーに形式を守らせるより、こちらが合わせるほうが早い。
 */

export interface ParsedLine {
  /** 書かれていた番号。読み取れなければ順番で補う */
  number: number;
  text: string;
  /** 「｜」などの後ろに書かれた動作の説明。無ければ空 */
  action: string;
  /** 元の行（修正UIで見せる） */
  source: string;
  /** 元テキストでの行番号（1始まり） */
  lineNumber: number;
}

export interface FailedLine {
  lineNumber: number;
  source: string;
  reason: 'no-text';
}

export interface ParseResult {
  entries: ParsedLine[];
  failed: FailedLine[];
}

/** 全角の数字・記号を半角へそろえる。 */
function normalizeWidth(value: string): string {
  return value.replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );
}

/** ①②③ のような丸数字を数値にする。 */
function circledToNumber(char: string): number | null {
  const code = char.codePointAt(0);
  if (code === undefined) return null;
  if (code >= 0x2460 && code <= 0x2473) return code - 0x2460 + 1; // ①〜⑳
  if (code >= 0x3251 && code <= 0x325f) return code - 0x3251 + 21; // ㉑〜㉟
  if (code >= 0x32b1 && code <= 0x32bf) return code - 0x32b1 + 36; // ㊱〜㊿
  return null;
}

/** 本文と動作の区切りに使われうる記号。 */
const SEPARATORS = ['｜', '|', '：', ':', '／', '/', '－', '−', '–', '—', '-', '＝', '='];

/** 見出しや箇条書きの飾りだけの行かどうか。 */
function isDecorationLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed === '') return true;
  if (/^#{1,6}\s/.test(trimmed)) return true; // Markdown見出し
  if (/^[-*_=—─]{3,}$/.test(trimmed)) return true; // 区切り線
  if (/^(グループ|セット|シート|カテゴリ)/.test(trimmed) && !hasNumberPrefix(trimmed)) return true;
  return false;
}

interface NumberPrefix {
  number: number;
  rest: string;
}

/** 行頭の番号を読み取る。番号が無ければ null。 */
function readNumberPrefix(line: string): NumberPrefix | null {
  const trimmed = line.trim().replace(/^[-*・•]\s*/, '');

  const circled = circledToNumber(trimmed.slice(0, 2)) ?? circledToNumber(trimmed.slice(0, 1));
  if (circled !== null) {
    const width = circledToNumber(trimmed.slice(0, 1)) !== null ? 1 : 2;
    return { number: circled, rest: trimmed.slice(width).replace(/^[.．)）:：、,]\s*/, '').trim() };
  }

  const normalized = normalizeWidth(trimmed);
  const match = /^(\d{1,3})\s*[.．)）:：、,]?\s+?(.*)$/.exec(normalized) ?? /^(\d{1,3})\s*[.．)）:：、,]\s*(.*)$/.exec(normalized);
  if (!match) return null;

  const number = Number(match[1]);
  if (!Number.isFinite(number)) return null;
  return { number, rest: (match[2] ?? '').trim() };
}

function hasNumberPrefix(line: string): boolean {
  return readNumberPrefix(line) !== null;
}

/** 「」や引用符を外す。 */
function stripQuotes(value: string): string {
  return value
    .trim()
    .replace(/^[「『“"'（(]+/, '')
    .replace(/[」』”"'）)]+$/, '')
    .trim();
}

/** 本文と動作を分ける。 */
function splitTextAndAction(value: string): { text: string; action: string } {
  for (const separator of SEPARATORS) {
    const index = value.indexOf(separator);
    // 先頭が区切り記号の行は分割しない（本文が空になってしまう）
    if (index > 0) {
      return {
        text: stripQuotes(value.slice(0, index)),
        action: stripQuotes(value.slice(index + separator.length)),
      };
    }
  }
  return { text: stripQuotes(value), action: '' };
}

/**
 * 貼り付けられた文章を解析する。
 *
 * 番号つきの行が1つも無い場合だけ、飾りでない行を上から順に項目とみなす。
 * 番号なしの箇条書きを貼られても読み取れるようにするため。
 */
export function parsePastedText(input: string): ParseResult {
  const lines = input.split(/\r?\n/);
  const entries: ParsedLine[] = [];
  const failed: FailedLine[] = [];

  const numbered: { lineNumber: number; source: string; prefix: NumberPrefix }[] = [];
  for (let index = 0; index < lines.length; index++) {
    const source = lines[index] ?? '';
    if (isDecorationLine(source)) continue;
    const prefix = readNumberPrefix(source);
    if (prefix) numbered.push({ lineNumber: index + 1, source, prefix });
  }

  if (numbered.length > 0) {
    for (const item of numbered) {
      const { text, action } = splitTextAndAction(item.prefix.rest);
      if (text === '') {
        failed.push({ lineNumber: item.lineNumber, source: item.source, reason: 'no-text' });
        continue;
      }
      entries.push({
        number: item.prefix.number,
        text,
        action,
        source: item.source,
        lineNumber: item.lineNumber,
      });
    }
    return { entries, failed };
  }

  // 番号がまったく無い場合の受け皿
  let position = 0;
  for (let index = 0; index < lines.length; index++) {
    const source = lines[index] ?? '';
    if (isDecorationLine(source)) continue;
    const { text, action } = splitTextAndAction(source.trim().replace(/^[-*・•]\s*/, ''));
    if (text === '') continue;
    position++;
    entries.push({ number: position, text, action, source, lineNumber: index + 1 });
  }

  return { entries, failed };
}

/** 解析結果の件数に対する案内文（PRODUCT_SPEC.md §28）。 */
export function describeParseResult(found: number, needed: number): string {
  if (found === needed) return `${found}件読み込みました`;
  if (found < needed) return `${found}件読み込みました。あと${needed - found}件必要です。`;
  return `${found}件あります。使用する${needed}件を選んでください。`;
}
