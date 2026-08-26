import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { ExtractedSticker } from '../../state/sheet-store.js';

interface Props {
  items: ExtractedSticker[];
  onMove: (from: number, to: number) => void;
  /** カードに出すセリフ。絵が小さくても文字で見分けられるようにする。 */
  texts: ReadonlyMap<string, string>;
}

/**
 * 並び替え。ドラッグ用のつまみを付け、Pointer Events で動かす。
 *
 * HTML5のドラッグ&ドロップを使わないのは、タッチ環境で挙動が一貫しないため。
 * 長押しで開始する方式にしないのは、スクロールとの判別に時間の計測や移動量の
 * 閾値が必要になり、実装も操作感も不安定になるため。つまみにだけ
 * touch-action: none を指定すれば、カード本体は普通にスクロールできる。
 * つまみはボタンなので、矢印キーでも前後に動かせる（PRODUCT_SPEC.md §77.6）。
 *
 * 動かしている間の受け取りには、2つの落とし穴があった。どちらも実測で判明した。
 *
 * 1. つまみ自身で受け取ると、並び替えでDOMの要素が動いたときに
 *    ポインタのつかみが外れる。つまみの上で指を離さないと終了処理が走らず、
 *    カードの絵の上や隙間で離すとそのままくっついてきた。
 *    → ウィンドウで受け取る。
 *
 * 2. ウィンドウへの登録を useEffect で行うと、登録が描画後になるため間に合わない。
 *    WebKitでは、登録が終わる前に指が離れていた。結果として、
 *    ドラッグ中は何も起きず、離したあとの移動で並び替わっていた。
 *    → 押した瞬間に同期で登録する。
 */
export function ReorderStrip({ items, onMove, texts }: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  const dragIndexRef = useRef<number | null>(null);
  const detachRef = useRef<(() => void) | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const stop = useCallback((): void => {
    detachRef.current?.();
    detachRef.current = null;
    dragIndexRef.current = null;
    setOverIndex(null);
  }, []);

  // 画面から消えるときに取りこぼさない
  useEffect(() => () => detachRef.current?.(), []);

  const startDrag = (event: PointerEvent, index: number): void => {
    // 主ボタン以外では始めない
    if (event.button !== 0) return;
    event.preventDefault();
    detachRef.current?.();

    dragIndexRef.current = index;
    setOverIndex(index);

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

    const handleMove = (moveEvent: PointerEvent): void => {
      const from = dragIndexRef.current;
      if (from === null) return;
      moveEvent.preventDefault();
      const over = indexAtPoint(moveEvent.clientX, moveEvent.clientY);
      if (over === null || over === from) return;
      onMove(from, over);
      dragIndexRef.current = over;
      setOverIndex(over);
    };

    const handleKey = (keyEvent: KeyboardEvent): void => {
      if (keyEvent.key === 'Escape') stop();
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('blur', stop);
    window.addEventListener('keydown', handleKey);

    detachRef.current = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      window.removeEventListener('blur', stop);
      window.removeEventListener('keydown', handleKey);
    };
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
          key={item.id}
          class={`reorder__item${overIndex === index ? ' reorder__item--dragging' : ''}`}
        >
          <span class="reorder__number">{String(index + 1).padStart(2, '0')}</span>
          <img class="reorder__image" src={item.previewUrl} alt={`${index + 1}番目のスタンプ`} />
          <span class="reorder__text">{texts.get(item.id) ?? ''}</span>
          <button
            type="button"
            class="reorder__handle"
            aria-label={`${index + 1}番目を移動（左右キーで前後に動かせます）`}
            onPointerDown={(event) => startDrag(event, index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span aria-hidden="true">⠿</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
