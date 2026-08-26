import { useRef, useState } from 'preact/hooks';
import { importSheets } from '../../state/sheet-store.js';

interface Props {
  /** あと何枚必要か。0以下なら「追加で読み込む」扱い。 */
  remaining: number;
  compact?: boolean;
}

export function SheetDropZone({ remaining, compact = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);

  const handleFiles = (files: FileList | null): void => {
    if (!files || files.length === 0) return;
    void importSheets([...files]);
  };

  const lead =
    remaining > 0
      ? `ステッカーシートをここにドラッグ（あと${remaining}枚）`
      : 'ステッカーシートをここにドラッグ';

  return (
    <div
      class={`dropzone${isOver ? ' dropzone--over' : ''}${compact ? ' dropzone--compact' : ''}`}
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
      <p class="dropzone__lead">{lead}</p>
      {!compact && <p class="dropzone__sub">3×3に9個ならんだ、背景が透明な画像</p>}
      <button type="button" class="button" onClick={() => inputRef.current?.click()}>
        ファイルを選ぶ
      </button>
      <input
        ref={inputRef}
        class="visually-hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={(event) => handleFiles((event.target as HTMLInputElement).files)}
      />
    </div>
  );
}
