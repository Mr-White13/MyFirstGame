import type { ResolvedAppearance } from '../settings/Appearance';
import type { GameSettings } from '../settings/Settings';
import { requireElement } from './dom';

export interface SettingsActions {
  onBack(): void;
  /** A control changed; the value is not validated yet (SettingsStore does that). */
  onChange(patch: Partial<GameSettings>): void;
  /** The effects slider was let go: play a sample at the new volume. */
  onPreviewSfx(): void;
  onReset(): void;
  /** Plays one strong test vibration; resolves with a short message for the player. */
  onTestVibration(): Promise<string>;
  /** Hidden developer switch: five taps on Version. Returns a short status message. */
  onToggleDiagnostics(): string;
}

/** What the device can do, so the screen can explain controls that won't have an effect here. */
export interface DeviceSupport {
  readonly vibration: boolean;
  readonly audio: boolean;
}

type SwitchKey = 'music' | 'sfx' | 'haptics' | 'showTimer' | 'confirmRestart';

const THEME_HINTS: Record<GameSettings['theme'], string> = {
  dark: 'The original look: dark navy with cyan and purple neon.',
  light: 'A bright board with darker lines and deep, high-contrast arrows.',
  colorful: 'Each arrow gets its own neon colour. Red still means activated.',
  system: '',
};

/**
 * The Settings screen. Every control writes straight to the settings (which
 * save and apply at once) and the screen re-renders from the stored values,
 * so what's shown is always what's in effect.
 */
export class SettingsScreen {
  private readonly root = requireElement('screen-settings');
  private readonly sound = requireElement<HTMLInputElement>('set-sound');
  private readonly switches: Record<SwitchKey, HTMLInputElement> = {
    music: requireElement('set-music'),
    sfx: requireElement('set-sfx'),
    haptics: requireElement('set-haptics'),
    showTimer: requireElement('set-timer'),
    confirmRestart: requireElement('set-confirm-restart'),
  };
  private readonly musicVolume = requireElement<HTMLInputElement>('set-music-volume');
  private readonly sfxVolume = requireElement<HTMLInputElement>('set-sfx-volume');
  private readonly musicValue = requireElement<HTMLOutputElement>('set-music-volume-value');
  private readonly sfxValue = requireElement<HTMLOutputElement>('set-sfx-volume-value');
  private readonly themeHint = requireElement('theme-hint');
  private readonly motionHint = requireElement('motion-hint');
  private readonly audioNote = requireElement('audio-note');
  private readonly hapticsHint = requireElement('haptics-hint');
  private settings?: GameSettings;
  private audioUnavailable = false;

  constructor(
    actions: SettingsActions,
    private readonly support: DeviceSupport,
    version: string,
  ) {
    const versionEl = requireElement('settings-version');
    versionEl.textContent = version;
    let taps = 0;
    let tapTimer = 0;
    versionEl.addEventListener('click', () => {
      taps++;
      window.clearTimeout(tapTimer);
      tapTimer = window.setTimeout(() => (taps = 0), 1500);
      if (taps >= 5) {
        taps = 0;
        versionEl.textContent = `${version} · ${actions.onToggleDiagnostics()}`;
        window.setTimeout(() => (versionEl.textContent = version), 2500);
      }
    });
    requireElement('btn-settings-back').addEventListener('click', () => actions.onBack());
    requireElement('btn-reset-settings').addEventListener('click', () => actions.onReset());
    const testButton = requireElement<HTMLButtonElement>('btn-test-vibration');
    const testStatus = requireElement('vibration-test-status');
    testButton.addEventListener('click', () => {
      testButton.disabled = true;
      testStatus.textContent = 'Vibrating…';
      void actions
        .onTestVibration()
        .then((message) => (testStatus.textContent = message))
        .finally(() => setTimeout(() => (testButton.disabled = false), 600));
    });

    for (const name of ['theme', 'motion', 'effects'] as const) {
      this.radios(name).forEach((radio) =>
        radio.addEventListener('change', () => radio.checked && actions.onChange({ [name]: radio.value } as Partial<GameSettings>)),
      );
    }
    this.sound.addEventListener('change', () => actions.onChange({ muted: !this.sound.checked }));
    (Object.keys(this.switches) as SwitchKey[]).forEach((key) => {
      const input = this.switches[key];
      input.addEventListener('change', () => actions.onChange({ [key]: input.checked }));
    });
    // Volumes apply while dragging; the effects sample plays once, on release.
    this.musicVolume.addEventListener('input', () => actions.onChange({ musicVolume: this.musicVolume.valueAsNumber / 100 }));
    this.sfxVolume.addEventListener('input', () => actions.onChange({ sfxVolume: this.sfxVolume.valueAsNumber / 100 }));
    this.sfxVolume.addEventListener('change', () => actions.onPreviewSfx());

    if (!support.vibration) {
      testButton.disabled = true;
      testStatus.textContent = 'Not available on this device.';
      this.switches.haptics.disabled = true;
      this.hapticsHint.textContent = "This browser can't vibrate. It works in Chrome on Android phones.";
    }
  }

