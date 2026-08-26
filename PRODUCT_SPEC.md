# RUHiA Sticker Studio v1.0
## Product Specification

**Version:** 1.0 Draft  
**Specification Date:** 2026-08-26  
**Development:** New implementation with Claude Code  
**Product Type:** Browser-based local image processing tool  
**Primary Target:** LINE Creators Market static stickers

---

# 1. Product Vision

## 1.1 Concept

RUHiA Sticker Studioは、画像生成AIで作ったキャラクターステッカーを、初心者でも簡単にLINEスタンプ提出用データへ変換できるツールである。

最重要コンセプト：

> **AIで作る → 画像を入れる → ほぼコピペとクリックだけでLINEスタンプ完成**

高機能な画像編集ソフトを作ることが目的ではない。

ユーザーに以下を極力させない。

- 手作業での画像分割
- Photoshop等での透過処理
- サイズ計算
- PNG変換
- LINE規格確認
- ファイル名管理
- ZIP作成
- 40個分のセリフ管理
- 複雑なAIプロンプト作成

---

# 2. Product Name

**RUHiA Sticker Studio**

Subtitle:

**AI Sticker → LINE Sticker Converter**

RUHiAは作例および案内キャラクターとして使用する。

ただし製品自体はRUHiA専用にしない。

以下を含む任意のキャラクターで利用できること。

- オリジナルキャラクター
- AIキャラクター
- マスコット
- 動物キャラクター
- 人物キャラクター
- デフォルメキャラクター
- ユーザー自身が制作したキャラクター

---

# 3. Target User

主な対象：

- ChatGPT等で画像生成している一般ユーザー
- LINEスタンプを作ったことがない人
- Photoshop等を使いたくない人
- オリジナルキャラクターを持っている人
- SNSでキャラクター作品を公開している人

技術知識を前提としない。

---

# 4. Core UX Principle

## 4.1 最重要原則

**ユーザーに「画像処理」を意識させない。**

通常画面では以下の用語を極力表示しない。

- Alpha
- Connected Components
- Bounding Box
- Canvas
- Flood Fill
- Blob
- PNG compression
- DPI
- Cluster
- ZIP structure

内部では高度な処理を行っても、UIでは以下のような言葉に置き換える。

例：

- 「背景を確認しています」
- 「9個のスタンプを見つけました」
- 「このスタンプだけ調整してください」
- 「LINE用画像を作成しています」

---

# 5. Supported LINE Sticker Type

v1.0では、

**通常の静止画スタンプのみ**

を対象とする。

対応枚数：

- 8個
- 16個
- 24個
- 32個
- 40個

---

# 6. LINE Static Sticker Requirements

仕様基準日：2026-08-26

## 6.1 Required Images

### Main Image

- 1 image
- 240 × 240 px
- PNG

### Sticker Images

選択可能：

- 8
- 16
- 24
- 32
- 40

最大サイズ：

- Width: 370 px
- Height: 320 px

### Chat Tab Image

- 1 image
- 96 × 74 px
- PNG

## 6.2 General Requirements

- PNG
- RGB
- Transparent background
- 72 dpi以上
- Width / height should be even numbers
- Each image ≤ 1 MB
- ZIP ≤ 60 MB

LINE仕様は変更される可能性があるため、コード内に散在させず一元管理する。

例：

`src/config/line-spec.ts`

```ts
export const LINE_STATIC_STICKER_SPEC = {
  verifiedAt: "2026-08-26",

  allowedCounts: [8, 16, 24, 32, 40],

  sticker: {
    maxWidth: 370,
    maxHeight: 320,
    maxBytes: 1_000_000
  },

  main: {
    width: 240,
    height: 240
  },

  tab: {
    width: 96,
    height: 74
  },

  zipMaxBytes: 60_000_000
};
```

リリース前には最新のLINE公式ガイドラインを再確認すること。

---

# 7. ChatGPT Sticker Generation: Verified Observations

以下は2026-08-25〜26に実際に検証した結果。

内部仕様の推測は行わない。

---

## 7.1 Personal Web Version

個人向けChatGPT Web版の画像画面内に、

**「ステッカー」**

メニューが存在することを確認済み。

ただし以下は公式情報が確認できていないため断定しない。

- ステッカー生成の内部発動条件
- 特定ワードがトリガーになるか
- 文字を入れる条件
- 生成枚数の内部ルール
- レイアウト決定ロジック

---

# 8. Dedicated Sticker Feature: Observed Behavior

実際の生成では、

- transparent background
- white die-cut border
- approximately 3 × 3 layout
- 9 variations

が生成された。

ただし、

- 文字あり
- 文字なし

の両方が確認された。

さらに、

- 似たポーズ
- 似た意味のスタンプ
- デザインの重複

が発生する場合も確認された。

また、見た目は3×3でも、

**各スタンプが数学的に均等な3×3セル内へ収まっているとは限らない。**

---

# 9. Normal Chat Image Generation: Observed Behavior

専用「ステッカー」機能がない環境でも、通常の画像生成モデルにプロンプトを与えることで、

- transparent background
- 3 × 3
- 9 stickers
- character consistency
- Japanese text

を持つステッカーシートを生成できることを確認した。

通常チャット生成と専用ステッカー機能では、

- デザイン
- レイアウト
- セリフ
- ポーズの重複傾向

が異なる。

したがって、

**RUHiA Sticker Studioはどちらの生成方式にも対応する。**

---

# 10. Important Discovery: Generate for Easy Cutting

以下のような生成条件を与えた場合、

- 3 × 3 grid
- transparent background
- wide transparent gaps
- no overlap
- no background
- no shadow

を満たした、非常に切り分けやすいシートが生成された。

したがって、

**画像処理側を複雑にするだけでなく、生成時点で処理しやすい画像を作らせる**

ことも本製品の重要な設計思想とする。

---

# 11. Two Input Sheet Types

ツールは内部的に2種類の入力方式を処理する。

ユーザーにはMode名を原則表示しない。

---

## 11.1 Type A: Aligned Sheet

特徴：

- 3 × 3
- 各スタンプがほぼ均等配置
- Wide transparent gaps
- No overlap
- 各スタンプが自分の領域内に存在

処理：

1. Approximate 3 × 3 segmentation
2. Alpha content detection
3. Transparent-margin trimming
4. Validate that no content is cut
5. Extract 9 stickers

