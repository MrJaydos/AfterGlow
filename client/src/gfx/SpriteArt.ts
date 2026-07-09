import Phaser from 'phaser';

type Ctx = CanvasRenderingContext2D;

function drawSprite(ctx: Ctx, colors: (string | null)[], data: number[][], scale: number): void {
  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const col = colors[data[r][c]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(c * scale, r * scale, scale, scale);
    }
  }
}

function makeTex(scene: Phaser.Scene, key: string, w: number, h: number, fn: (ctx: Ctx) => void): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  fn(tex.getContext());
  tex.refresh();
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER  (12 art cols × 22 art rows, scale=2 → 24×44 px)
// ─────────────────────────────────────────────────────────────────────────────
const PC: (string | null)[] = [
  null,       // 0 transparent
  '#061218',  // 1 dark outline
  '#004858',  // 2 shadow
  '#00a0b4',  // 3 body mid
  '#00c8d8',  // 4 lit surface
  '#80ffff',  // 5 specular
  '#60efff',  // 6 visor
  '#ffffff',  // 7 visor hot center
  '#001a22',  // 8 belt
];
const PD: number[][] = [
  [0,0,0,1,1,1,1,1,1,0,0,0], // 0  helmet dome
  [0,0,1,4,4,4,4,4,4,1,0,0], // 1  helmet lit top
  [0,0,1,3,3,3,3,3,3,1,0,0], // 2  helmet body
  [0,0,1,6,6,7,7,6,6,1,0,0], // 3  visor (bright center)
  [0,0,1,3,3,3,3,3,3,1,0,0], // 4  helmet base
  [0,1,4,4,3,3,3,3,4,4,1,0], // 5  shoulders lit
  [0,1,3,3,2,2,2,2,3,3,1,0], // 6  upper chest
  [0,1,3,2,2,2,2,2,2,3,1,0], // 7  chest
  [0,1,3,2,2,2,2,2,2,3,1,0], // 8  lower chest
  [0,0,1,3,2,2,2,2,3,1,0,0], // 9  waist
  [0,0,1,3,3,3,3,3,3,1,0,0], // 10 waist lower
  [0,0,1,8,8,8,8,8,8,1,0,0], // 11 belt
  [0,0,1,4,3,0,0,3,4,1,0,0], // 12 thigh top (leg gap begins)
  [0,0,1,3,3,0,0,3,3,1,0,0], // 13 thigh
  [0,0,1,3,2,0,0,2,3,1,0,0], // 14 thigh lower
  [0,0,1,2,2,0,0,2,2,1,0,0], // 15 knee
  [0,0,1,5,2,0,0,2,5,1,0,0], // 16 knee highlight
  [0,0,1,2,2,0,0,2,2,1,0,0], // 17 shin
  [0,0,1,2,2,0,0,2,2,1,0,0], // 18 shin
  [0,0,1,2,2,0,0,2,2,1,0,0], // 19 ankle
  [0,1,1,3,2,1,1,2,3,1,1,0], // 20 boot top (wider)
  [0,1,4,3,2,1,1,2,3,4,1,0], // 21 boot sole (lit)
];

// ─────────────────────────────────────────────────────────────────────────────
// ENEMY  (14 art cols × 18 art rows, scale=2 → 28×36 px)
// ─────────────────────────────────────────────────────────────────────────────
const EC: (string | null)[] = [
  null,       // 0
  '#120004',  // 1 dark outline
  '#6a0000',  // 2 shadow
  '#cc1414',  // 3 body mid
  '#ff2e2e',  // 4 lit (DANGER_RED)
  '#ff7070',  // 5 specular
  '#ff8800',  // 6 eyes (orange glow)
  '#330000',  // 7 belt
];
const ED: number[][] = [
  [0,0,0,0,1,1,1,1,1,1,0,0,0,0], // 0  head dome
  [0,0,0,1,4,4,4,4,4,4,1,0,0,0], // 1  head lit
  [0,0,0,1,3,3,3,3,3,3,1,0,0,0], // 2  head body
  [0,0,0,1,3,6,6,3,3,3,1,0,0,0], // 3  eyes (forward-facing offset)
  [0,0,0,1,3,3,3,3,3,3,1,0,0,0], // 4  head base
  [0,0,1,4,4,3,3,3,3,4,4,1,0,0], // 5  shoulders lit
  [0,0,1,3,3,2,2,2,2,3,3,1,0,0], // 6  chest
  [0,0,1,3,2,2,2,2,2,2,3,1,0,0], // 7  chest lower
  [0,0,1,3,2,2,2,2,2,2,3,1,0,0], // 8
  [0,0,0,1,3,2,2,2,2,3,1,0,0,0], // 9  waist
  [0,0,0,1,7,7,7,7,7,7,1,0,0,0], // 10 belt
  [0,0,0,1,4,3,0,0,3,4,1,0,0,0], // 11 thigh top
  [0,0,0,1,3,2,0,0,2,3,1,0,0,0], // 12 thigh
  [0,0,0,1,2,2,0,0,2,2,1,0,0,0], // 13 knee
  [0,0,0,1,5,2,0,0,2,5,1,0,0,0], // 14 knee highlight
  [0,0,0,1,2,2,0,0,2,2,1,0,0,0], // 15 shin
  [0,0,1,1,3,2,1,1,2,3,1,1,0,0], // 16 boots (wider)
  [0,0,1,3,3,2,1,1,2,3,3,1,0,0], // 17 boot sole
];

