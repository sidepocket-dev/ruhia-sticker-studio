# RUHiA Sticker Studio

**AI Sticker → LINE Sticker Converter**

画像生成AIで作ったキャラクターステッカーを、LINEスタンプの提出用データへ変換するツールです。
3×3のシート画像を読み込むと、切り出し・リサイズ・連番・main/tab画像・ZIP化まで自動で行います。

> **画像はサーバーに送信されません。すべてブラウザ内で処理します。**
>
> このページのコードはすべてこのリポジトリにあります。
> 画像を外部へ送る処理が無いことは、ソースを読めば確認できます。

---

## 使い方・配布

使い方と配布先は、こちらの記事にまとめています。

（公開後にURLを記載）

---

## 開発

```bash
npm install
npm run dev            # 開発サーバー
npm run build          # Web版ビルド
npm run build:offline  # オフライン単一HTML
npm run check          # 型チェック + テスト
npm run test:e2e       # E2Eテスト
```

技術構成：Vite / TypeScript / Preact / Canvas API / Web Worker / IndexedDB / fflate

設計の要点：

- LINEの規格値は [`src/config/line-spec.ts`](src/config/line-spec.ts) の1か所にのみ書く
- 切り出しは [`src/core/image/`](src/core/image/)。DOMに触らない純粋な関数だけで書いてある
- 依存の向きは config ← core ← platform ← state ← ui（テストで機械的に検証）

ドキュメント：

- [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md) — 製品仕様（単一の真実）
- [`TEST_PLAN.md`](TEST_PLAN.md) — テスト計画
- [`AGENTS.md`](AGENTS.md) — AIエージェント向け作業規約

**ビルド手順のサポートはしていません。**

---

## RUHiA について

RUHiA は本ツールの作例・案内キャラクターです。
本ツール自体は RUHiA 専用ではなく、オリジナルキャラクター、AIキャラクター、マスコット、
動物・人物・デフォルメキャラクターなど、任意のキャラクターで利用できます。

RUHiA がユーザーの生成物へ自動的に挿入されることはありません。

---

## 免責

RUHiA Sticker Studio は LINE および OpenAI の公式サービスではありません。
各サービス名・商標はそれぞれの権利者に帰属します。

LINE の規格は変更される可能性があります。提出前に最新の公式ガイドラインをご確認ください。
本ツールが参照している規格の確認日は [`src/config/line-spec.ts`](src/config/line-spec.ts) に記録しています。
