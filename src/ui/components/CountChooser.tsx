import { LINE_STATIC_STICKER_SPEC } from '../../config/line-spec.js';
import { requiredSheets, setTargetCount, targetCount } from '../../state/project.js';
import { sheetCountFor } from '../../config/line-spec.js';

/** 作るスタンプの個数を選ぶ。LINEが受け付ける数だけを並べる。 */
export function CountChooser() {
  return (
    <div>
      <div class="count-chooser" role="group" aria-label="作るスタンプの個数">
        {LINE_STATIC_STICKER_SPEC.allowedCounts.map((count) => (
          <button
            key={count}
            type="button"
            class={`count-chooser__item${count === targetCount.value ? ' count-chooser__item--on' : ''}`}
            aria-pressed={count === targetCount.value}
            onClick={() => setTargetCount(count)}
          >
            <span class="count-chooser__number">{count}</span>
            <span class="count-chooser__unit">個</span>
            <span class="count-chooser__sheets">シート{sheetCountFor(count)}枚</span>
          </button>
        ))}
      </div>
      <p class="count-chooser__note">
        1枚のシートから9個取り出します。{targetCount.value}個作るには
        {requiredSheets.value}枚必要です。
      </p>
    </div>
  );
}