この処理を優先する。

高速かつ失敗率が低い。

---

# 12. Type B: Free Layout Sheet

特徴：

- 見た目は3 × 3
- スタンプサイズが異なる
- 文字がセル境界を越える
- ハートや星が離れている
- キャラクターが中心からずれている

単純3等分では内容が切れる可能性がある。

この場合は非AI画像認識を使用する。

---

# 13. Non-AI Automatic Sticker Detection

外部AI APIは使わない。

透明背景のAlpha情報を中心に解析する。

基本アルゴリズム：

1. Alpha mask生成
2. Connected Components抽出
3. Component size filtering
4. Component bounding boxes
5. Component center calculation
6. Nearby components grouping
7. Approximate 3 × 3 position priors
8. Final grouping into 9 stickers
9. Group bounding boxes
10. Transparent-margin expansion
11. Extract preview

---

# 14. Connected Components Grouping

ステッカー1個は必ずしも一つの連結領域ではない。

例：

- キャラクター
- 「ありがとう」
- ハート
- 星
- `!!`
- 汗マーク

が物理的に離れている。

そのため、

**Connected Component = Sticker**

とは判断しない。

各Componentについて以下を使用する。

- position
- center
- width
- height
- area
- distance
- neighboring components
- expected 3 × 3 position

これらから9グループへまとめる。

---

# 15. 3 × 3 Position as Hint

3 × 3は切断線ではない。

以下の9つの想定中心位置を補助情報として使用する。

```text
1 2 3
4 5 6
7 8 9
```

例えば右上付近に存在する、

- character
- text
- heart

は多少離れていてもSticker 3へ属する可能性が高い。

---

# 16. Automatic Strategy Selection

ツールは可能なら自動的に、

**Simple Split**
または
**Smart Detection**

を選択する。

判定材料：

- 透明領域の幅
- 各3 × 3境界付近のAlpha存在量
- 9セルごとのcontent occupancy
- component distribution

境界にほぼ内容が無ければSimple Split。

境界上に内容が存在する場合はSmart Detection。

ユーザーにモード選択を要求しない。

---

# 17. Manual Correction

自動認識を100%成功させることは要求しない。

重要なのは、

**失敗したものだけ簡単に直せること。**

最低限必要：

- sticker group selection
- bounding area adjustment
- merge groups
- split group
- move component to another group
- exclude component
- reset automatic detection
- Undo
- Redo

通常ユーザーはこの画面を触らず完了することを目標とする。

---

# 18. Character Reference Images

RUHiA Sticker Studio自身は画像生成を行わない。

ユーザーは自身のChatGPT等へキャラクター参照画像を添付する。

原則：

**Reference image is the source of truth for character appearance.**

ツールが勝手にキャラクター外見を文章化しすぎない。

理由：

言語化することで、

- 顔
- 色
- 衣装
- デザイン

が参照画像からずれる可能性がある。

---

# 19. Sticker Text Planning Strategy

40個セットの場合、

生成を始める前に、

**45種類のセリフ候補を決める**

ことを推奨標準フローとする。

---

# 20. Why 45 Candidates

40個に対して45候補を作る理由：

- 5 sheet × 9 stickers = 45
- 5候補を除外できる
- duplicate reduction
- balanced categories
- easy text management
- easy image/text mapping
- selection freedom

---

# 21. Sticker Count and Sheet Count

| LINE Set | AI Candidates | Sheets |
|---:|---:|---:|
| 8 | 9 | 1 |
| 16 | 18 | 2 |
| 24 | 27 | 3 |
| 32 | 36 | 4 |
| 40 | 45 | 5 |

候補数は、

`ceil(target / 9) × 9`

で計算する。

---

# 22. Use-Case Presets

最低限以下を提供する。

- 日常用
- ビジネス用
- 友達用
- カップル用
- カスタム

---

# 23. Preset Prompt Generation

ユーザーが、

**日常用**

を選択すると、

ChatGPTへ貼り付けるための文章を自動生成する。

ツール自身はChatGPT APIへ接続しない。

ボタン：

**「ChatGPT用プロンプトをコピー」**

---

# 24. Example: Daily Preset

生成する内容の概念：

- greeting
- reply
- thanks
- apology
- going out
- returning home
- communication
- encouragement
- emotion

条件：

- duplicate phrasesを避ける
- similar meaningを避ける
- short text
- practical phrases
- each sticker has unique purpose
- pose suggestion included

出力形式：

```text
1. おはよう｜元気に手を振る
2. こんにちは｜笑顔であいさつ
3. ありがとう｜両手を合わせて喜ぶ
```

---

# 25. AI Result Paste Box

ツール内に大きな入力欄を用意する。

Title:

**「ChatGPTの回答を貼り付け」**

補助説明：

> ChatGPTの回答をそのままコピーして貼り付けてください。

JSONを要求しない。

---

# 26. Plain Text Parsing

以下を自動解析する。

- number
- sticker text
- pose / expression

標準形：

```text
1. おはよう｜元気に手を振る
```

---

# 27. Accepted Formatting Variations

最低限以下に対応する。

```text
1. おはよう｜手を振る
1) おはよう｜手を振る
① おはよう｜手を振る
1. おはよう - 手を振る
1 おはよう｜手を振る
```

Markdown headingsやグループ名が入っていても解析できるようにする。

例：

```text
### グループ1：あいさつ
1. おはよう｜手を振る
```

---

# 28. Parsing Result UI

正常時：

> **45件読み込みました**

不足：

> 42件読み込みました。あと3件必要です。

超過：

> 47件あります。使用する45件を選んでください。

Parse失敗：

該当行だけ表示して修正できるようにする。

---

# 29. Duplicate Detection

完全一致を検出。

例：

```text
ありがとう
ありがとう
```

警告。

近似重複については、

v1では高度な日本語意味解析を必須にしない。

軽量実装として、

- normalized string comparison
- character similarity
- prefix/suffix similarity

程度は使用可能。

意味的重複はChatGPTへ作成時に避けさせる。

---

# 30. Sticker Planning Data Model

例：

```ts
interface StickerPlan {
  id: number;
  text: string;
  action?: string;
  sheet: number;
  position: number;
  enabled: boolean;
}
```

---

# 31. Grouping into Sheets

45件の場合：

```text
Sheet 1: 01–09
Sheet 2: 10–18
Sheet 3: 19–27
Sheet 4: 28–36
Sheet 5: 37–45
```

