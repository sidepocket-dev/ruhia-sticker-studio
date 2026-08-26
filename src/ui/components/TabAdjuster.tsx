import { useRef } from 'preact/hooks';
import { LINE_STATIC_STICKER_SPEC } from '../../config/line-spec.js';
import { adjustTab, tabAdjustment, tabPreviewUrl } from '../../state/export-store.js';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
/** 作業しやすいよう拡大して表示する倍率 */
const WORK_SCALE = 3;

/**
 * タブ画像の見え方を調整する。
 *
 * 96 × 74 は非常に小さく、スタンプ全体を収めると何が描いてあるか分からない。
 * そのため、拡大率と位置を変えられるようにしている（PRODUCT_SPEC.md §45 / §77.12）。
 */
export function TabAdjuster() {
  const dragging = useRef<{ x: number; y: number } | null>(null);
  const { width, height } = LINE_STATIC_STICKER_SPEC.tab;
  const adjustment = tabAdjustment.value;

  const onPointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragging.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerMove = (event: PointerEvent): void => {
    const start = dragging.current;
    if (!start) return;
    adjustTab({
      offsetX: adjustment.offsetX + (event.clientX - start.x) / WORK_SCALE,
      offsetY: adjustment.offsetY + (event.clientY - start.y) / WORK_SCALE,
    });
    dragging.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: PointerEvent): void => {
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    dragging.current = null;
  };

  return (
    <div class="tab-adjuster">
      <div class="tab-adjuster__stage">
        <div
          class="tab-adjuster__work"
          style={{ width: `${width * WORK_SCALE}px`, height: `${height * WORK_SCALE}px` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {tabPreviewUrl.value && <img src={tabPreviewUrl.value} alt="タブ画像の見え方" />}
        </div>
        <p class="tab-adjuster__hint">ドラッグで位置を動かせます</p>
      </div>

      <div class="tab-adjuster__side">
        <p class="tab-adjuster__label">実際の大きさ</p>
        <div class="tab-adjuster__actual" style={{ width: `${width}px`, height: `${height}px` }}>
          {tabPreviewUrl.value && <img src={tabPreviewUrl.value} alt="タブ画像（実際の大きさ）" />}
        </div>

        <label class="tab-adjuster__zoom">
          <span>大きさ</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.05}
            value={adjustment.zoom}
            onInput={(event) =>
              adjustTab({ zoom: Number((event.target as HTMLInputElement).value) })
            }
          />
        </label>

        <button
          type="button"
          class="button button--quiet"
          onClick={() => adjustTab({ zoom: 1, offsetX: 0, offsetY: 0 })}
        >
          位置を戻す
        </button>
      </div>
    </div>
  );
}
