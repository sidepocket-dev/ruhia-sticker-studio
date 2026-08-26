import { LINE_STATIC_STICKER_SPEC } from '../../config/line-spec.js';
import { exportIssues, exportStatus, exportZip, remainingToSelect } from '../../state/export-store.js';

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

      {exportStatus.value === 'done' && (
        <p class="export__done" aria-live="polite">
          {LINE_STATIC_STICKER_SPEC.zipName} を保存しました。LINE Creators Market へこのまま提出できます。
        </p>
      )}

      <button
        type="button"
        class="button button--large"
        disabled={!ready || working}
        onClick={() => void exportZip()}
      >
        {working ? '作成しています…' : 'LINE用データを作成'}
      </button>

      {!ready && <p class="export__blocked">選ぶ個数がそろうと作成できます。</p>}
    </div>
  );
}
