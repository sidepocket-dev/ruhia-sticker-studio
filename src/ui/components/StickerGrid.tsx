import type { ExtractedSticker } from '../../state/sheet-store.js';

interface Props {
  stickers: ExtractedSticker[];
}

/** 取り出したスタンプを3 × 3 で並べる。 */
export function StickerGrid({ stickers }: Props) {
  return (
    <ol class="sticker-grid">
      {stickers.map((sticker, index) => {
        const needsCheck = sticker.region.confidence < 0.7;
        return (
          <li key={sticker.region.cellIndex} class="sticker-card">
            <div class="sticker-card__frame">
              <img class="sticker-card__image" src={sticker.previewUrl} alt={`スタンプ ${index + 1}`} />
            </div>
            <div class="sticker-card__meta">
              <span class="sticker-card__number">{String(index + 1).padStart(2, '0')}</span>
              {needsCheck && (
                <span class="sticker-card__warning" title="このスタンプは確認をおすすめします">
                  要確認
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