ユーザーが必要なら並び替え可能。

---

# 32. Image Generation Prompt Builder

各Sheetに、

**「画像生成プロンプトをコピー」**

ボタンを用意する。

ツールはそのSheetの9種類を自動挿入する。

---

# 33. Recommended Image Prompt Template

Concept:

```text
添付したキャラクターの日常で使える、
短い日本語のセリフ入りステッカーを作ってください。

3×3のグリッドに9種類の異なるステッカーを配置した、
正方形（1:1）の透明なステッカーシートを1枚作成してください。

各ステッカーには以下のセリフをそれぞれ1つ使用し、
内容に合った異なる表情、ポーズ、リアクションを描いてください。

1. ...
2. ...
3. ...
4. ...
5. ...
6. ...
7. ...
8. ...
9. ...

ステッカーの間には、
幅広で完全に透明な隙間を設けてください。

各ステッカーはそれぞれ独立させ、
隣のステッカーと接触または重ならないようにしてください。

背景、背景装飾、影は追加しないでください。
```

---

# 34. Prompt Philosophy

画像生成AIの内部挙動は変化する可能性がある。

したがって、

**「このプロンプトなら必ず成功する」**

とはUI・README・noteで表現しない。

表現：

> 推奨プロンプト

とする。

---

# 35. Text Generation in Images

基本方針：

**画像生成時点でセリフを入れる。**

RUHiA Sticker Studio側で文字を後付けすることを標準フローにしない。

---

# 36. Why No Main Text Editor in v1

後付け文字には以下の問題がある。

- empty space不足
- character resizing required
- text overlap
- font selection
- manual layout
- character shrinking
- loss of simple UX

そのためv1では除外。

将来的な救済機能候補とする。

---

# 37. Uploading Sticker Sheets

対応形式：

- PNG
- JPEG
- WebP

推奨：

**Transparent PNG**

複数同時アップロード可能。

40個セットの場合、通常5枚。

---

# 38. Sheet-to-Plan Mapping

可能であればSheet番号とStickerPlanを自動対応。

例：

Sheet 2 position 5

→ ID 14

ユーザーが5枚の順番を入れ替えている可能性があるため、シート順のドラッグ変更を許可する。

---

# 39. Extracted Sticker Preview

抽出後、

3 × 3またはカード形式で表示。

各カード：

- preview
- sequence number
- expected text
- selected checkbox
- edit button
- warning icon if needed

---

# 40. Selecting Final Stickers

例：

40セットの場合、

> **40 / 40 選択済み**

45候補から5個除外。

必要数を超える：

> あと2個外してください。

不足：

> あと3個選んでください。

---

# 41. Reordering

選択後、

drag & dropで並び替え。

Mobile:

long press + drag。

番号：

```text
01
02
...
40
```

---

# 42. LINE Sticker Canvas Generation

各抽出画像をLINE規格内へ変換。

基本：

- preserve aspect ratio
- transparent background
- center
- no cropping
- even dimensions
- ≤ 370 × 320

内部のコンテンツを最大限大きく表示する。

---

# 43. Recommended Internal Canvas

実装を単純化する場合、

最終スタンプを

**370 × 320**

透明Canvasへ統一してよい。

ただしLINEの最大サイズ仕様を満たすこと。

コンテンツ周囲には安全余白を設ける。

---

# 44. Main Image Creation

ユーザーが完成スタンプから1個選ぶ。

Button:

**「メイン画像にする」**

240 × 240 preview。

自動：

- fit
- center

必要な場合のみ：

- zoom
- position

最終：

`main.png`

---

# 45. Chat Tab Image

完成スタンプから選択。

96 × 74。

小さいため実サイズpreviewを表示。

最終：

`tab.png`

---

# 46. Export Validation

書き出し前に確認：

```text
✓ スタンプ数
✓ PNG
✓ 背景透過
✓ 画像サイズ
✓ 偶数サイズ
✓ RGB
✓ 1MB以下
✓ main画像
✓ tab画像
✓ ZIP容量
```

問題なし：

> **LINE用データを作成できます**

---

# 47. Error vs Warning

## Error

規格違反。

例：

- sticker count mismatch
- image too large
- missing main
- missing tab

原則export不可。

## Warning

品質問題。

例：

- content too close to edge
- low resolution
- possible extraction mistake

export可能。

---

# 48. ZIP Export

## LINE_UPLOAD.zip

LINE提出画像のみ。

```text
main.png
tab.png
01.png
02.png
...
40.png
```

余計な開発用ファイルを入れない。

---

# 49. Project Export

別途：

`PROJECT_PACKAGE.zip`

例：

```text
project.json
texts.txt
texts.json

sources/
  sheet-01.png
  sheet-02.png
  ...

preview/
  contact-sheet.png
```

---

# 50. Text File Export

`texts.txt`

例：

```text
01 おはよう
02 こんにちは
03 ありがとう
...
```

`texts.json`

例：

```json
[
  {
    "id": 1,
    "text": "おはよう",
    "action": "元気に手を振る"
  }
]
```

---

# 51. Project Persistence

40個制作では長時間になる。

ブラウザ更新ですべて消える設計は禁止。

IndexedDBを使用。

保存対象：

- sticker plans
- uploaded sheets
- detection results
- manual corrections
- selected stickers
- order
- main image configuration
- tab configuration
- project metadata

---

# 52. Privacy

非常に重要。

以下を禁止：

- upload image to server
- send image to OpenAI API
- send image to third party AI
- require API key
- user account requirement

トップ画面等に表示：

> **画像はサーバーに送信されません。すべてブラウザ内で処理します。**

---

# 53. Web Version

通常ブラウザから利用。

Targets:

- Chrome
- Edge
- Safari
- Android Chrome
- iOS Safari

---

# 54. Offline Version

インストール不要を理想とする。

最終形候補：

```text
RUHiA-Sticker-Studio.html
```

をダブルクリックして利用。

もしsingle HTML化が技術的に不合理な場合：

```text
RUHiA-Sticker-Studio/
  index.html
  assets/
```

でもよい。

重要：

- no mandatory CDN
- no server
- no installation

---

# 55. Recommended Technology

Initial recommendation:

- Vite
- TypeScript
- Preact or lightweight React
- Canvas API
- IndexedDB
- Web Worker
- fflate