// ─────────────────────────────────────────────────────────────────────────────
// RUSHER  same dimensions, orange palette + wider eyes + spike on head
// ─────────────────────────────────────────────────────────────────────────────
const RC: (string | null)[] = [
  null,
  '#120800',  // 1 outline
  '#6a2000',  // 2 shadow
  '#cc4400',  // 3 body mid
  '#ff6a00',  // 4 lit (DANGER_ORANGE)
  '#ffaa44',  // 5 specular
  '#ffff00',  // 6 eyes (yellow — more menacing)
  '#441000',  // 7 belt
];
const RD: number[][] = [
  [0,0,0,1,0,1,1,1,0,1,0,0,0,0], // 0  spiked head top
  [0,0,0,1,4,4,4,4,4,4,1,0,0,0], // 1  head lit
  [0,0,0,1,3,3,3,3,3,3,1,0,0,0], // 2  head body
  [0,0,0,1,6,3,3,3,6,3,1,0,0,0], // 3  wide eyes (both sides = alert)
  [0,0,0,1,3,3,3,3,3,3,1,0,0,0], // 4  head base
  [0,0,1,4,4,3,3,3,3,4,4,1,0,0], // 5  shoulders lit
  [0,0,1,3,3,2,2,2,2,3,3,1,0,0], // 6  chest
  [0,0,1,3,2,2,2,2,2,2,3,1,0,0], // 7
  [0,0,1,3,2,2,2,2,2,2,3,1,0,0], // 8
  [0,0,0,1,3,2,2,2,2,3,1,0,0,0], // 9  waist
  [0,0,0,1,7,7,7,7,7,7,1,0,0,0], // 10 belt
  [0,0,0,1,4,3,0,0,3,4,1,0,0,0], // 11 thigh top
  [0,0,0,1,3,2,0,0,2,3,1,0,0,0], // 12 thigh
  [0,0,0,1,2,2,0,0,2,2,1,0,0,0], // 13 knee
  [0,0,0,1,5,2,0,0,2,5,1,0,0,0], // 14 knee highlight
  [0,0,0,1,2,2,0,0,2,2,1,0,0,0], // 15 shin
  [0,0,1,1,3,2,1,1,2,3,1,1,0,0], // 16 boots
  [0,0,1,3,3,2,1,1,2,3,3,1,0,0], // 17 boot sole
];

// ─────────────────────────────────────────────────────────────────────────────
// COIN  (8 art cols × 8 art rows, scale=2 → 16×16 px)
// ─────────────────────────────────────────────────────────────────────────────
const CC: (string | null)[] = [
  null,
  '#4a3000',  // 1 dark outline
  '#a85c00',  // 2 shadow gold
  '#ffd23f',  // 3 main gold
  '#fff4a0',  // 4 highlight
];
const CD: number[][] = [
  [0,0,1,1,1,1,0,0],
  [0,1,3,3,4,3,3,1],
  [1,3,3,4,4,3,3,1],
  [1,3,4,4,3,3,3,1],
  [1,3,3,3,3,3,2,1],
  [1,3,3,3,3,2,2,1],
  [0,1,3,3,2,2,1,0],
  [0,0,1,1,1,1,0,0],
];

// ─────────────────────────────────────────────────────────────────────────────
// POWERUP  lightning bolt (10 art cols × 10 art rows, scale=2 → 20×20 px)
// ─────────────────────────────────────────────────────────────────────────────
const VC: (string | null)[] = [
  null,
  '#3a006a',  // 1 dark outline
  '#9d4edd',  // 2 violet body (POWERUP_VIOLET)
  '#d0a0ff',  // 3 highlight
];
const VD: number[][] = [
  [0,0,0,0,1,1,0,0,0,0],
  [0,0,0,1,2,2,1,0,0,0],
  [0,0,1,2,2,3,1,0,0,0],
  [0,1,2,2,3,1,0,0,0,0],
  [0,1,2,2,1,1,1,0,0,0],
  [0,0,0,1,3,2,2,1,0,0],
  [0,0,1,3,2,2,1,0,0,0],
  [0,0,1,2,2,1,0,0,0,0],
  [0,0,0,1,2,1,0,0,0,0],
  [0,0,0,0,1,1,0,0,0,0],
];

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point — call once in GameScene.create()
// ─────────────────────────────────────────────────────────────────────────────
export function buildGameSprites(scene: Phaser.Scene): void {
  // 1×1 white pixel — physics body placeholder for platforms (rendered invisible)
  makeTex(scene, 'pixel', 1, 1, ctx => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1, 1);
  });

  makeTex(scene, 'player-tex',  24, 44, ctx => drawSprite(ctx, PC, PD, 2));
  makeTex(scene, 'enemy-tex',   28, 36, ctx => drawSprite(ctx, EC, ED, 2));
  makeTex(scene, 'rusher-tex',  28, 36, ctx => drawSprite(ctx, RC, RD, 2));
  makeTex(scene, 'coin-tex',    16, 16, ctx => drawSprite(ctx, CC, CD, 2));
  makeTex(scene, 'powerup-tex', 20, 20, ctx => drawSprite(ctx, VC, VD, 2));
}
