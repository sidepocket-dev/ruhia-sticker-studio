import { LINE_STATIC_STICKER_SPEC } from '../../config/line-spec.js';
import {
  exportDelivery,
  exportIssues,
  exportStatus,
  exportZip,
  orderedPlans,
  remainingToSelect,
} from '../../state/export-store.js';
import { shouldShare, describeDelivery } from '../../platform/share.js';
import { buildTextsJson, buildTextsTxt } from '../../core/text/export-texts.js';
import { buildTagDrafts, buildTagsTxt } from '../../core/text/tags.js';
import { CopyButton } from './CopyButton.js';
import { useState } from 'preact/hooks';
import { downloadText } from '../../platform/clipboard.js';

/** 書き出し前の確認と、ZIPの作成。 */
export function ExportPanel() {
  const issues = exportIssues.value;
  const errors = issues.filter((issue) => issue.kind === 'error');
  const warnings = issues.filter((issue) => issue.kind === 'warning');
  const ready = remainingToSelect.value === 0;
  const working = exportStatus.value === 'working';

  return (
    <div class="export">
      {errors.length > 0 && (
        <ul class="export__issues export__issues--error" aria-live="assertive">
          {errors.map((issue) => (
            <li key={issue.message}>{issue.message}</li>
          ))}
        </ul>
      )}

      {warnings.length > 0 && (
        <ul class="export__issues export__issues--warning">
          {warnings.map((issue) => (
            <li key={issue.message}>{issue.message}</li>
          ))}
        </ul>
      )}

      {exportStatus.value === 'done' && exportDelivery.value && (
        <p class="export__done" aria-live="polite">
          {describeDelivery(exportDelivery.value, LINE_STATIC_STICKER_SPEC.zipName)}
          {' LINE Creators Market へこのまま提出できます。'}
        </p>
      )}

      <button
        type="button"
        class="button button--large"
        disabled={!ready || working}
        onClick={exportZip}
      >
        {working ? '作成しています…' : shouldShare() ? 'LINE用データを作成・保存' : 'LINE用データを作成'}
      </button>

      {!ready && <p class="export__blocked">選ぶ個数がそろうと作成できます。</p>}

      {orderedPlans.value.length > 0 && (
        <div class="export__texts">
          <p>どの画像がどのセリフだったかを、あとから見返せるように保存できます。</p>
          <button
            type="button"
            class="button button--quiet"
            onClick={() => downloadText(buildTextsTxt(orderedPlans.value), 'texts.txt')}
          >
            セリフ一覧を保存（texts.txt）
          </button>
          <button
            type="button"
            class="button button--quiet"
            onClick={() => downloadText(buildTextsJson(orderedPlans.value), 'texts.json')}
          >
            texts.json
          </button>
        </div>
      )}

      {orderedPlans.value.length > 0 && <TagHelper />}
    </div>
  );
}

/**
 * LINEのタグ設定を手伝う（§77.23）。
 *
 * タグは一覧から選ぶ形式で、探すのに時間がかかる。
 * 手がかりの言葉をコピーして、ページ内検索で探せるようにする。
 */
function TagHelper() {
  const [open, setOpen] = useState(false);
  const drafts = buildTagDrafts(orderedPlans.value);

  return (
    <div class="tag-helper">
      <button
        type="button"
        class="tag-helper__toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
        LINEでタグを付けるときの手がかり
      </button>

      {open && (
        <div class="tag-helper__body">
          <p>
            LINEでは、スタンプ1個につき<strong>3個までタグ</strong>を付けられます。
            付けると、トークで文字を打ったときの変換候補に出るようになります。
          </p>
          <p>
            タグは<strong>一覧から選ぶ形式</strong>です。下の言葉をコピーして、
            LINEの画面で<strong>ページ内検索（Ctrl+F / ⌘F）</strong>に貼ると早く見つかります。
            同じ言葉がないときは、近いものを選んでください。
          </p>

          <ol class="tag-helper__list">
            {drafts.map((draft) => (
              <li key={draft.id} class="tag-helper__item">
                <span class="tag-helper__number">{String(draft.id).padStart(2, '0')}</span>
                <span class="tag-helper__words">
                  {draft.words.map((word) => (
                    <CopyButton key={word} text={word} label={word} variant="quiet" />
                  ))}
                </span>
              </li>
            ))}
          </ol>

          <button
            type="button"
            class="button button--quiet"
            onClick={() => downloadText(buildTagsTxt(orderedPlans.value), 'tags.txt')}
          >
            手がかりを保存（tags.txt）
          </button>
        </div>
      )}
    </div>
  );
}
