import { TONE_LABELS } from '../../core/text/presets.js';
import type { Tone } from '../../core/text/presets.js';
import { USE_PRESETS, choosePreset, chooseTone, preset, presetId, tone } from '../../state/plan-store.js';

const TONES: Tone[] = ['casual', 'polite'];

/** 用途と言葉づかいを選ぶ。 */
export function PresetChooser() {
  return (
    <div>
      <div class="preset-chooser" role="group" aria-label="使う場面">
        {USE_PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            class={`preset-chooser__item${item.id === presetId.value ? ' preset-chooser__item--on' : ''}`}
            aria-pressed={item.id === presetId.value}
            onClick={() => choosePreset(item.id)}
          >
            <span class="preset-chooser__label">{item.label}</span>
            <span class="preset-chooser__description">{item.description}</span>
          </button>
        ))}
      </div>

      <div class="tone-chooser" role="group" aria-label="言葉づかい">
        <span class="tone-chooser__title">言葉づかい</span>
        {TONES.map((item) => (
          <button
            key={item}
            type="button"
            class={`tone-chooser__item${item === tone.value ? ' tone-chooser__item--on' : ''}`}
            aria-pressed={item === tone.value}
            onClick={() => chooseTone(item)}
          >
            {TONE_LABELS[item]}
          </button>
        ))}
        <span class="tone-chooser__example">
          例：{preset.value.texts[0]?.[tone.value]}
        </span>
      </div>
    </div>
  );
}
