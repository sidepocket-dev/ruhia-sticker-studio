import { LINE_STATIC_STICKER_SPEC, isAllowedStickerCount, stickerFileName } from '../../config/line-spec.js';
import type { Bytes } from '../bytes.js';
import { PNG_COLOR_TYPE_RGBA, readPngInfo } from './png-info.js';

/** 規格違反。原則として書き出せない（PRODUCT_SPEC.md §47）。 */
export interface ValidationError {
  kind: 'error';
  message: string;
}

/** 品質の懸念。書き出しは可能。 */
export interface ValidationWarning {
  kind: 'warning';
  message: string;
}

export type ValidationIssue = ValidationError | ValidationWarning;

export interface ValidationReport {
  issues: ValidationIssue[];
  /** 書き出してよいか */
  canExport: boolean;
}

/** 検証にかける、書き出し済みの1枚。 */
export interface ExportedImage {
  name: string;
  bytes: Bytes;
}

export interface ExportCandidate {
  targetCount: number;
  stickers: ExportedImage[];
  main: ExportedImage | null;
  tab: ExportedImage | null;
  /** ZIP全体の見込みバイト数 */
  totalBytes: number;
}

/**
 * 書き出し前の確認（PRODUCT_SPEC.md §46）。
 *
 * 自分で生成した画像であっても、実際のバイト列を読んで検証する。
 * 文言は技術用語を使わず、何をすればよいかが分かる形にする（§63）。
 */
export function validateExport(candidate: ExportCandidate): ValidationReport {
  const issues: ValidationIssue[] = [];
  const spec = LINE_STATIC_STICKER_SPEC;

  // 枚数
  if (!isAllowedStickerCount(candidate.targetCount)) {
    issues.push(error(`${candidate.targetCount}個のセットはLINEでは作れません。`));
  }
  const shortfall = candidate.targetCount - candidate.stickers.length;
  if (shortfall > 0) {
    issues.push(error(`${candidate.targetCount}個セットには、あと${shortfall}個必要です。`));
  } else if (shortfall < 0) {
    issues.push(error(`${-shortfall}個多く選ばれています。あと${-shortfall}個外してください。`));
  }

  // スタンプ画像
  candidate.stickers.forEach((image, index) => {
    const label = `${stickerFileName(index + 1)}（${index + 1}個目）`;
    checkPng(issues, image, label, (info) => {
      if (info.width > spec.sticker.maxWidth || info.height > spec.sticker.maxHeight) {
        issues.push(error(`${label}の画像が大きすぎます。`));
      }
    });
    if (image.bytes.byteLength > spec.sticker.maxBytes) {
      issues.push(error(`${label}のファイルサイズが大きすぎます。`));
    }
  });

  // メイン画像
  if (!candidate.main) {
    issues.push(error('メイン画像が選ばれていません。'));
  } else {
    checkPng(issues, candidate.main, 'メイン画像', (info) => {
      if (info.width !== spec.main.width || info.height !== spec.main.height) {
        issues.push(error('メイン画像のサイズが違います。'));
      }
    });
  }

  // タブ画像
  if (!candidate.tab) {
    issues.push(error('タブ画像が選ばれていません。'));
  } else {
    checkPng(issues, candidate.tab, 'タブ画像', (info) => {
      if (info.width !== spec.tab.width || info.height !== spec.tab.height) {
        issues.push(error('タブ画像のサイズが違います。'));
      }
    });
  }

  // ZIP全体
  if (candidate.totalBytes > spec.zipMaxBytes) {
    issues.push(error('データ全体が大きすぎます。スタンプの数を減らしてください。'));
  }

  return { issues, canExport: !issues.some((issue) => issue.kind === 'error') };
}

function checkPng(
  issues: ValidationIssue[],
  image: ExportedImage,
  label: string,
  extra: (info: NonNullable<ReturnType<typeof readPngInfo>>) => void,
): void {
  const info = readPngInfo(image.bytes);
  if (!info) {
    issues.push(error(`${label}を書き出せませんでした。`));
    return;
  }
  if (info.colorType !== PNG_COLOR_TYPE_RGBA) {
    issues.push(error(`${label}の背景が透明になっていません。`));
  }
  if (info.width % 2 !== 0 || info.height % 2 !== 0) {
    issues.push(error(`${label}のサイズが偶数になっていません。`));
  }
  extra(info);
}

function error(message: string): ValidationError {
  return { kind: 'error', message };
}

export function warning(message: string): ValidationWarning {
  return { kind: 'warning', message };
}
