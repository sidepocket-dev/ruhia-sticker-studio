import type { SheetEntry } from '../../state/sheet-store.js';
import { isSelected, planByCandidate, toggleSelection } from '../../state/export-store.js';
import { editText } from '../../state/plan-store.js';

interface Props {
  sheet: SheetEntry;
  /** このシートの1個目が、全体で何番目の候補か（1始まり） */
  startNumber: number;
}

/**
 * 1枚のシートから取り出したスタンプを3 × 3 で並べ、使うものを選んでもらう。
 *
 * セリフはその場で直せる。絵から文字を読み取っているわけではなく、
 * 「何番目の候補は何番目の計画」という位置の対応で当てているだけなので、
 * AIが順番や文言を変えていればずれる。絵と文字が並んでいれば
 * ずれはひと目で分かるので、その場で直せるようにしておく（PRODUCT_SPEC.md §77.10）。
 */
export function StickerGrid({ sheet, startNumber }: Props) {
  const plans = planByCandidate.value;

  return (
    <ul class="sticker-grid">
      {sheet.stickers.map((sticker, index) => {
        const selected = isSelected(sticker.id);
        const needsCheck = sticker.region.confidence < 0.7;
        const number = startNumber + index;
        const plan = plans.get(sticker.id);

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
            </label>

            <div class="sticker-card__meta">
              <span class="sticker-card__number">{String(number).padStart(2, '0')}</span>
              {plan && (
                <input
                  class="sticker-card__text"
                  type="text"
                  value={plan.text}
                  aria-label={`候補 ${number} のセリフ`}
                  onInput={(event) => editText(plan.id, (event.target as HTMLInputElement).value)}
                />
              )}
              {needsCheck && <span class="sticker-card__warning">要確認</span>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
