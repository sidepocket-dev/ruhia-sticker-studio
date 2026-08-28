import { LINE_STATIC_STICKER_SPEC, STICKERS_PER_SHEET } from '../config/line-spec.js';
import {
  mainId,
  mainPreviewUrl,
  moveSelection,
  orderedSelection,
  plannedTextByCandidate,
  selectionMessage,
  setMain,
  setTab,
  sortSelection,
  tabId,
} from '../state/export-store.js';
import { SORT_LABELS } from '../core/text/ordering.js';
import { requiredSheets, spareCount, targetCount } from '../state/project.js';
import {
  candidates,
  dismissProblems,
  problems,
  progressMessage,
  resetAll,
  retryWithBackgroundRemoval,
  sheets,
  status,
} from '../state/sheet-store.js';
import { CountChooser } from './components/CountChooser.js';
import { ProjectPanel } from './components/ProjectPanel.js';
import { IdeaPromptBox } from './components/IdeaPromptBox.js';
import { PlanList } from './components/PlanList.js';
import { PresetChooser } from './components/PresetChooser.js';
import { SheetPrompts } from './components/SheetPrompts.js';
import { ExportPanel } from './components/ExportPanel.js';
import { ImageChooser } from './components/ImageChooser.js';
import { ReorderStrip } from './components/ReorderStrip.js';
import { SheetDropZone } from './components/SheetDropZone.js';
import { SheetList } from './components/SheetList.js';
import { StickerGrid } from './components/StickerGrid.js';
import { TabAdjuster } from './components/TabAdjuster.js';

/** オフライン版のファイル名（原仕様 §54）。デプロイもこの名前で置く */
const OFFLINE_FILE_NAME = 'RUHiA-Sticker-Studio.html';

export function App() {
  const loaded = sheets.value.length;
  const remaining = requiredSheets.value - loaded;

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
        <section class="panel">
          <h2>何個のスタンプを作りますか</h2>
          <CountChooser />
        </section>

        <section class="panel">
          <h2>どんな場面で使いますか</h2>
          <p>選んだ場面に合わせて、スタンプの中身を組み立てます。</p>
          <PresetChooser />
          <PlanList />
          <IdeaPromptBox />
        </section>

        <section class="panel">
          <h2>キャラクターの絵を作る</h2>
          <SheetPrompts />
        </section>

        <section class="panel">
          <div class="panel__head">
            <div>
              <h2>ステッカーシートを読み込む</h2>
              <p>画像生成AIで作った、3×3に9個ならんだシートを読み込んでください。</p>
            </div>
            {loaded > 0 && (
              <button type="button" class="button button--quiet" onClick={resetAll}>
                すべて捨てる
              </button>
            )}
          </div>

          {loaded > 0 && <SheetList />}
          {status.value !== 'working' && (
            <SheetDropZone remaining={remaining} compact={loaded > 0} />
          )}
          {status.value === 'working' && (
            <p class="working" aria-live="polite">
              {progressMessage.value}
            </p>
          )}
          {problems.value.length > 0 && <ProblemList />}
        </section>

        {loaded > 0 && <Candidates />}
        {loaded > 0 && <Finishing />}

        <section class="panel">
          <h2>作業内容の保存</h2>
          <ProjectPanel />
        </section>
      </main>

      <footer class="site-footer">
        <OfflineDownload />
        <p>
          RUHiA Sticker StudioはLINEおよびOpenAIの公式サービスではありません。
          各サービス名・商標はそれぞれの権利者に帰属します。
        </p>
        <p>LINE規格の確認日：{LINE_STATIC_STICKER_SPEC.verifiedAt}</p>
      </footer>
    </div>
  );
}

/**
 * オフライン版の入手口（原仕様 §54）。
 *
 * HTML1枚をダブルクリックすれば、通信のない場所でも同じことができる。
 * 作ってテストもしていたのに、置く場所がなく誰も手に入れられなかった。
 *
 * オフライン版自身では出さない。そのHTMLの隣にファイルは無い
 * （リンクが必ず切れる）し、すでに手元にあるものを配る意味もない。
 */
function OfflineDownload() {
  const isFile = typeof location !== 'undefined' && location.protocol === 'file:';
  if (isFile) return null;

  return (
    <p class="site-footer__offline">
      <a href={OFFLINE_FILE_NAME} download>
        オフライン版をダウンロード
      </a>
      <span>
        HTMLが1枚だけ。保存してダブルクリックすると、通信のない場所でも同じように使えます。
      </span>
    </p>
  );
}

function ProblemList() {
  return (
    <div class="problems" aria-live="assertive">
      <div class="problems__head">
        <h3>読み込めなかった画像があります</h3>
        <button type="button" class="icon-button" aria-label="閉じる" onClick={dismissProblems}>
          ✕
        </button>
      </div>
      <ul>
        {problems.value.map((problem) => (
          <li key={problem.name}>
            <strong>{problem.name}</strong>
            <span>{problem.message}</span>
            <span class="problems__hint">{problem.hint}</span>
            {problem.canRemoveBackground === true && (
              <button
                type="button"
                class="button button--quiet"
                onClick={() => void retryWithBackgroundRemoval(problem.name)}
              >
                背景を抜いてみる
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Candidates() {
  const spare = spareCount.value;

  return (
    <section class="panel">
      <div class="panel__head">
        <div>
          <h2>{candidates.value.length}個のスタンプを見つけました</h2>
          <p>
            {targetCount.value}個を選んでください。
            {spare > 0 && `${spare}個は使わずに済ませられます。`}
          </p>
        </div>
      </div>

      {sheets.value.map((sheet, index) => (
        <div key={sheet.id} class="candidates__sheet">
          {sheets.value.length > 1 && (
            <h3 class="candidates__title">
              {index + 1}枚目 <span>{sheet.name}</span>
            </h3>
          )}
          <StickerGrid sheet={sheet} startNumber={index * STICKERS_PER_SHEET + 1} />
        </div>
      ))}

      <p class="selection-status">{selectionMessage.value}</p>
    </section>
  );
}

function Finishing() {
  const selection = orderedSelection.value;

  return (
    <>
      <section class="panel">
        <h2>並び順を決める</h2>
        <p>この順番でLINEに登録されます。</p>

        <div class="sort-buttons">
          <button type="button" class="button" onClick={() => sortSelection('use')}>
            {SORT_LABELS.use}に並べる
          </button>
          <button type="button" class="button button--quiet" onClick={() => sortSelection('sheet')}>
            {SORT_LABELS.sheet}に戻す
          </button>
          <span class="sort-buttons__note">
            よく使う種類から、種類ごとにまとめます。つまみをドラッグして直せます。
          </span>
        </div>

        <ReorderStrip
          items={selection}
          onMove={moveSelection}
          texts={plannedTextByCandidate.value}
        />
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