UIフレームワークはClaude Codeが合理的な理由を提示するなら変更可。

ただし、

- oversized dependencies
- heavy frameworks without need

は避ける。

---

# 56. Image Processing Performance

大量のCanvasを同時保持しない。

40〜45個処理でもメモリを過剰消費しないこと。

方針：

- process sheet sequentially
- release unused canvas
- use ImageBitmap where appropriate
- Web Worker for heavy processing

---

# 57. Suggested Project Structure

```text
ruhIA-sticker-studio/

  PRODUCT_SPEC.md
  AGENTS.md
  TEST_PLAN.md
  README.md

  package.json
  vite.config.ts

  src/
    app/
    components/
    state/

    prompts/
      presets.ts
      idea-prompt.ts
      sticker-prompt.ts
      parser.ts

    image/
      alpha-mask.ts
      components.ts
      grouping.ts
      sheet-classifier.ts
      split.ts
      trim.ts
      resize.ts
      export.ts

    line/
      spec.ts
      validator.ts
      exporter.ts

    storage/
      indexeddb.ts

    workers/

  tests/
    fixtures/
    unit/
    integration/
```

---

# 58. Development Rules

- PRODUCT_SPEC.md is source of truth
- Do not rewrite major architecture without explanation
- Keep TypeScript strict
- Add tests for image processing
- Do not add AI API
- Do not upload user images
- Keep LINE spec centralized
- Prefer simple UX over more options
- Do not expose technical implementation terms unnecessarily
- Preserve existing working behavior when adding features

---

# 59. MVP Definition

最初のMVPは極力小さくする。

Input:

**1 aligned transparent 3 × 3 sheet**

Flow:

```text
Upload
↓
Detect 9 stickers
↓
Preview
↓
Choose 8
↓
Generate LINE PNG
↓
Choose main
↓
Choose tab
↓
Create ZIP
```

これが完成するまで高度な機能へ進みすぎない。

---

# 60. Development Phases

## Phase 0 — Foundation

- repository
- Vite
- TypeScript
- UI shell
- LINE spec
- test environment
- docs

---

## Phase 1 — Aligned Sheet MVP

- PNG upload
- transparency detection
- 3 × 3 approximate split
- trim transparent margins
- 9 previews

Acceptance:

一般的な整列された透過シートで9個すべて正しく抽出。

---

## Phase 2 — Basic LINE Export

- select 8
- reorder
- resize
- main
- tab
- validation
- ZIP

この時点で最小製品として使用可能にする。

---

## Phase 3 — Smart Detection

Free-layout sheet対応。

- Alpha mask
- Connected Components
- grouping
- positional hints
- 9 sticker extraction

---

## Phase 4 — Manual Correction

- group correction
- bounding correction
- merge
- split
- component movement
- Undo / Redo

---

## Phase 5 — Multiple Sheets

- 16
- 24
- 32
- 40
- multiple upload
- sheet order
- candidate selection

---

## Phase 6 — AI Prompt Workflow

AI通信はしない。

追加：

- presets
- prompt copy
- paste result
- plain text parser
- candidate manager
- 9 × N grouping
- sticker generation prompts
- texts.txt
- texts.json

---

## Phase 7 — Persistence and Offline

- IndexedDB
- project restore
- project export
- offline build

---

## Phase 8 — UX Polish

- mobile
- accessibility
- beginner user test
- clearer errors
- performance
- note distribution version

---

# 61. Test Fixtures

実際のAI生成画像をFixtureとして使用。

最低限：

## Fixture A

Aligned transparent 3 × 3 sheet.

Expected:

simple split succeeds.

## Fixture B

Dedicated Sticker feature free-layout transparent sheet.

Expected:

simple split detects risk and Smart Detection succeeds.

## Fixture C

Text-heavy sheet.

Expected:

text stays associated with character.

## Fixture D

Separated decorations.

Expected:

heart/star does not become independent sticker.

## Fixture E

White sticker outlines.

Expected:

white outline remains intact.

---

# 62. Core Test Cases

## TC01

Aligned sheet → 9 extractions.

## TC02

No content clipped.

## TC03

Transparent margins trimmed.

## TC04

8 selected → 8 sticker PNG.

## TC05

main 240 × 240.

## TC06

tab 96 × 74.

## TC07

ZIP generated.

## TC08

40 count via multiple sheets.

## TC09

Free-layout smart detection.

## TC10

Separated text grouped correctly.

## TC11

Japanese 45-line parsing.

## TC12

Format variations parsed.

## TC13

Duplicate detected.

## TC14

Reload restores project.

## TC15

Offline mode works.

---

# 63. User-Facing Error Messages

Bad:

> Connected component clustering failed.

Good:

> スタンプの位置をうまく判定できませんでした。  
> 9個の範囲を確認してください。

Bad:

> Invalid sticker count.

Good:

> 40個セットには、あと2個必要です。

---

# 64. Note Article Integration

RUHiA Sticker Studioはnote記事の付録として配布する想定。

記事では、

- ChatGPTのステッカー生成
- 実際の検証
- 推奨プロンプト
- LINEスタンプ作成
- RUHiA Sticker Studioの使用

を紹介。

---

# 65. Fact vs Observation Policy for Note

ChatGPTの新ステッカー機能はリリース直後であり、内部仕様が不明な点がある。

記事では必ず区別する。

## Official fact

公式情報があるもの。

## Observed result

実際に検証したもの。

例：

> 筆者環境ではこの指示で文字入りステッカーが生成された。

## Unknown

公式情報がなく、検証だけでは判断できないもの。

推測を断定しない。

---

# 66. Free Account Limitation Observation

個人無料アカウントで検証した際、

5枚生成した時点で画像生成制限に達し、約1日利用できない状態を確認した。

ただしこれは実測値であり、

**「無料版は5枚まで」**

という一般仕様として断定しない。

---

# 67. Brand Role of RUHiA

RUHiAは、

- sample
- tutorial character
- UI guide mascot
- note article character

として使用可能。

ただしユーザーの生成物には自動挿入しない。

---

# 68. Disclaimer

表示例：

> RUHiA Sticker StudioはLINEおよびOpenAIの公式サービスではありません。各サービス名・商標はそれぞれの権利者に帰属します。

---

# 69. Future Features — Not v1 Requirement

候補：

