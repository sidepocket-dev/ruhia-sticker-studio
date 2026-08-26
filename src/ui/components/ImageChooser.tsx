import type { ExtractedSticker } from '../../state/sheet-store.js';

interface Props {
  items: ExtractedSticker[];
  selectedId: number | null;
  onChoose: (cellIndex: number) => void;
  label: string;
}

/** メイン画像・タブ画像に使う1枚を選ぶ。 */
export function ImageChooser({ items, selectedId, onChoose, label }: Props) {
  return (
    <ul class="chooser" aria-label={label}>
      {items.map((item, index) => (
        <li key={item.region.cellIndex}>
          <button
            type="button"
            class={`chooser__item${item.region.cellIndex === selectedId ? ' chooser__item--on' : ''}`}
            aria-pressed={item.region.cellIndex === selectedId}
            onClick={() => onChoose(item.region.cellIndex)}
          >
            <img src={item.previewUrl} alt={`${index + 1}番目のスタンプ`} />
          </button>
        </li>
      ))}
    </ul>
  );
}
