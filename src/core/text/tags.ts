import { STICKER_CATEGORIES } from './categories.js';
import type { CategoryId } from './categories.js';
import type { StickerPlan } from './plan.js';

/**
 * LINEのタグ設定を手伝うための下書き（§77.23）。
 *
 * LINE Creators Market では、スタンプ1個につき3個までタグを付けられる。
 * トークで文字を打ったときの変換候補に出るようになるため、付けると露出が増える。
 *
 * ただし**タグは自由入力ではなく、300種類以上ある一覧から選ぶ**。
 * 一覧は長く、探すのに「ページ内検索」を使うのが定石になっている。
 *
 * そこでこのアプリは、**探すときの手がかりになる言葉**を出す。
 * ここに出す言葉がそのままLINEのタグ名だとは限らない。
 * 検索の足がかりであって、タグそのものではない。
 *
 * 手がかりは2つ。
 *
 *   1. セリフそのもの。トークで打つ言葉と、タグが合っているのが本来の形
 *   2. 種類の名前（あいさつ・お礼など）。セリフで見つからないときの広い言葉
 *
 * 種類の名前は普段UIに出さないが（原仕様 §4）、ここでは
 * 「このスタンプの分類」ではなく「探すための言葉」として出すので例外とする。
 */
export interface TagDraft {
  /** 提出順の番号（1始まり）。ZIP内の 01.png と一致する */
  id: number;
  text: string;
  /** タグを探す手がかり。多い順ではなく、狭い言葉から並べる */
  words: string[];
}

function categoryLabel(id: CategoryId): string {
  return STICKER_CATEGORIES.find((category) => category.id === id)?.label ?? '';
}

export function buildTagDrafts(plans: readonly StickerPlan[]): TagDraft[] {
  return plans.map((plan, index) => {
    const label = categoryLabel(plan.category);
    // セリフと種類が同じ言葉になることがある。同じものを2つ出さない
    const words = label && label !== plan.text ? [plan.text, label] : [plan.text];
    return { id: index + 1, text: plan.text, words };
  });
}

/** 下書きをテキストにする。LINEのサイトを開く前に手元へ置いておくためのもの。 */
export function buildTagsTxt(plans: readonly StickerPlan[]): string {
  const drafts = buildTagDrafts(plans);
  const lines = drafts.map(
    (draft) => `${String(draft.id).padStart(2, '0')} ${draft.words.join(' / ')}`,
  );
  return [
    '# タグを探すときの手がかり',
    '#',
    '# LINEのタグは一覧から選ぶ形式です。ここの言葉をコピーして、',
    '# ページ内検索（Ctrl+F / ⌘F）で一覧から探すと早く見つかります。',
    '# 同じ言葉が一覧にないときは、近い言葉を選んでください。',
    '',
    ...lines,
    '',
  ].join('\n');
}
