export interface GameSettings {
  sound: boolean;
  shake: boolean;
  glow:  boolean;
}

export function loadSettings(): GameSettings {
  return {
    sound: localStorage.getItem('ag_sound') !== 'off',
    shake: localStorage.getItem('ag_shake') !== 'off',
    glow:  localStorage.getItem('ag_glow')  !== 'off',
  };
}

export function saveSetting(key: keyof GameSettings, value: boolean): void {
  localStorage.setItem(`ag_${key}`, value ? 'on' : 'off');
}
