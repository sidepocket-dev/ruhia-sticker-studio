import { useRef, useState } from 'preact/hooks';
import { buildTextsJson, buildTextsTxt } from '../../core/text/export-texts.js';
import {
  PROJECT_PACKAGE_NAME,
  buildProjectPackage,
  readProjectPackage,
} from '../../platform/project-package.js';
import { downloadBytes } from '../../platform/zip.js';
import { orderedPlans } from '../../state/export-store.js';
import {
  applySnapshot,
  captureSnapshot,
  clearSaved,
  restored,
  saveState,
} from '../../state/persistence.js';
import { resetAll, sheets } from '../../state/sheet-store.js';

const STATUS_TEXT: Record<string, string> = {
  unknown: '',
  unavailable: 'このモードでは自動保存ができません。',
  idle: '作業内容は自動で保存されます。',
  saving: '保存しています…',
  saved: '保存しました。ブラウザを閉じても続きから再開できます。',
};

/**
 * 保存の状態と、プロジェクトの持ち運び（PRODUCT_SPEC.md §49 / §51）。
 *
 * 40個の制作は長時間になる。ブラウザを閉じたら消える作りにはしない。
 * 保存が使えない環境では、その旨を伝えて書き出しを促す。
 */
export function ProjectPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);
  const unavailable = saveState.value === 'unavailable';

  const save = async (): Promise<void> => {
    setWorking(true);
    setMessage('');
    try {
      const snapshot = captureSnapshot();
      const plans = orderedPlans.value;
      const bytes = buildProjectPackage(snapshot, {
        txt: buildTextsTxt(plans),
        json: buildTextsJson(plans),
      });
      downloadBytes(bytes, PROJECT_PACKAGE_NAME, 'application/zip');
      setMessage(`${PROJECT_PACKAGE_NAME} を保存しました。`);
    } catch (cause) {
      console.error('[RUHiA Sticker Studio] プロジェクトを保存できませんでした', cause);
      setMessage('保存できませんでした。もう一度お試しください。');
    } finally {
      setWorking(false);
    }
  };

  const load = async (file: File): Promise<void> => {
    setWorking(true);
    setMessage('');
    const result = await readProjectPackage(file);
    if (!result.ok) {
      setMessage(result.message);
      setWorking(false);
      return;
    }
    await applySnapshot(result.snapshot);
    setMessage('読み込みました。続きから作業できます。');
    setWorking(false);
  };

  const startOver = async (): Promise<void> => {
    await clearSaved();
    resetAll();
    setMessage('');
  };

  return (
    <div class="project">
      <p class={`project__status${unavailable ? ' project__status--warn' : ''}`}>
        {STATUS_TEXT[saveState.value] ?? ''}
        {restored.value && ' 前回の続きから再開しました。'}
      </p>

      {unavailable && (
        <p class="project__hint">
          作業を中断する前に「作業内容を保存」から書き出しておくと、
          あとで読み込んで続きから作業できます。
        </p>
      )}

      <div class="project__actions">
        <button
          type="button"
          class="button button--quiet"
          disabled={working || sheets.value.length === 0}
          onClick={() => void save()}
        >
          作業内容を保存
        </button>
        <button
          type="button"
          class="button button--quiet"
          disabled={working}
          onClick={() => inputRef.current?.click()}
        >
          保存した内容を読み込む
        </button>
        <button
          type="button"
          class="button button--quiet"
          disabled={working || sheets.value.length === 0}
          onClick={() => void startOver()}
        >
          最初からやり直す
        </button>
        <input
          ref={inputRef}
          class="visually-hidden"
          type="file"
          accept=".zip,application/zip"
          onChange={(event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) void load(file);
          }}
        />
      </div>

      {message && <p class="project__message">{message}</p>}
    </div>
  );
}
