import { LINE_STATIC_STICKER_SPEC } from '../config/line-spec.js';
import {
  mainId,
  mainPreviewUrl,
  moveSelection,
  orderedSelection,
  selectionMessage,
  setMain,
  setTab,
  tabId,
} from '../state/export-store.js';
import {
  errorHint,
  errorMessage,
  progressMessage,
  resetSheet,
  sheetName,
  status,
  stickers,
} from '../state/sheet-store.js';
import { ExportPanel } from './components/ExportPanel.js';
import { ImageChooser } from './components/ImageChooser.js';
import { ReorderStrip } from './components/ReorderStrip.js';
import { SheetDropZone } from './components/SheetDropZone.js';
import { StickerGrid } from './components/StickerGrid.js';
import { TabAdjuster } from './components/TabAdjuster.js';

export function App() {
  return (
    <div class="app">
      <header class="site-header">
        <h1 class="site-title">RUHiA Sticker Studio</h1>
        <p class="site-subtitle">AI Sticker → LINE Sticker Converter</p>
        <p class="privacy-note">
          <strong>画像はサーバーに送信されません。</strong>
          <span>すべてブラウザ内で処理します。</span>
        </p>
      </header>

      <main>
        {status.value === 'empty' && <StartPanel />}
        {status.value === 'working' && (
          <section class="panel panel--center" aria-live="polite">
            <p class="working">{progressMessage.value}</p>
          </section>
        )}
        {status.value === 'failed' && <FailurePanel />}
        {status.value === 'ready' && <Workspace />}
      </main>

      <footer class="site-footer">
        <p>
          RUHiA Sticker StudioはLINEおよびOpenAIの公式サービスではありません。
          各サービス名・商標はそれぞれの権利者に帰属します。
        </p>
        <p>LINE規格の確認日：{LINE_STATIC_STICKER_SPEC.verifiedAt}</p>
      </footer>
    </div>
  );
}

function StartPanel() {
  return (
    <section class="panel">
      <h2>ステッカーシートを読み込む</h2>
      <p>画像生成AIで作った、3×3に9個ならんだシートを読み込んでください。</p>
      <SheetDropZone />
    </section>
  );
}

function FailurePanel() {
  return (
    <section class="panel" aria-live="assertive">
      <h2 class="error-title">{errorMessage.value}</h2>
      <p>{errorHint.value}</p>
      <button type="button" class="button" onClick={resetSheet}>
        別の画像を読み込む
      </button>
    </section>
  );
}

function Workspace() {
  const selection = orderedSelection();

  return (
    <>
      <section class="panel">
        <div class="panel__head">
          <div>
            <h2>{stickers.value.length}個のスタンプを見つけました</h2>
            <p>{sheetName.value}</p>
          </div>
          <button type="button" class="button button--quiet" onClick={resetSheet}>
            読み込み直す
          </button>
        </div>
        <StickerGrid stickers={stickers.value} />
        <p class="selection-status">{selectionMessage.value}</p>
      </section>

      <section class="panel">
        <h2>並び順を決める</h2>
        <p>つまみをドラッグして入れ替えます。この順番でLINEに登録されます。</p>
        <ReorderStrip items={selection} onMove={moveSelection} />
      </section>

      <section class="panel">
        <h2>メイン画像を選ぶ</h2>
        <p>スタンプ一覧の表紙になる画像です。</p>
        <div class="chooser-row">
          <ImageChooser
            items={selection}
            selectedId={mainId.value}
            onChoose={setMain}
            label="メイン画像に使うスタンプ"
          />
          <div class="chooser-row__preview">
            {mainPreviewUrl.value && <img src={mainPreviewUrl.value} alt="メイン画像の見え方" />}
          </div>
        </div>
      </section>

      <section class="panel">
        <h2>タブ画像を選ぶ</h2>
        <p>トークルームの下に並ぶ、小さなアイコンです。</p>
        <ImageChooser
          items={selection}
          selectedId={tabId.value}
          onChoose={setTab}
          label="タブ画像に使うスタンプ"
        />
        <TabAdjuster />
      </section>

      <section class="panel">
        <h2>LINE用に書き出す</h2>
        <ExportPanel />
      </section>
    </>
  );
}
