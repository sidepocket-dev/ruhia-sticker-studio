import type { SheetEntry } from '../../state/sheet-store.js';
import { isSelected, plannedTextByCandidate, toggleSelection } from '../../state/export-store.js';

interface Props {
  sheet: SheetEntry;
  /** このシートの1個目が、全体で何番目の候補か（1始まり） */
  startNumber: number;
}

/** 1枚のシートから取り出したスタンプを3 × 3 で並べ、使うものを選んでもらう。 */
export function StickerGrid({ sheet, startNumber }: Props) {
  return (
    <ul class="sticker-grid">
      {sheet.stickers.map((sticker, index) => {
        const selected = isSelected(sticker.id);
        const needsCheck = sticker.region.confidence < 0.7;
        const number = startNumber + index;
        const plannedText = plannedTextByCandidate.value.get(sticker.id);
        return (
          <li key={sticker.id}>
            <label class={`sticker-card${selected ? ' sticker-card--selected' : ''}`}>
              <input
                type="checkbox"
                class="visually-hidden"
                checked={selected}
                onChange={() => toggleSelection(sticker.id)}
              />
              <span class="sticker-card__frame">
                <img class="sticker-card__image" src={sticker.previewUrl} alt={`候補 ${number}`} />
                <span class="sticker-card__check" aria-hidden="true">
                  {selected ? '✓' : ''}
                </span>
              </span>
              <span class="sticker-card__meta">
                <span class="sticker-card__number">{String(number).padStart(2, '0')}</span>
                {plannedText && <span class="sticker-card__text">{plannedText}</span>}
                {needsCheck && <span class="sticker-card__warning">要確認</span>}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
