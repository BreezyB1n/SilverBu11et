/**
 * Pixel sprites shared by the SVG icons and the Home canvas scene.
 * Each character in a row is one pixel; '.' is transparent.
 * Letters map to colour tokens (see SPRITE_TOKENS), which resolve to
 * CSS variables `--sp-<token>` in SVG and to concrete colours on canvas.
 */
export type Sprite = readonly string[];

export const SPRITE_TOKENS = {
  k: 'outline',
  c: 'cloak',
  d: 'cloak-shade',
  s: 'skin',
  r: 'scarf',
  w: 'steel',
  h: 'wood',
  b: 'boot',
  y: 'flame-hi',
  f: 'flame',
  e: 'ember',
  p: 'paper',
} as const;

export type SpriteToken = (typeof SPRITE_TOKENS)[keyof typeof SPRITE_TOKENS];

/** The traveler B1n_, seated and facing right toward the fire. */
export const TRAVELER: Sprite = [
  '..w...kkkk......',
  '..w..kccccck....',
  '..w.kcccddssk...',
  '..wkccddsksk....',
  '..hkccddsssk....',
  '..hkrrrrrrrk....',
  '...kcrrrrccck...',
  '...kcccrrcccck..',
  '...kcccdccssk...',
  '...kccccdcck....',
  '..kcccccdccck...',
  '..kccccckkkkkkk.',
  '..kcccckbbbbbbbk',
  '.kccccckbbbbbbk.',
  '.kkkkkkkkkkkkk..',
];

/** 感悟 — a lantern. */
export const LANTERN: Sprite = [
  '....k....',
  '...kkk...',
  '..kkkkk..',
  '.krrrrrk.',
  '.kryyyrk.',
  '.kryfyrk.',
  '.kryyyrk.',
  '.krrrrrk.',
  '..kkkkk..',
  '....k....',
  '....r....',
  '...r.r...',
];

/** 技术 — a smith's hammer. */
export const HAMMER: Sprite = [
  'kkkkkkkkk',
  'kwwwwwwwk',
  'kwwwwwwwk',
  'kkkkhkkkk',
  '...khk...',
  '...khk...',
  '...khk...',
  '...khk...',
  '...khk...',
  '...kkk...',
];

export const CAMPFIRE: Sprite = [
  '.....y.....',
  '....yfy....',
  '...yffy....',
  '...fyyff...',
  '..ffyyyff..',
  '..feyyyef..',
  '.hhkfffkhh.',
  'hhhkhhhkhhh',
];

export const MAGNIFIER: Sprite = [
  '..kkkk...',
  '.k....k..',
  'k......k.',
  'k......k.',
  'k......k.',
  '.k....k..',
  '..kkkkkk.',
  '......kkk',
  '.......kk',
];

export const SUN: Sprite = [
  '....k....',
  '.k.....k.',
  '...kkk...',
  '..kyyyk..',
  'k.kyyyk.k',
  '..kyyyk..',
  '...kkk...',
  '.k.....k.',
  '....k....',
];

export const MOON: Sprite = [
  '...kkk...',
  '..kpk....',
  '.kpk.....',
  '.kpk.....',
  '.kppk....',
  '.kpppk..k',
  '..kpppkk.',
  '...kkkk..',
];

export const ARROW: Sprite = ['k...', 'kk..', 'kkk.', 'kkkk', 'kkk.', 'kk..', 'k...'];

/** Builds the <rect> markup of a sprite for an inline SVG. */
export function spriteRects(sprite: Sprite): string {
  const out: string[] = [];
  sprite.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') {
        x++;
        continue;
      }
      let run = 1;
      while (row[x + run] === ch) run++;
      const token = SPRITE_TOKENS[ch as keyof typeof SPRITE_TOKENS];
      out.push(
        `<rect x="${x}" y="${y}" width="${run}" height="1" fill="var(--sp-${token})"/>`,
      );
      x += run;
    }
  });
  return out.join('');
}

export function spriteSize(sprite: Sprite) {
  return { w: Math.max(...sprite.map((r) => r.length)), h: sprite.length };
}
