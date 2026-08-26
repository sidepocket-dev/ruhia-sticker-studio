import { STICKERS_PER_SHEET } from '../../config/line-spec.js';
import { targetCount } from '../../state/project.js';
import { duplicateNotice, editText, planSheets } from '../../state/plan-store.js';

/** これから作る45個のセリフ一覧。その場で書き換えられる。 */
export function PlanList() {
  const sheets = planSheets.value;
  const target = targetCount.value;

  return (
    <div class="plan-list">
      {duplicateNotice.value && <p class="plan-list__notice">{duplicateNotice.value}</p>}

      {sheets.map((sheet, sheetIndex) => (
        <div key={sheetIndex} class="plan-list__sheet">
          <h4 class="plan-list__title">{sheetIndex + 1}枚目に入れる9個</h4>
          <ol class="plan-list__items">
            {sheet.map((plan) => (
              <li key={plan.id} class={plan.id > target ? 'plan-list__item--spare' : undefined}>
                <span class="plan-list__number">{String(plan.id).padStart(2, '0')}</span>
                <input
                  class="plan-list__text"
                  type="text"
                  value={plan.text}
                  aria-label={`${plan.id}番目のセリフ`}
                  onInput={(event) => editText(plan.id, (event.target as HTMLInputElement).value)}
                />
                <span class="plan-list__action">{plan.action}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}

      {sheets.length * STICKERS_PER_SHEET > target && (
        <p class="plan-list__spare-note">
          うすい色の{sheets.length * STICKERS_PER_SHEET - target}個は予備です。
          気に入らないものを外して、ちょうど{target}個にできます。
        </p>
      )}
    </div>
  );
}