- optional text editor
- font presets
- automatic semantic duplicate detection
- other AI provider prompt templates
- animation sticker support
- message sticker support
- BIG sticker support
- automatic contact sheet
- multilingual sticker planning
- PWA installation

v1完成を遅らせないこと。

---

# 70. Definition of Success

機能数ではなくユーザー体験で評価する。

目標：

> 初めて使う人が、画像生成後10分程度でLINE提出用ZIPを完成できる。

理想テスト：

説明なしでURLだけ渡し、

- どこで止まるか
- どこで迷うか
- どの言葉が分からないか

を観察する。

ユーザーが迷った場合、

**ユーザーの理解不足ではなくUI改善候補**

として扱う。

---

# 71. Claude Code Initial Development Procedure

Claude Codeはコードを書き始める前に本仕様書を全文読むこと。

最初に以下を報告する。

1. 製品理解
2. 推奨アーキテクチャ
3. ディレクトリ構成
4. 開発フェーズ
5. 最大の技術リスク
6. 3 × 3抽出方式
7. Smart Detection設計
8. テスト戦略
9. オフライン配布方式
10. 仕様上確認が必要な事項

その回答を確認してから実装開始する。

---

# 72. Claude Code Reporting Rule

各Phase終了時に報告：

- Completed
- Changed files
- Tests executed
- Test results
- Known issues
- Next phase

---

# 73. Codex Role After Development

Codexが再利用可能になった場合、

**reviewer**

として使用する。

Codexには、

- PRODUCT_SPEC.md
- source
- tests

を読ませ、

以下をレビューさせる。

- specification compliance
- missing requirements
- image processing bugs
- UX problems
- unnecessary complexity
- security/privacy problems
- LINE export correctness

Claude CodeとCodexを同時に別実装させない。

基本：

> Claude Code develops → Codex reviews → Claude Code fixes

---

# 74. First Milestone

最初に絶対確認するもの：

**実際に生成された透過3 × 3ステッカーシートから、9個を正しく取り出せること。**

AIプロンプト管理や見た目より優先する。

---

# 75. Final Product Flow

理想：

```text
用途を選ぶ
↓
ChatGPT用プロンプトをコピー
↓
ChatGPTで候補を作る
↓
回答をそのまま貼る
↓
9個ずつに自動分割
↓
画像生成プロンプトをコピー
↓
自分のキャラクター画像を添えてAI生成
↓
ステッカーシートをまとめてドラッグ
↓
自動抽出
↓
使うスタンプを選ぶ
↓
メイン画像を選ぶ
↓
タブ画像を選ぶ
↓
LINEチェック
↓
ZIP作成
↓
完成
```

---

# 76. Ultimate Product Principle

実装上迷った場合は、この順番で判断する。

1. **簡単か**
2. **失敗しにくいか**
3. **ユーザーが理解できるか**
4. **ローカルだけで動くか**
5. **LINE提出データを正しく作れるか**
6. 高機能か

高機能であることは最優先ではない。

---

**END OF PRODUCT SPECIFICATION**
---

# 77. 実装確定事項 (Implementation Decisions)

**追記日:** 2026-08-26
**位置づけ:** §1〜§76 は原仕様であり引き続き単一の真実とする。本章は、実装着手前の設計レビューで確定した判断・補足・原仕様からの意図的な変更を記録する。原仕様と本章が矛盾する場合は**本章を優先**する（各項に理由を明記する）。

---

## 77.1 リポジトリ

```text
~/personal/ruhia-sticker-studio/
```

に独立したGitリポジトリとして作成する。

理由：本製品は note 記事の付録として**公開配布**する成果物であり、非公開の事業SSOTである `ruhia-engine` とは性質が異なる。入れ子リポジトリを避ける。

---

## 77.2 技術選定（確定）

| 領域 | 採用 | 理由 |
|---|---|---|
| ビルド | Vite + TypeScript (strict) | 原仕様§55 |
| UI | Preact + @preact/signals | React APIに近く約12KB。オフライン単一HTML配布に有利。`preact/compat` でReactへ退避可能 |
| スタイル | 素のCSS + CSS変数 | ビルド依存を増やさない |
| 並列処理 | Web Worker (`?worker&inline`) | 単一HTML化しても動作する形で Phase 0 から導入 |
| ZIP | fflate | 原仕様§55 |
| 永続化 | IndexedDB（薄い自前ラッパ + アダプタ差し替え） | §77.9 参照 |
| 並び替え | Pointer Events 自前実装 + ドラッグハンドル | §77.6 参照 |
| テスト | Vitest（単体・node）+ Playwright（E2E） | §77.11 参照 |

追加する実行時依存は **fflate のみ**を目標とする。PNGデコーダは devDependencies（テスト用）に限る。

---

## 77.3 画像処理コアの依存規約（最重要）

画像アルゴリズムは Canvas API に依存させず、以下の形の**純粋関数**として実装する。

```ts
interface AlphaMask {
  data: Uint8Array;   // 0 or 1
  width: number;
  height: number;
}
```

- 入力は `ImageData` 相当のプレーンなバッファ、出力はプレーンなデータ（矩形・ラベル配列・数値）
- `src/core/**` は `src/platform/**` および `src/ui/**` を **import してはならない**
- この一方向依存はテストで機械的に検証する（`tests/unit/architecture.test.ts`）

理由：Canvas も jsdom も node-canvas も無しで全アルゴリズムを Node 上で高速に単体テストできる。本製品の生死を握る「9個を正しく取り出す」部分に、実行の速い回帰テストを張るための前提条件である。

---

## 77.4 3 × 3 抽出方式（Type A / Simple Split の実装詳細）

単純な `幅 / 3` 分割は、実際のAI生成シートでは高確率で内容を切断する。
そのため Simple Split の段階から**「透明の谷」を探索**する。

1. アルファマスクを生成する（既定閾値 `alphaThreshold = 16`）
2. 列ごと・行ごとの不透明画素数プロファイルを取る
3. `x ≈ W/3`, `2W/3`（および `y ≈ H/3`, `2H/3`）の **±12%** の窓の中で、値がほぼ 0 の最長区間（＝谷）を探し、その中心を切断位置とする
4. 谷が見つからない、または切断線上に内容が存在する場合は **Smart Detection へ自動エスカレーション**する（原仕様§16の自動戦略選択は、このプロファイルひとつで実装する）
5. 各セル内で内容の外接矩形を求め、透明余白をトリムする

