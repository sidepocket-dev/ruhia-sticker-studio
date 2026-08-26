import { LINE_STATIC_STICKER_SPEC } from '../config/line-spec.js';

/** 画面の進行段階。PRODUCT_SPEC.md §59 のMVPフローに対応する。 */
const STEPS = [
  'シートを読み込む',
  'スタンプを確認',
  '使うものを選ぶ',
  'メイン・タブ画像',
  'LINE用に書き出す',
] as const;

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

      <nav aria-label="作成の手順">
        <ol class="steps">
          {STEPS.map((label, index) => (
            <li key={label} aria-current={index === 0 ? 'step' : undefined}>
              {label}
            </li>
          ))}
        </ol>
      </nav>

      <main class="panel">
        <h2>ステッカーシートを読み込む</h2>
        <p>
          画像生成AIで作った3×3のステッカーシートを用意してください。
          読み込み機能はこの後の作業で追加します。
        </p>
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
