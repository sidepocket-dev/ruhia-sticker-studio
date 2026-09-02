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

    </div>
  );
}

