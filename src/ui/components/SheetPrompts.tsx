import { useState } from 'preact/hooks';
import type { StickerPlan } from '../../core/text/plan.js';
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

      <ol class="sheet-prompts__list">
        {stickerPrompts.value.map((item, index) => (
          <SheetPromptRow
            key={item.sheet}
            sheet={item.sheet}
            prompt={item.prompt}
            plans={sheets[index] ?? []}
          />
        ))}
      </ol>

      <p class="sheet-prompts__note">
        これは推奨する文章です。画像生成AIの動きは変わることがあるため、
        思ったとおりにならない場合は文章を書き換えてお試しください。
      </p>
    </div>
  );
}

interface RowProps {
  sheet: number;
  prompt: string;
  plans: StickerPlan[];
}

/**
 * 1枚分の行。
 *
 * いちばんやりたいことは「コピーする」なので、そのボタンは常に見えるところに置く。
 * 文章そのものは確認したいときだけ開けばよい。
 */
function SheetPromptRow({ sheet, prompt, plans }: RowProps) {
  const [open, setOpen] = useState(false);
  const textareaId = `sheet-prompt-${sheet}`;

  return (
    <li class="sheet-prompts__item">
      <div class="sheet-prompts__row">
        <span class="sheet-prompts__number">{sheet}枚目</span>
        <span class="sheet-prompts__texts">{plans.map((plan) => plan.text).join('・')}</span>
        <span class="sheet-prompts__actions">
          <CopyButton text={prompt} label="プロンプトをコピー" />
          <button
            type="button"
            class="sheet-prompts__toggle"
            aria-expanded={open}
            aria-controls={textareaId}
            onClick={() => setOpen(!open)}
          >
            <span class="sheet-prompts__caret" aria-hidden="true">
              {open ? '▾' : '▸'}
            </span>
            文章を見る
          </button>
        </span>
      </div>

      {open && (
        <textarea id={textareaId} readOnly rows={12} value={prompt} />
      )}
    </li>
  );
}
