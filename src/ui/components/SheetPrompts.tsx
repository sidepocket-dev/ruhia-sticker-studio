import { planSheets, stickerPrompts } from '../../state/plan-store.js';
import { CopyButton } from './CopyButton.js';

/**
 * シートごとの画像生成プロンプト（PRODUCT_SPEC.md §32）。
 *
 * 「このプロンプトなら必ず成功する」とは書かない（§34）。
 */
export function SheetPrompts() {
  const sheets = planSheets.value;

  return (
    <div class="sheet-prompts">
      <p>
        キャラクターの絵を1枚用意して、下の文章と一緒にChatGPTなどへ渡してください。
        1枚ずつ作って、できたシートをこのあと読み込みます。
      </p>

      {stickerPrompts.value.map((item, index) => (
        <details key={item.sheet} class="sheet-prompts__item">
          <summary>
            <span class="sheet-prompts__number">{item.sheet}枚目</span>
            <span class="sheet-prompts__texts">
              {(sheets[index] ?? []).map((plan) => plan.text).join('・')}
            </span>
          </summary>
          <div class="sheet-prompts__body">
            <CopyButton text={item.prompt} label={`${item.sheet}枚目のプロンプトをコピー`} />
            <textarea readOnly rows={10} value={item.prompt} />
          </div>
        </details>
      ))}

      <p class="sheet-prompts__note">
        これは推奨する文章です。画像生成AIの動きは変わることがあるため、
        思ったとおりにならない場合は文章を書き換えてお試しください。
      </p>
    </div>
  );
}
