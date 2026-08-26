import { useRef, useState } from 'preact/hooks';
import { importSheet } from '../../state/sheet-store.js';

export function SheetDropZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);

  const handleFiles = (files: FileList | null): void => {
    const file = files?.[0];
    if (file) void importSheet(file);
  };

  return (
    <div
      class={`dropzone${isOver ? ' dropzone--over' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsOver(false);
        handleFiles(event.dataTransfer?.files ?? null);
      }}
    >
      <p class="dropzone__lead">ステッカーシートをここにドラッグ</p>
      <p class="dropzone__sub">3×3に9個ならんだ、背景が透明な画像</p>
      <button type="button" class="button" onClick={() => inputRef.current?.click()}>
        ファイルを選ぶ
      </button>
      <input
        ref={inputRef}
        class="visually-hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => handleFiles((event.target as HTMLInputElement).files)}
      />
    </div>
  );
}