**既知の危険：ドロップシャドウ。** 薄い影がシート全面を覆うと谷が消え、Connected Components も全て連結する。閾値の引き上げと微小成分の面積フィルタで緩和するが、根本対策は生成プロンプト側で `no shadow` を明示させること（原仕様§10の設計思想）。

---

## 77.5 Smart Detection 設計（Type B / Phase 3）

**実装日:** 2026-08-26

### 実測して分かったこと

Fixture B（ChatGPT ステッカー機能の出力、白フチ付き自由配置）を解析した結果、
当初の想定と異なる点が2つあった。

**1. 白フチが1スタンプを1つの連結領域にまとめている。**

面積フィルタ後の連結領域はちょうど9個で、重心は9セルへきれいに分かれた。
白いダイカット枠が本体・文字・装飾を物理的につないでいるため、
「1スタンプが複数の領域に分かれる」問題がそもそも起きなかった。

一方 Fixture A（白フチなし）は17個の領域に分かれた（本体9個＋離れた装飾8個）。
つまり**両方の形に対応する必要がある**。

**2. 単純分割が失敗する理由は「隙間が無い」ではなく「隙間の位置が行ごとに違う」。**

```text
Fixture B の縦の隙間:   上段 x 443〜487    下段 x 364〜394
```

各行には十分な隙間があるが、縦一直線に空く列が1本も存在しない。
したがって射影プロファイルでは切断線を引けない。

### アルゴリズム

1. アルファマスクから連結領域を抽出する（Union-Find による2パス走査、8近傍）
2. 面積がシート全体の 0.02% 未満の領域をノイズとして除く
3. 内容全体の範囲を3 × 3 に割り、9つの想定中心を求める
   （画像の寸法ではなく内容の範囲を使う。余白が上下左右で均等とは限らないため）
4. 各領域の重心から最も近いセルを求め、**セルごとに一番大きい領域を「本体」とする**
   9セルすべてに本体が必要。欠けていれば手動修正へ回す
5. 残りの領域（文字・ハート・効果線など）を本体へ寄せる。
   評価は `本体との距離 + 想定中心との距離 × 0.25`。
   実測では装飾のほとんどが本体の範囲に接しているため距離が決め手になるが、
   離れている場合に位置ヒントが効く
6. グループの範囲は、所属する領域の外接矩形の和
7. 安全余白は**隣との隙間の半分**を上限とする。
   片側だけを見て決めると、両側が同じ隙間へ伸びて食い込む
   （実測では1pxしか空いていない境目に両側から8pxずつ伸び、697px重なった）
8. 各グループに確信度を付け、低いものにだけ確認を促す

処理時間は 1254 × 1254 のシートで約 115ms。当初想定していた解析用の縮小は、
この速度なら不要と判断して実装しない（PRODUCT_SPEC.md §76「簡単か」）。
より大きなシートで問題が出たら追加する。

### 実測結果

| シート | 方式 | 抽出数 | 内容の取りこぼし | 範囲の重なり |
|---|---|---:|---:|---:|
| A 整列・透過 | 単純分割 | 9 | 0.0000% | 0 px |
| B 白フチ自由配置 | まとめ上げ | 9 | 0.0000% | 0 px |
| C 文字が多い | 単純分割 | 9 | 0.0000% | 0 px |

いずれも9個すべて確信度1.00（確認不要）。目視でも、文字・装飾が
正しいキャラクターに付いていることを確認済み。

---

## 77.13 複数シートと性能（Phase 5）

**実装日:** 2026-08-26

### シートの並び替えはボタンで行う（原仕様§38 からの意図的な変更）

原仕様はシート順のドラッグ変更を求めているが、対象は最大5枚と少なく、
「前へ / 後へ」ボタンのほうが操作が明確で、キーボードでもそのまま使える。
スタンプの並び替え（40個・§77.6）はドラッグにする価値があるが、
5枚の入れ替えにドラッグは過剰と判断した。

### PNGの書き出しを自前で行う

ブラウザの `OffscreenCanvas.convertToBlob()` を使わず、
`src/core/image/png.ts` で自前にPNGを組み立てる。

**理由1：性能。** 大きなシートから切り出したキャンバスに対して、
実測で1枚あたり約1007msかかった（2枚目以降、毎回ほぼ同じ値）。
描画自体は0ms、`convertToBlob` だけが待たされる状態で、
40個セットの書き出しに41.3秒を要した。自前の書き出しに変えて **0.6秒** になった。

**理由2：出力の保証。** LINEは8bit・背景透過を求める。
自前に組み立てればカラータイプ6（RGBA）・ビット深度8で必ず書き出せる。

**理由3：テスト可能性。** DOMに依存しない純粋関数なので、
Nodeの単体テストで復号して画素を1つずつ突き合わせられる。

実装は行ごとに5種類のフィルタを試し、差分の絶対値の合計が最も小さいものを選ぶ
（PNG仕様が推奨する一般的な方法）。透明な余白の多いスタンプでよく効く。

### signal の循環に注意する

書き出しが同期処理になったことで、プレビュー更新の effect が
「自分が書き込む signal を自分で読む」形になり `Cycle detected` が発生した。
effect の中から signal を読むときは、依存に加えたくない場合 `.peek()` を使う。

### 実測値

| 操作 | 時間 |
|---|---:|
| シート5枚の読み込み（解析・9個抽出・プレビュー生成を含む） | 1.1 秒 |
| 40個セットの書き出し（42枚のPNG生成 + ZIP） | 0.6 秒 |
| 1254 × 1254 シート1枚の連結領域解析 | 約 115ms |

---

## 77.14 セリフの設計（Phase 6）

**実装日:** 2026-08-26

### 45スロットを先に決める（原仕様§19〜§28 の再構成）

原仕様は「ChatGPTに45種類のセリフを考えさせ、その回答を貼り付けて解析する」流れだった。
しかし実際の生成では、似た意味・似た言い回し・似たポーズの重複が観測されている（原仕様§8）。
AIに自由に45個考えさせる限り、この問題は残る。

そこで**枠を先に決めて、AIには枠を埋めさせる**形へ変更する。

### 9カテゴリ × 5周

45スロットを「9つのカテゴリを5回繰り返す」順に並べる。

