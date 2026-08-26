import { useState } from 'preact/hooks';
import {
  applyPastedText,
  clearOverrides,
  ideaPrompt,
  pasteFailures,
  pasteInput,
  pasteMessage,
} from '../../state/plan-store.js';
import { CopyButton } from './CopyButton.js';

/**
 * セリフをChatGPTに考えてもらう経路（PRODUCT_SPEC.md §23 / §25）。
 *
 * 用意したセリフで足りる人は開かなくてよいので、たたんでおく。
 */
export function IdeaPromptBox() {
  const [open, setOpen] = useState(false);

  return (
    <div class="idea">
      <button type="button" class="idea__toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? '▾' : '▸'} セリフをChatGPTに考えてもらう
      </button>

      {open && (
        <div class="idea__body">
          <p>
            下の文章をChatGPTに貼り付けると、この枠に合わせたセリフを考えてくれます。
            返ってきた回答をそのままコピーして、下の欄に貼り付けてください。
          </p>

          <CopyButton text={ideaPrompt.value} label="ChatGPT用の文章をコピー" />
          <textarea class="idea__prompt" readOnly rows={8} value={ideaPrompt.value} />

          <h3>ChatGPTの回答を貼り付け</h3>
          <p>回答をそのままコピーして貼り付けてください。形式は気にしなくて大丈夫です。</p>
          <textarea
            class="idea__paste"
            rows={8}
            placeholder={'1. おはよう\n2. ありがとう\n…'}
            value={pasteInput.value}
            onInput={(event) => {
              pasteInput.value = (event.target as HTMLTextAreaElement).value;
            }}
          />

          <div class="idea__actions">
            <button
              type="button"
              class="button"
              disabled={pasteInput.value.trim() === ''}
              onClick={applyPastedText}
            >
              このセリフを使う
            </button>
            <button type="button" class="button button--quiet" onClick={clearOverrides}>
              もとに戻す
            </button>
          </div>

          {pasteMessage.value && <p class="idea__result">{pasteMessage.value}</p>}

          {pasteFailures.value.length > 0 && (
            <div class="idea__failures">
              <p>次の行は読み取れませんでした。直すか、そのままでも構いません。</p>
              <ul>
                {pasteFailures.value.map((failure) => (
                  <li key={failure.lineNumber}>
                    {failure.lineNumber}行目：<code>{failure.source}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
