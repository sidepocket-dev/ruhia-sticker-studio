import { useState } from 'preact/hooks';
import type { StickerPlan } from '../../core/text/plan.js';
import { STYLE_PRESETS } from '../../core/text/styles.js';
import {
  batchPrompt,
  chooseGenerationMode,
  chooseStyle,
  generationMode,
  planSheets,
  stickerPrompts,
  stylePreset,
} from '../../state/plan-store.js';
import { CopyButton } from './CopyButton.js';

/**
 * シートごとの画像生成プロンプト（PRODUCT_SPEC.md §32、追加仕様 §1 / §2 / §6）。
 *
 * 「このプロンプトなら必ず成功する」とは書かない（§34）。
 */
export function SheetPrompts() {
  const sheets = planSheets.value;
  const batch = generationMode.value === 'batch';

  return (
    <div class="sheet-prompts">
      <p>
        キャラクターの絵を1枚用意して、下の文章と一緒にChatGPTなどへ渡してください。
        できたシートをこのあと読み込みます。
      </p>

      {sheets.length > 1 && (
        <div class="mode-chooser" role="group" aria-label="頼み方">
          <button
            type="button"
            class={`mode-chooser__item${!batch ? ' mode-chooser__item--on' : ''}`}
            aria-pressed={!batch}
            onClick={() => chooseGenerationMode('one-by-one')}
          >
            <span class="mode-chooser__label">1枚ずつ頼む</span>
            <span class="mode-chooser__note">どのAIでも使えます</span>
          </button>
          <button
            type="button"
            class={`mode-chooser__item${batch ? ' mode-chooser__item--on' : ''}`}
            aria-pressed={batch}
            onClick={() => chooseGenerationMode('batch')}
          >
            <span class="mode-chooser__label">{sheets.length}枚まとめて頼む</span>
            <span class="mode-chooser__note">絵の雰囲気がそろいやすくなります</span>
          </button>
        </div>
      )}

      <div class="style-chooser" role="group" aria-label="仕上がり">
        <span class="style-chooser__title">仕上がり</span>
        {STYLE_PRESETS.map((style) => (
          <button
            key={style.id}
            type="button"
            class={`style-chooser__item${style.id === stylePreset.value ? ' style-chooser__item--on' : ''}`}
            aria-pressed={style.id === stylePreset.value}
            title={style.description}
            onClick={() => chooseStyle(style.id)}
          >
            {style.label}
          </button>
        ))}
      </div>

      {batch ? (
        <BatchPrompt count={sheets.length} />
      ) : (
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
      )}

      <p class="sheet-prompts__note">
        これは推奨する文章です。画像生成AIの動きは変わることがあるため、
        思ったとおりにならない場合は文章を書き換えてお試しください。
      </p>
    </div>
  );
}

function BatchPrompt({ count }: { count: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div class="sheet-prompts__item">
      <div class="sheet-prompts__row">
        <span class="sheet-prompts__number">{count}枚ぶん</span>
        <span class="sheet-prompts__texts">1回の依頼で{count}枚まとめて作ってもらいます</span>
        <span class="sheet-prompts__actions">
          <CopyButton text={batchPrompt.value} label="プロンプトをコピー" />
          <button
            type="button"
            class="sheet-prompts__toggle"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <span class="sheet-prompts__caret" aria-hidden="true">
              {open ? '▾' : '▸'}
            </span>
            文章を見る
          </button>
        </span>
      </div>
      {open && <textarea readOnly rows={16} value={batchPrompt.value} />}
      <div class="continue-hint">
        <p class="sheet-prompts__warn">
          AIによっては、途中で止まったり、同じ絵ばかりになることがあります。
        </p>
        <p>
          そのときは<strong>「1枚ずつ頼む」に切り替えて</strong>、
          まだできていないシートだけを頼んでください。
          1枚ずつの文章には、そのシートの9種類が書いてあります。
        </p>
        <p>
          <strong>できたシートは作り直さなくて大丈夫です。</strong>
          同じ会話のまま続けると、絵の雰囲気がそろいやすくなります。
        </p>
      </div>
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

      {open && <textarea id={textareaId} readOnly rows={12} value={prompt} />}
    </li>
  );
}
