import { vibrationChoice, vibrationPatch, VIBRATION_CHOICES, type GameSettings, type VibrationChoice } from '../settings/Settings';
import { requireElement } from './dom';

/**
 * What a Music or Sound effects switch in the HUD changes. Turning one on
 * also lifts the master mute (Settings → Sound), or the switch would show
 * "on" and stay silent; turning one off leaves the mute alone.
 */
export function channelPatch(channel: 'music' | 'sfx', on: boolean): Partial<GameSettings> {
  return on ? { [channel]: true, muted: false } : { [channel]: false };
}

/** A channel switch shows what is actually playing: on only when its own switch is on and sound isn't muted. */
export function channelAudible(settings: GameSettings, channel: 'music' | 'sfx'): boolean {
  return settings[channel] && !settings.muted;
}

/**
 * The music, sound effects and vibration controls in the HUD's quick
 * settings card (below the theme swatches, see ThemePicker). Every change
 * goes straight to the settings, which save and apply at once, and the card
 * re-renders from them, so it always matches the Settings screen.
 */
export class QuickSettings {
  private readonly music = requireElement<HTMLInputElement>('quick-music');
  private readonly sfx = requireElement<HTMLInputElement>('quick-sfx');
  private readonly vibration: HTMLInputElement[];

  constructor(
    onChange: (patch: Partial<GameSettings>) => void,
    private readonly vibrationSupported: boolean,
  ) {
    const root = requireElement('quick-settings');
    this.vibration = [...root.querySelectorAll<HTMLInputElement>('input[name="quick-vibration"]')];
    this.music.addEventListener('change', () => onChange(channelPatch('music', this.music.checked)));
    this.sfx.addEventListener('change', () => onChange(channelPatch('sfx', this.sfx.checked)));
    this.vibration.forEach((radio) =>
      radio.addEventListener('change', () => {
        if (radio.checked && VIBRATION_CHOICES.includes(radio.value as VibrationChoice)) onChange(vibrationPatch(radio.value as VibrationChoice));
      }),
    );
    if (!vibrationSupported) this.vibration.forEach((radio) => (radio.disabled = true));
  }

  render(settings: GameSettings): void {
    this.music.checked = channelAudible(settings, 'music');
    this.sfx.checked = channelAudible(settings, 'sfx');
    const choice = this.vibrationSupported ? vibrationChoice(settings) : 'off';
    this.vibration.forEach((radio) => (radio.checked = radio.value === choice));
  }
}