```text
        あいさつ 返事 お礼 おわび よろこび 困った 応援 予定 わかれ
1周目 →   01    02   03   04    05    06   07   08   09   ← シート1枚目
2周目 →   10    11   12   13    14    15   16   17   18   ← シート2枚目
   …
5周目 →   37    38   39   40    41    42   43   44   45   ← シート5枚目
```

これで3つが同時に成り立つ。

1. **どこで切っても偏らない** — 8個セット（候補9件）でも9カテゴリが1つずつ入る
2. **1シート = 1周** — 生成される各シートが必ず9種類バラバラになる
3. **シート単位で作り直せる** — 3枚目だけ失敗したら3枚目だけ再生成すればよい

カテゴリ数がシート1枚のスタンプ数（9）と一致していることが、この構造の要。

### ポーズ表は共通、セリフ表は用途ごと

「表情 × ポーズ × 見せ方 × 小道具」の45件は**全用途で共通**にする。
表情やポーズはキャラクターの話であって用途の話ではないため。
用途ごとに変わるのはセリフだけ。

これで作業量が用途数ぶんの1になり、かつどの用途を選んでもポーズの多様性が保証される。

小道具は45件中12件（約27%）にだけ付ける。全スロットに付けない理由：

- 参照画像がキャラクター外見の正であり、指定が増えるほどずれる（原仕様§18）
- 小道具が増えるほどシートが複雑になり、隣のスタンプと接触して抽出が失敗しやすくなる

衣装・体の特徴は一切指定しない。これはテストで検証する。

### 重複防止は実行時コードではなくテストで

表が静的であれば、重複は構造的に起こらない。
「同じポーズが連続しない」「同じ見せ方が3回以上続かない」といったルールは、
実行時の判定ロジックではなく**テストで表を検証**する形にする。
実行時コードが増えず、用途を追加しても自動で検証される。

実際にこの検証が、ビジネス用カジュアルの「ありがとう」と「ありがと」という
同語の表記違いを検出した。

### 実測：枠を決めるだけでは重複は止まらなかった

**測定日:** 2026-08-26
**条件:** ビジネス用45枠、枠ごとの表情とポーズを伝えた依頼プロンプト

ChatGPTの回答は次のようになった。

```text
お礼   → ありがとうございます / ありがとうございます / ありがとうございます
         / ありがとうございます / ありがとうございます
おわび  → 申し訳ございません / 失礼いたしました / 申し訳ございません
         / 申し訳ございません / 残念です
```

「ありがとうございます」が6つの枠に入り、完全一致が4組・似ている組が4組あった。

**原因：** 枠ごとのポーズは伝えていたが、「この5枠は同じ種類なので互いに違う言い方にする」
とは言っていなかった。AIは枠の種類を推測できても、
「同じ種類どうしで重複するな」という制約は明示しないと守らない。

**対策：** 依頼プロンプトに次を加えた。

1. 冒頭に「45個すべて違う言葉にしてください」を置く
2. 「【お礼】は 3、12、21、30、39 番の5個です。5個とも違う言い方にしてください。」
   というように、同じ種類の枠がどれとどれかを明示する
3. 各枠の行に種類名を付ける（`3. 【お礼】感動した様子で両手を合わせる（正面）`）
4. 「ありがとうございますのようなよく使う言葉ほど、1回だけに」と具体例で釘を刺す

この回答は `tests/fixtures/chatgpt-answer-business.txt` に保存し、回帰テストにしている。
合成データでは作れない、現実のAIの振る舞いを固定するため。

### 重複した場合の直し方

貼り付けたセリフに重複があれば、**どの番号がどう重なっているかまで表示**する。
件数だけでは直しようがない。

「同じになっている分を、もとのセリフに戻す」ボタンで、重なった枠だけを
用意した表のセリフへ戻せる。最初の1つは残すので、AIが書いた分は大半が残る
（実測では45件中30件が残った）。戻した先がまた重なることがあるため、
完全一致が無くなるまで繰り返す。

「似ている」だけの組は戻さない。用意した表にも意図した使い分けとして
入っており、消し切れると約束できないため。

### 表情は「様子」へつながる形で持つ

`${表情}な様子で${ポーズ}` と機械的に組み立てると「明るいな様子で」
「感動な様子で」のように壊れる。この文はユーザーの画面にも、
画像生成AIへ渡す文章にも出るため、表情そのものを連体形で持つ
（「元気な」「明るい」「感動した」）。テストで検証する。

小物はポーズの文に書き込み、別途付け足さない。
両方に書くと「傘をさして歩く、傘を添える」になる。

### 貼り付け経路は残す（原仕様§25〜§28）

用意したセリフが気に入らない場合のために、
「ChatGPTに書かせる → 回答を貼り付ける」経路を残す。
ただし丸投げせず、**45枠それぞれに1件だけ書かせる**プロンプトを出す。
自由記述パーサ（§26 / §27）とTC11 / TC12はそのまま実装する。

### 画像生成プロンプトに必ず入れる指示

```text
・幅広で完全に透明な隙間を設ける
・隣のステッカーと接触または重ならないようにする
・背景、背景装飾、影は追加しない
・キャラクターの見た目は添付画像のとおりにする
・衣装や体の特徴を変えない
```

前半3つは好みの問題ではなく、実測で抽出の成否に直結する（§10 / §77.4）。
後半2つは参照画像を正とするため（§18）。
これらが入っていることはテストで検証する。

なお、この文面が必ず成功するとは表現しない（§34）。UI上も「推奨する文章」と書く。

---

## 77.6 並び替えUI（原仕様§41 からの意図的な変更）

**変更内容：** モバイルの操作を「long press + drag」ではなく、**ドラッグハンドル + Pointer Events** とする。

**理由：**

- HTML5 Drag and Drop はタッチ環境で挙動が一貫しない（iOS Safari は部分的に動作するが、Android Chrome はタッチ由来の drag イベントを発火しない）。環境差が大きいため採用しない
- long press 方式は「スクロールなのかドラッグ開始なのか」を判別するタイマー・移動閾値・キャンセル処理・iOS の callout 抑止が必要で、実装も体験も不安定になる
- ドラッグハンドル方式なら、ハンドルにだけ `touch-action: none` を指定すればよい。カード本体は通常どおりスクロールし、ハンドル上の `pointerdown` で即座にドラッグを開始できる。判別ロジックが不要になる
- Pointer Events（`pointerdown` / `pointermove` / `pointerup` + `setPointerCapture`）はマウス・タッチ・ペンを統一的に扱える
- ハンドルはボタンとして実装し、キーボードの左右矢印キーでも前後入れ替えができるようにする（アクセシビリティ、原仕様§60 Phase 8）

