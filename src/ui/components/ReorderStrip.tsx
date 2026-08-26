import { useRef, useState } from 'preact/hooks';
import type { ExtractedSticker } from '../../state/sheet-store.js';

interface Props {
  items: ExtractedSticker[];
  onMove: (from: number, to: number) => void;
}

/**
 * 並び替え。ドラッグ用のつまみを付け、Pointer Events で動かす。
 *
 * HTML5のドラッグ&ドロップを使わないのは、タッチ環境で挙動が一貫しないため。
 * 長押しで開始する方式にしないのは、スクロールとの判別に時間の計測や移動量の
 * 閾値が必要になり、実装も操作感も不安定になるため。つまみにだけ
 * touch-action: none を指定すれば、カード本体は普通にスクロールできる。
 * つまみはボタンなので、矢印キーでも前後に動かせる（PRODUCT_SPEC.md §77.6）。
 */
export function ReorderStrip({ items, onMove }: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  const indexAtPoint = (x: number, y: number): number | null => {
    const list = listRef.current;
    if (!list) return null;
    const children = [...list.children];
    for (let i = 0; i < children.length; i++) {
      const rect = children[i]?.getBoundingClientRect();
      if (rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return i;
    }
    return null;
  };

  const handlePointerDown = (event: PointerEvent, index: number): void => {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragIndexRef.current = index;
    setDraggingIndex(index);
  };

  const handlePointerMove = (event: PointerEvent): void => {
    const from = dragIndexRef.current;
    if (from === null) return;
    const over = indexAtPoint(event.clientX, event.clientY);
    if (over === null || over === from) return;
    onMove(from, over);
    dragIndexRef.current = over;
    setDraggingIndex(over);
  };

  const endDrag = (event: PointerEvent): void => {
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    dragIndexRef.current = null;
    setDraggingIndex(null);
  };

  const handleKeyDown = (event: KeyboardEvent, index: number): void => {
    const delta = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const to = index + delta;
    if (to < 0 || to >= items.length) return;
    onMove(index, to);
    // 動かした先のつまみへフォーカスを追従させる
    requestAnimationFrame(() => {
      const handles = listRef.current?.querySelectorAll<HTMLButtonElement>('.reorder__handle');
      handles?.[to]?.focus();
    });
  };

  return (
    <ol class="reorder" ref={listRef}>
      {items.map((item, index) => (
        <li
          key={item.region.cellIndex}
          class={`reorder__item${draggingIndex === index ? ' reorder__item--dragging' : ''}`}
        >
          <span class="reorder__number">{String(index + 1).padStart(2, '0')}</span>
          <img class="reorder__image" src={item.previewUrl} alt={`${index + 1}番目のスタンプ`} />
          <button
            type="button"
            class="reorder__handle"
            aria-label={`${index + 1}番目を移動（左右キーで前後に動かせます）`}
            onPointerDown={(event) => handlePointerDown(event, index)}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span aria-hidden="true">⠿</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
