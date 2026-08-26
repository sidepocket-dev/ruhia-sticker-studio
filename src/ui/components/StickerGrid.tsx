import type { ExtractedSticker } from '../../state/sheet-store.js';
import { isSelected, toggleSelection } from '../../state/export-store.js';

interface Props {
  stickers: ExtractedSticker[];
}

/** 取り出したスタンプを3 × 3 で並べ、使うものを選んでもらう。 */
export function StickerGrid({ stickers }: Props) {
  return (
    <ul class="sticker-grid">
      {stickers.map((sticker, index) => {
        const selected = isSelected(sticker.region.cellIndex);
        const needsCheck = sticker.region.confidence < 0.7;
        return (
          <li key={sticker.region.cellIndex}>
            <label class={`sticker-card${selected ? ' sticker-card--selected' : ''}`}>
              <input
                type="checkbox"
                class="visually-hidden"
                checked={selected}
                onChange={() => toggleSelection(sticker.region.cellIndex)}
              />
              <span class="sticker-card__frame">
                <img
                  class="sticker-card__image"
                  src={sticker.previewUrl}
                  alt={`スタンプ ${index + 1}`}
                />
                <span class="sticker-card__check" aria-hidden="true">
                  {selected ? '✓' : ''}
                </span>
              </span>
              <span class="sticker-card__meta">
                <span class="sticker-card__number">{String(index + 1).padStart(2, '0')}</span>
                {needsCheck && <span class="sticker-card__warning">要確認</span>}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