原仕様§76 の判断順序「1. 簡単か 2. 失敗しにくいか」に照らして、ハンドル方式を採る。

将来、初見ユーザーテストで「カード本体をドラッグしようとする」挙動が多く観測された場合に限り、long press を追加する。

---

## 77.7 入力形式と非透過画像の扱い（原仕様§37 の補足）

対応形式は PNG / JPEG / WebP（原仕様どおり）。ただし **JPEG にはアルファチャンネルが存在せず、本製品の検出アルゴリズムは原理的に動作しない。**

実装方針：

1. 読み込み自体は受け付ける
2. アルファ情報が実質的に存在しないと判定した場合、次を表示する
   > 背景が透明ではありません。背景を自動で抜いてみますか？
3. ワンボタンで**四隅からの色フラッドフィル**による簡易背景除去を提供する（外部AI不使用・元データ非破壊・やり直し可能）
4. それでも良好な結果が得られない場合は、透過PNGでの再生成を案内する

UI には「アルファ」「フラッドフィル」等の内部用語を出さない（原仕様§4）。

---

## 77.8 最終スタンプのサイズ方針（原仕様§43 の既定変更）

**既定を「内容トリム」とする。**

```text
内容の外接矩形でトリム
  → 安全余白を加算（既定 8px）
  → 幅・高さを偶数へ切り上げ
  → 370 × 320 を超える場合のみ等比縮小
```

理由：全画像を一律 370 × 320 の透明キャンバスに統一すると、LINE 上では画像がそのまま縮小表示されるため、余白の多いスタンプはキャラクターが小さく見え、**スタンプごとの表示サイズがばらつく**。規格は満たすが仕上がりの品質が落ちる。

設定で「すべて 370 × 320 に統一」も選択可能とするが、既定にはしない。

---

## 77.9 オフライン配布と保存（実測値）

原仕様§51（IndexedDB による永続化）と §54（HTMLをダブルクリックして利用）が両立するかを、
実装前に**実測**した。

**測定日:** 2026-08-26
**対象:** `dist-offline/index.html` を `file://` で開き、`indexedDB.open()` を実行

| ブラウザ | 画面表示 | IndexedDB |
|---|---|---|
| Google Chrome（実機） | 可 | **使える** |
| Chromium (Playwright) | 可 | 使える |
| WebKit (Playwright / Safari相当) | 可 | 使える |

**結論：現時点では `file://` でも IndexedDB は利用でき、§51 と §54 は両立する。**

（設計レビュー時点では「Chrome / Safari は file:// で IndexedDB を拒否する」と想定していたが、
実測により誤りであることが判明した。この記録は同じ調査を繰り返さないために残す。）

ただし、次の理由から `ProjectStore` はインターフェースとして定義し、
起動時に可用性を実測してフォールバックできる形を保つ。コストは小さく、保険として妥当と判断する。

- プライベートブラウジングや容量制限で失敗しうる
- ブラウザのポリシーは変わりうる（`file://` の扱いは過去に変遷がある）
- Playwright の WebKit は Safari そのものではないため、実機 Safari では要再確認

フォールバック時の挙動：`memory-store` へ切り替え、次を表示する。

> このモードでは自動保存ができません。作業を中断する前に「プロジェクトを保存」してください。

その環境では `PROJECT_PACKAGE.zip` の書き出し／読み込みを保存手段とする。

この可用性は E2E テスト（`tests/e2e/smoke.spec.ts`）で継続的に確認し、
将来ブラウザ側の挙動が変わった場合に気づけるようにする。

---

## 77.10 セリフとステッカーの対応（原仕様§38 の補足）

シート番号・位置から StickerPlan への自動対応は、AIが指示どおりの順序で描いた場合にのみ成立する。実際には並びや文言が変わりうる。

したがって自動対応は常に**「推定」として提示**し、各カード上でテキストを直接編集できるようにする。自動対応が正しい前提でエクスポートまで進める設計にはしない。

---

## 77.11 テスト戦略（要約）

詳細は `TEST_PLAN.md` を単一の真実とする。

| 層 | ツール | 対象 |
|---|---|---|
| 単体 | Vitest (node) | `src/core/**` の純粋関数 |
| 回帰（画像） | Vitest (node) + PNGデコーダ | 実AI画像 Fixture A–E の検出結果 |
| E2E | Playwright | 実ブラウザでの全フロー・ZIP内容・リロード復元・`file://` 起動 |

**最重要の自動不変条件：**

```text
抽出9枚の不透明画素の合計 ÷ 元シートの不透明画素 ≧ 0.995
かつ  各グループ矩形の重なり面積 = 0
```

「内容を切っていない」「二重に取っていない」をこの2式で機械的に検出する。

---

## 77.12 MVP の完成条件

原仕様§59 のフローに対し、以下をすべて満たした時点を MVP 完成とする。

**機能**

1. PNG をドラッグ&ドロップまたは選択で読み込める
2. 9個が自動抽出され、3 × 3 のプレビューが表示される
3. 8個を選び、ドラッグハンドルで並び替えられる（PC・モバイル両方）
4. 1枚を選んで `main.png`（240 × 240）を作成できる
5. 1枚を選んで `tab.png`（96 × 74）を作成できる（**ズーム + 位置調整あり**。96 × 74 に全身を収めると内容が判別できないため）
6. 書き出し前チェックが通ると `LINE_UPLOAD.zip` が保存される

**品質（自動テストで検証）**

7. Fixture A で9個すべてが抽出され、§77.11 の不変条件を満たす
8. 出力PNGがすべて：PNG形式 / 8bit RGBA / 幅・高さとも偶数 / 370 × 320 以内 / 1MB 以下
9. ZIP内が `main.png` `tab.png` `01.png`〜`08.png` のみ
10. `npm test` 全緑、`tsc --noEmit` エラー 0

**UX**

11. 通常画面に「Alpha」「Connected Components」等の内部用語が一切出ない
12. 初見の人が説明なしで ZIP まで到達できる（Phase 8 で実測。MVP時点では文言レビューのみ）

---

**END OF IMPLEMENTATION DECISIONS**
