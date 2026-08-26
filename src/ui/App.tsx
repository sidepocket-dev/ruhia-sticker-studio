import { LINE_STATIC_STICKER_SPEC } from '../config/line-spec.js';
import {
  errorHint,
  errorMessage,
  progressMessage,
  resetSheet,
  sheetName,
  status,
  stickers,
} from '../state/sheet-store.js';
import { SheetDropZone } from './components/SheetDropZone.js';
import { StickerGrid } from './components/StickerGrid.js';

/** 画面の進行段階。PRODUCT_SPEC.md §59 のMVPフローに対応する。 */
const STEPS = [
  'シートを読み込む',
  'スタンプを確認',
  '使うものを選ぶ',
  'メイン・タブ画像',
  'LINE用に書き出す',
] as const;

export function App() {
  const currentStep = status.value === 'ready' ? 1 : 0;

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

      <nav aria-label="作成の手順">
        <ol class="steps">
          {STEPS.map((label, index) => (
            <li key={label} aria-current={index === currentStep ? 'step' : undefined}>
              {label}
            </li>
          ))}
        </ol>
      </nav>

      <main>
        {status.value === 'empty' && (
          <section class="panel">
            <h2>ステッカーシートを読み込む</h2>
            <p>画像生成AIで作った、3×3に9個ならんだシートを読み込んでください。</p>
            <SheetDropZone />
          </section>
        )}

        {status.value === 'working' && (
          <section class="panel panel--center" aria-live="polite">
            <p class="working">{progressMessage.value}</p>
          </section>
        )}

        {status.value === 'failed' && (
          <section class="panel" aria-live="assertive">
            <h2 class="error-title">{errorMessage.value}</h2>
            <p>{errorHint.value}</p>
            <button type="button" class="button" onClick={resetSheet}>
              別の画像を読み込む
            </button>
          </section>
        )}

        {status.value === 'ready' && (
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
          </section>
        )}
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