  get isOpen(): boolean {
    return !this.root.inert && this.root.classList.contains('screen--active');
  }

  render(settings: GameSettings, appearance: ResolvedAppearance): void {
    this.settings = settings;
    this.check('theme', settings.theme);
    this.check('motion', settings.motion);
    this.check('effects', settings.effects);
    this.sound.checked = !settings.muted;
    (Object.keys(this.switches) as SwitchKey[]).forEach((key) => (this.switches[key].checked = settings[key]));
    if (!this.support.vibration) this.switches.haptics.checked = false;

    this.setSlider(this.musicVolume, this.musicValue, settings.musicVolume);
    this.setSlider(this.sfxVolume, this.sfxValue, settings.sfxVolume);
    // Sliders and channel switches stay usable while muted (set things up silently),
    // but are dimmed so it's clear nothing is playing.
    this.root.classList.toggle('settings--muted', settings.muted);
    this.musicVolume.closest('.setting')?.classList.toggle('setting--inactive', settings.muted || !settings.music);
    this.sfxVolume.closest('.setting')?.classList.toggle('setting--inactive', settings.muted || !settings.sfx);

    this.themeHint.textContent =
      settings.theme === 'system'
        ? `Follows your device: ${appearance.theme === 'light' ? 'Light' : 'Dark Neon'} right now.`
        : THEME_HINTS[settings.theme];
    this.motionHint.textContent =
      settings.motion === 'auto'
        ? `Follows your device: reduced motion is ${appearance.reducedMotion ? 'on' : 'off'} right now.`
        : settings.motion === 'reduce'
          ? 'Screen transitions, particles and background motion are off. Arrows still move.'
          : 'Full animation, even if your device asks for reduced motion.';
    this.renderAudioNote(settings);
  }

  /** Shows a note when the audio device can't be opened (no Web Audio, or no output device). */
  setAudioUnavailable(unavailable: boolean): void {
    if (unavailable === this.audioUnavailable) return;
    this.audioUnavailable = unavailable;
    if (this.settings) this.renderAudioNote(this.settings);
  }

  private renderAudioNote(settings: GameSettings): void {
    let note = '';
    if (!this.support.audio || this.audioUnavailable) note = 'Audio is not available on this device right now.';
    else if (settings.muted) note = 'Sound is off. Music and effects keep their own settings for when you turn it back on.';
    this.audioNote.textContent = note;
    this.audioNote.hidden = note === '';
  }

  private radios(name: string): HTMLInputElement[] {
    return [...this.root.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${name}"]`)];
  }

  private check(name: string, value: string): void {
    this.radios(name).forEach((radio) => (radio.checked = radio.value === value));
  }

  private setSlider(input: HTMLInputElement, output: HTMLOutputElement, volume: number): void {
    const percent = Math.round(volume * 100);
    // Don't fight the thumb while it's being dragged; the value is the same anyway.
    if (input.valueAsNumber !== percent) input.value = String(percent);
    input.style.setProperty('--fill', `${percent}%`);
    input.setAttribute('aria-valuetext', `${percent}%`);
    output.textContent = `${percent}%`;
  }
}
