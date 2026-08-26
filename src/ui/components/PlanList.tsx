import { useState } from 'preact/hooks';
import { STICKERS_PER_SHEET } from '../../config/line-spec.js';
import { targetCount } from '../../state/project.js';
import {
  duplicateGroups,
  duplicateNotice,
  editText,
  planSheets,
  revertDuplicates,
} from '../../state/plan-store.js';

/**
 * これから作る45個のセリフ一覧。その場で書き換えられる。
 *
 * 既定ではたたんでおく。用途を選べば中身は自動で決まるので、
 * 多くの人は開かずに先へ進める。45行を常に出すと、
 * 小さい画面では画面が延々と続いてしまう。
 * ただし重複の知らせがあるときは、開かないと直せないので必ず出す。
 */
export function PlanList() {
  const sheets = planSheets.value;
  const target = targetCount.value;
  const total = sheets.reduce((sum, sheet) => sum + sheet.length, 0);
  const [open, setOpen] = useState(false);
  const hasNotice = duplicateNotice.value !== '';

  if (!open && !hasNotice) {
    return (
      <button type="button" class="collapse" aria-expanded={false} onClick={() => setOpen(true)}>
        <span class="collapse__caret" aria-hidden="true">▸</span>
        <span class="collapse__label">セリフを見る・直す</span>
        <span class="collapse__summary">
          {total}個ぶん用意しました（{sheets[0]?.slice(0, 3).map((plan) => plan.text).join('・')}…）
        </span>
      </button>
    );
  }

  return (
    <div class="plan-list">
      {!hasNotice && (
        <button type="button" class="collapse" aria-expanded onClick={() => setOpen(false)}>
          <span class="collapse__caret" aria-hidden="true">▾</span>
          <span class="collapse__label">セリフを見る・直す</span>
        </button>
      )}
      {duplicateNotice.value && (
        <div class="plan-list__notice">
          <p>{duplicateNotice.value}</p>
          <ul>
            {duplicateGroups.value.map((group) => (
              <li key={`${group.kind}-${group.numbers.join('-')}`}>
                {group.numbers.map((number) => String(number).padStart(2, '0')).join('、')}番
                　{group.text}
              </li>
            ))}
          </ul>
          <button type="button" class="button button--quiet" onClick={revertDuplicates}>
            同じになっている分を、もとのセリフに戻す
          </button>
        </div>
      )}

      {sheets.map((sheet, sheetIndex) => (
        <div key={sheetIndex} class="plan-list__sheet">
          <h3 class="plan-list__title">{sheetIndex + 1}枚目に入れる9個</h3>
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
