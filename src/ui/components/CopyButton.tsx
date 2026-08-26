import { useState } from 'preact/hooks';
import { copyText } from '../../platform/clipboard.js';

interface Props {
  text: string;
  label: string;
  variant?: 'normal' | 'quiet';
}

/** 文章をコピーするボタン。コピーできたかどうかをその場で伝える。 */
export function CopyButton({ text, label, variant = 'normal' }: Props) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');

  const handleClick = (): void => {
    void copyText(text).then((copied) => {
      setState(copied ? 'done' : 'failed');
      setTimeout(() => setState('idle'), 2400);
    });
  };

  return (
    <span class="copy">
      <button
        type="button"
        class={`button${variant === 'quiet' ? ' button--quiet' : ''}`}
        onClick={handleClick}
      >
        {label}
      </button>
      {state === 'done' && <span class="copy__note copy__note--ok">コピーしました</span>}
      {state === 'failed' && (
        <span class="copy__note copy__note--ng">
          コピーできませんでした。下の文章を選んでコピーしてください。
        </span>
      )}
    </span>
  );
}
