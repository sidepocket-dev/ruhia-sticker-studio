import type { ExtractedSticker } from '../../state/sheet-store.js';

interface Props {
  items: ExtractedSticker[];
  selectedId: string | null;
  onChoose: (id: string) => void;
  label: string;
}

/** メイン画像・タブ画像に使う1枚を選ぶ。 */
export function ImageChooser({ items, selectedId, onChoose, label }: Props) {
  return (
    <ul class="chooser" aria-label={label}>
      {items.map((item, index) => (
        <li key={item.id}>
          <button
            type="button"
            class={`chooser__item${item.id === selectedId ? ' chooser__item--on' : ''}`}
            aria-pressed={item.id === selectedId}
            onClick={() => onChoose(item.id)}
          >
            <img src={item.previewUrl} alt={`${index + 1}番目のスタンプ`} />
          </button>
        </li>
      ))}
    </ul>
  );
}
