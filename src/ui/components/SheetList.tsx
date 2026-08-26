import { moveSheet, removeSheet, sheets } from '../../state/sheet-store.js';
import { requiredSheets } from '../../state/project.js';

/**
 * 読み込んだシートの一覧。順番はスタンプの通し番号に対応する。
 *
 * 並び替えにドラッグではなくボタンを使うのは、対象が最大5枚と少なく、
 * 「前へ / 後へ」のほうが操作が明確で、キーボードでもそのまま使えるため
 * （PRODUCT_SPEC.md §77.13）。
 */
export function SheetList() {
  const list = sheets.value;
  const needed = requiredSheets.value;

  return (
    <ol class="sheet-list">
      {list.map((sheet, index) => (
        <li key={sheet.id} class="sheet-list__item">
          <span class="sheet-list__badge">{index + 1}</span>
          <span class="sheet-list__body">
            <span class="sheet-list__name">{sheet.name}</span>
            <span class="sheet-list__count">
              {sheet.stickers.length}個 · {index * 9 + 1}〜{index * 9 + sheet.stickers.length}番
            </span>
          </span>
          <span class="sheet-list__actions">
            <button
              type="button"
              class="icon-button"
              aria-label={`${sheet.name} を前へ`}
              disabled={index === 0}
              onClick={() => moveSheet(index, index - 1)}
            >
              ↑
            </button>
            <button
              type="button"
              class="icon-button"
              aria-label={`${sheet.name} を後へ`}
              disabled={index === list.length - 1}
              onClick={() => moveSheet(index, index + 1)}
            >
              ↓
            </button>
            <button
              type="button"
              class="icon-button"
              aria-label={`${sheet.name} を取り除く`}
              onClick={() => removeSheet(sheet.id)}
            >
              ✕
            </button>
          </span>
        </li>
      ))}

      {Array.from({ length: Math.max(0, needed - list.length) }, (_, index) => (
        <li key={`missing-${index}`} class="sheet-list__item sheet-list__item--missing">
          <span class="sheet-list__badge">{list.length + index + 1}</span>
          <span class="sheet-list__body">
            <span class="sheet-list__name">まだ読み込んでいません</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
