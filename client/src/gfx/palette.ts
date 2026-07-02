export const PALETTE = {
  // Backgrounds
  BG_TOP: 0x0d0221,
  BG_BOTTOM: 0x0a0a12,

  // Core game objects — semantic color coding
  PLAYER: 0x00f0ff,           // electric cyan — always the brightest
  COIN: 0xffd23f,             // gold
  POWERUP_VIOLET: 0x9d4edd,   // violet
  POWERUP_MAGENTA: 0xff2bd6,  // magenta pulse
  DANGER_RED: 0xff2e2e,       // reserved for damage — nothing safe is this color
  DANGER_ORANGE: 0xff5e1a,    // hazard variant
  PLATFORM: 0x3b3b66,         // dim desaturated blue-violet
  PLATFORM_GLOW: 0x6060cc,
  FINISH_LIME: 0xaaff00,
  FINISH_WHITE: 0xffffff,

  // UI / accents
  UI_HOT_PINK: 0xff3b81,
  UI_ACID_GREEN: 0x39ff14,

  // Parallax / world atmosphere
  GRID_LINE: 0x6b1fa8,
  GRID_BRIGHT: 0x8a1fc8,
  HORIZON: 0xff2bd6,
  STAR: 0xffffff,

  // Ghost rendering (default; each ghost also gets a distinct hue at runtime)
  GHOST_DEFAULT: 0xff66ff,
} as const;

/**
 * Distinct hues assigned to raced ghosts in order (own PB first, then rivals).
 * Kept clear of player cyan and danger red so ghosts never read as hazards.
 */
export const GHOST_HUES = [
  0xff66ff, // magenta
  0xffaa33, // amber
  0x66ffcc, // mint
  0xa066ff, // violet
] as const;

export type PaletteKey = keyof typeof PALETTE;
export type PaletteColor = (typeof PALETTE)[PaletteKey];

/** Convert 0xRRGGBB to CSS hex string */
export function toHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
