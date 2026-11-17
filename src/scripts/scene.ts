/**
 * The Home scene: a dusk (light) or night (dark) mountain road outside a
 * ruined castle, with the traveler B1n_ resting by a campfire.
 * Everything is drawn procedurally at low resolution and scaled up with
 * nearest-neighbour sampling, so it stays crisp on any screen.
 */
import { TRAVELER, SPRITE_TOKENS, type Sprite } from '../lib/sprites';

type RGB = [number, number, number];
type Theme = 'light' | 'dark';

interface Palette {
  sky: string[]; // top → horizon
  celestial: string;
  celestialShade: string;
  cloud: string;
  far: string;
  farMist: string;
  mid: string;
  castle: string;
  window: string;
  ground: string;
  grass: string;
  rock: string;
  glow: string;
  motes: string[];
  stars: boolean;
  sprite: Record<string, string>;
}

const FIRE = ['#fff3b0', '#ffd25a', '#ff9a3c', '#e2532d'];

const PALETTES: Record<Theme, Palette> = {
  light: {
    sky: ['#3d3a6e', '#5e4a7e', '#8e5a86', '#c46a7c', '#e88a6c', '#f5b06c', '#f9d695'],
    celestial: '#fff2c6',
    celestialShade: '#ffd98a',
    cloud: '#f7c3a0',
    far: '#9a6a88',
    farMist: '#c48a8e',
    mid: '#6a4568',
    castle: '#3e2a4a',
    window: '#ffcf6b',
    ground: '#211a2b',
    grass: '#30263c',
    rock: '#3a2f48',
    glow: '#4a3038',
    motes: ['#ffe2b8', '#ffd0a0'],
    stars: false,
    sprite: {},
  },
  dark: {
    sky: ['#05060f', '#0a0c22', '#0f1333', '#151b45', '#1d2556', '#283066', '#353c78'],
    celestial: '#ece8cf',
    celestialShade: '#b9b49c',
    cloud: '#2a3168',
    far: '#262c5c',
    farMist: '#323a72',
    mid: '#1d2250',
    castle: '#080a1e',
    window: '#ff8a3d',
    ground: '#090a18',
    grass: '#131529',
    rock: '#181a33',
    glow: '#2a1c22',
    motes: ['#5fe0c8', '#b8ff8a'],
    stars: true,
    sprite: {},
  },
};

const SPRITE_COLORS: Record<Theme, Record<string, string>> = {
  light: {
    outline: '#140f1a', cloak: '#3b4a6b', 'cloak-shade': '#2a3450', skin: '#f0c69a',
    scarf: '#c2352a', steel: '#c9ccd6', wood: '#6b4528', boot: '#2a2030',
  },
  dark: {
    outline: '#05050c', cloak: '#2e3a5c', 'cloak-shade': '#202842', skin: '#e8b386',
    scarf: '#d4412f', steel: '#9aa3bf', wood: '#5a3a22', boot: '#1a1626',
  },
};

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const MARGIN = 20; // extra pixels drawn on each side for parallax
const FPS = 20;

function hex(c: string): RGB {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 1D value noise in [0, 1], sampled at integer x. */
function ridge(width: number, seed: number, octaves: [number, number][]) {
  const out = new Float32Array(width);
  octaves.forEach(([period, weight], o) => {
    const r = rng(seed + o * 101);
    const knots = Array.from({ length: Math.ceil(width / period) + 2 }, r);
    for (let x = 0; x < width; x++) {
      const i = Math.floor(x / period);
      const t = (x % period) / period;
      const s = t * t * (3 - 2 * t);
      out[x] += (knots[i] * (1 - s) + knots[i + 1] * s) * weight;
    }
  });
  return out;
}

class Layer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  img: ImageData;
  constructor(public w: number, public h: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d')!;
    this.img = this.ctx.createImageData(w, h);
  }
  px(x: number, y: number, c: RGB) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    const d = this.img.data;
    d[i] = c[0];
    d[i + 1] = c[1];
    d[i + 2] = c[2];
    d[i + 3] = 255;
  }
  rect(x: number, y: number, w: number, h: number, c: RGB) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }
  commit() {
    this.ctx.putImageData(this.img, 0, 0);
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  c: number;
}

interface Built {
  W: number;
  H: number;
  sky: Layer;
  far: Layer;
  mid: Layer;
  near: Layer;
  windows: { x: number; y: number; phase: number }[];
  stars: { x: number; y: number; phase: number }[];
  clouds: { x: number; y: number; len: number; speed: number }[];
  groundAt: (x: number) => number;
  fire: { x: number; y: number };
}

export function mountScene(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let theme: Theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  let scale = 3;
  let built: Built | null = null;
  let frame = 0;
  let embers: Particle[] = [];
  let motes: Particle[] = [];
  let pointer = { x: 0, y: 0 };
  let eased = { x: 0, y: 0 };
  let visible = true;
  let raf = 0;
  let last = 0;

  function build(): Built {
    const box = canvas.parentElement!.getBoundingClientRect();
    scale = Math.max(2, Math.round(Math.min(box.height / 200, box.width / 170)));
    const H = Math.ceil(box.height / scale);
    const W = Math.ceil(box.width / scale);
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = `${W * scale}px`;
    canvas.style.height = `${H * scale}px`;
    ctx.imageSmoothingEnabled = false;

    const p = PALETTES[theme];
    const LW = W + MARGIN * 2;
    const portrait = H > W;
    const S = Math.min(H, W * 0.75); // size reference for scene elements
    const r = rng(7);

    // Sky: banded gradient with ordered dithering between bands.
    const sky = new Layer(LW, H);
    const bands = p.sky.map(hex);
    const horizon = H * 0.78;
    for (let y = 0; y < H; y++) {
      const t = Math.min(1, y / horizon) * (bands.length - 1);
      const lo = Math.floor(t);
      const frac = t - lo;
      for (let x = 0; x < LW; x++) {
        const c = frac > (BAYER[y & 3][x & 3] + 0.5) / 16 ? bands[Math.min(lo + 1, bands.length - 1)] : bands[lo];
        sky.px(x, y, c);
      }
    }
    // Sun (dusk) or moon (night), low over the castle.
    const cx = Math.round(portrait ? LW * 0.72 : LW * 0.86);
    const cy = Math.round(portrait ? H * 0.16 : H * (theme === 'light' ? 0.5 : 0.24));
    const rad = theme === 'light' ? Math.max(10, Math.round(S * 0.09)) : Math.max(6, Math.round(S * 0.05));
    const cel = hex(p.celestial);
    const celShade = hex(p.celestialShade);
    for (let y = -rad; y <= rad; y++) {
      for (let x = -rad; x <= rad; x++) {
        const d = Math.sqrt(x * x + y * y);
        if (d > rad) continue;
        if (theme === 'light') {
          // retro sun: horizontal cuts in the lower half
          if (y > rad * 0.15 && (y % 4 === 0 || (y > rad * 0.6 && y % 3 === 0))) continue;
          sky.px(cx + x, cy + y, d > rad - 1.5 ? celShade : cel);
        } else {
          const crescent = Math.sqrt((x - rad * 0.55) ** 2 + (y + rad * 0.2) ** 2) < rad * 0.85;
          if (crescent) continue;
          sky.px(cx + x, cy + y, d > rad - 1.2 ? celShade : cel);
        }
      }
    }
    sky.commit();

    // Far mountains with a band of mist at their feet.
    const far = new Layer(LW, H);
    const farH = ridge(LW, 11, [[90, 1], [34, 0.45], [9, 0.12]]);
    const farC = hex(p.far);
    const mistC = hex(p.farMist);
    for (let x = 0; x < LW; x++) {
      const top = Math.round(H * 0.42 + (1 - farH[x] / 1.57) * H * 0.26);
      for (let y = top; y < H; y++) {
        const mist = y > H * 0.66 && (BAYER[y & 3][x & 3] / 16 < (y - H * 0.66) / (H * 0.12));
        far.px(x, y, mist ? mistC : farC);
      }
    }
    far.commit();

    // Mid hills and the ruined castle.
    const mid = new Layer(LW, H);
    const midH = ridge(LW, 23, [[70, 1], [22, 0.35], [6, 0.08]]);
    const midC = hex(p.mid);
    const midTop = (x: number) => Math.round(H * 0.6 + (1 - midH[Math.max(0, Math.min(LW - 1, x))] / 1.43) * H * 0.18);
    for (let x = 0; x < LW; x++) for (let y = midTop(x); y < H; y++) mid.px(x, y, midC);

    const castleC = hex(p.castle);
    const windows: Built['windows'] = [];
    const cBase = Math.round(LW * (W < 400 ? 0.5 : W > 560 ? 0.64 : 0.58));
    const unit = Math.max(2, Math.round(S / 45));
    const towers = [
      { dx: -9, w: 5, h: 13, top: 'roof' },
      { dx: -3, w: 9, h: 9, top: 'wall' },
      { dx: 6, w: 6, h: 17, top: 'crenel' },
      { dx: 12, w: 8, h: 7, top: 'broken' },
      { dx: 20, w: 4, h: 11, top: 'crenel' },
    ];
    for (const t of towers) {
      const x0 = cBase + t.dx * unit;
      const w = t.w * unit;
      const ground = Math.max(...Array.from({ length: w }, (_, i) => midTop(x0 + i)));
      const top = ground - t.h * unit;
      mid.rect(x0, top, w, ground - top + 2, castleC);
      if (t.top === 'crenel' || t.top === 'wall') {
        for (let i = 0; i < w; i += 2) mid.rect(x0 + i, top - 2, 1, 2, castleC);
      } else if (t.top === 'roof') {
        for (let i = 0; i <= w * 1.4; i++) {
          const half = Math.max(0, Math.round((w / 2 + 1) * (1 - i / (w * 1.4))));
          mid.rect(x0 + Math.round(w / 2) - half, top - i, half * 2, 1, castleC);
        }
      } else {
        for (let i = 0; i < w; i++) {
          const jag = Math.round(r() * unit * 2);
          mid.rect(x0 + i, top - jag, 1, jag, castleC);
        }
      }
      // windows
      const rows = Math.floor((t.h * unit) / (unit * 3));
      for (let j = 1; j < rows; j++) {
        for (let i = 1; i < t.w; i += 3) {
          if (r() < 0.45) continue;
          windows.push({ x: x0 + i * unit, y: top + j * unit * 3, phase: r() * 6.28 });
        }
      }
    }
    // a broken arch bridging two towers
    mid.commit();

    // Near ground, a bare tree, rocks and grass.
    const near = new Layer(LW, H);
    const nearH = ridge(LW, 41, [[60, 1], [15, 0.3], [4, 0.12]]);
    const groundC = hex(p.ground);
    const grassC = hex(p.grass);
    const rockC = hex(p.rock);
    const groundAt = (x: number) => Math.round(H * 0.8 + (nearH[Math.max(0, Math.min(LW - 1, x))] / 1.42) * H * 0.06);
    for (let x = 0; x < LW; x++) {
      const g = groundAt(x);
      for (let y = g; y < H; y++) near.px(x, y, groundC);
      if (r() < 0.35) {
        const blade = 1 + Math.floor(r() * 3);
        near.rect(x, g - blade, 1, blade, grassC);
      }
    }
    for (let i = 0; i < Math.round(LW / 40); i++) {
      const x = Math.round(r() * LW);
      const w = 3 + Math.round(r() * 4);
      const g = groundAt(x);
      for (let j = 0; j < w; j++) near.rect(x + j, g - Math.round(Math.sin((j / w) * Math.PI) * w * 0.5), 1, 3, rockC);
    }
    // bare tree near the left edge
    const branch = (x: number, y: number, ang: number, len: number, depth: number) => {
      for (let i = 0; i < len; i++) {
        const thick = Math.max(1, Math.round(depth / 2));
        near.rect(Math.round(x + Math.cos(ang) * i), Math.round(y - Math.sin(ang) * i), thick, thick, groundC);
      }
      if (depth <= 0) return;
      const ex = x + Math.cos(ang) * len;
      const ey = y - Math.sin(ang) * len;
      branch(ex, ey, ang + 0.45 + r() * 0.2, len * 0.68, depth - 1);
      branch(ex, ey, ang - 0.4 - r() * 0.2, len * 0.62, depth - 1);
    };
    const tx = MARGIN + Math.round(W * 0.06);
    branch(tx, groundAt(tx), Math.PI / 2 + 0.08, Math.round(S * 0.16), 5);
    near.commit();

    const fx = MARGIN + Math.round(W * (W < 220 ? 0.72 : 0.8));
    const stars: Built['stars'] = [];
    if (p.stars) {
      for (let i = 0; i < (LW * H) / 260; i++) stars.push({ x: Math.round(r() * LW), y: Math.round(r() * H * 0.55), phase: r() * 6.28 });
    }
    const clouds: Built['clouds'] = Array.from({ length: Math.max(3, Math.round(W / 70)) }, () => ({
      x: r() * LW,
      y: Math.round(H * (0.12 + r() * 0.3)),
      len: 12 + Math.round(r() * 30),
      speed: 0.02 + r() * 0.04,
    }));

    return { W, H, sky, far, mid, near, windows, stars, clouds, groundAt, fire: { x: fx, y: groundAt(fx) } };
  }

  function drawSprite(sprite: Sprite, x: number, y: number, bob: boolean) {
    const colors = SPRITE_COLORS[theme];
    sprite.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i] as keyof typeof SPRITE_TOKENS;
        if (ch === ('.' as never)) continue;
        const c = colors[SPRITE_TOKENS[ch]];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(x + i, y + j + (bob && j < 6 ? 1 : 0), 1, 1);
      }
    });
  }

  function render() {
    if (!built) return;
    const b = built;
    const p = PALETTES[theme];
    const t = frame;
    eased.x += (pointer.x - eased.x) * 0.08;
    eased.y += (pointer.y - eased.y) * 0.08;
    const off = (depth: number) => -MARGIN + Math.round(-eased.x * MARGIN * depth);
    const offY = (depth: number) => Math.round(-eased.y * 4 * depth);

    ctx.clearRect(0, 0, b.W, b.H);
    ctx.drawImage(b.sky.canvas, off(0.05), 0);

    // stars
    for (const s of b.stars) {
      const tw = Math.sin(t * 0.15 + s.phase);
      if (tw < -0.3) continue;
      ctx.fillStyle = tw > 0.7 ? '#ffffff' : '#9aa3d9';
      ctx.fillRect(s.x + off(0.05), s.y, 1, 1);
    }
    // clouds drift slowly
    ctx.fillStyle = p.cloud;
    for (const c of b.clouds) {
      const span = b.W + MARGIN * 2 + c.len;
      const x = Math.round(((c.x + t * c.speed) % span) - c.len) + off(0.1);
      ctx.fillRect(x, c.y, c.len, 1);
      ctx.fillRect(x + 3, c.y - 1, Math.round(c.len * 0.5), 1);
      ctx.fillRect(x + Math.round(c.len * 0.3), c.y + 1, Math.round(c.len * 0.6), 1);
    }

    ctx.drawImage(b.far.canvas, off(0.2), offY(0.2));
    ctx.drawImage(b.mid.canvas, off(0.45), offY(0.45));

    // flickering castle windows
    for (const w of b.windows) {
      const lit = Math.sin(t * 0.21 + w.phase) + Math.sin(t * 0.07 + w.phase * 2);
      if (lit < -0.6) continue;
      ctx.fillStyle = lit > 0.9 ? '#fff0b0' : p.window;
      ctx.fillRect(w.x + off(0.45), w.y + offY(0.45), 1, 2);
    }

    const nx = off(1);
    const ny = offY(1);
    ctx.drawImage(b.near.canvas, nx, ny);

    // campfire glow, dithered so it reads as pixel light
    const fx = b.fire.x + nx;
    const fy = b.fire.y + ny;
    const glowR = 11 + (t % 6 < 3 ? 1 : 0);
    ctx.fillStyle = p.glow;
    for (let y = -glowR; y <= 6; y++) {
      for (let x = -glowR; x <= glowR; x++) {
        const d = Math.sqrt(x * x + y * y * 2.2) / glowR;
        if (d > 1) continue;
        const gy = fy + y;
        if (gy < b.groundAt(b.fire.x + x) + ny) continue;
        if (d > (BAYER[gy & 3][(fx + x) & 3] + 0.5) / 16) continue;
        ctx.fillRect(fx + x, gy, 1, 1);
      }
    }

    // traveler, seated left of the fire
    const sx = fx - 20;
    const sy = b.groundAt(b.fire.x - 12) + ny - TRAVELER.length + 1;
    drawSprite(TRAVELER, sx, sy, Math.floor(t / 18) % 2 === 1);

    // logs
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(fx - 5, fy - 1, 11, 1);
    ctx.fillRect(fx - 4, fy - 2, 3, 1);
    ctx.fillRect(fx + 2, fy - 2, 3, 1);
    // flame
    for (let dx = -3; dx <= 3; dx++) {
      const h = (4 - Math.abs(dx)) * 2 + ((t * 7 + dx * 13) % 5 > 2 ? 1 : 0) + (Math.random() < 0.3 ? 1 : 0);
      for (let j = 0; j < h; j++) {
        const k = j / h;
        ctx.fillStyle = FIRE[Math.min(3, Math.floor((Math.abs(dx) / 3) * 1.5 + k * 2.5))];
        ctx.fillRect(fx + dx, fy - 2 - j, 1, 1);
      }
    }

    // embers rising from the fire
    if (!reduceMotion && Math.random() < 0.5) {
      embers.push({ x: fx + (Math.random() * 6 - 3), y: fy - 6, vx: Math.random() * 0.4 - 0.2, vy: -0.4 - Math.random() * 0.5, life: 0, max: 20 + Math.random() * 30, c: Math.floor(Math.random() * 3) });
    }
    embers = embers.filter((e) => e.life++ < e.max);
    for (const e of embers) {
      e.x += e.vx + Math.sin((e.life + e.c * 10) * 0.3) * 0.15;
      e.y += e.vy;
      ctx.fillStyle = FIRE[Math.min(3, e.c + Math.floor((e.life / e.max) * 2))];
      ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
    }

    // fireflies (night) or warm dust motes (dusk)
    for (const m of motes) {
      m.x += m.vx + Math.sin((t + m.c * 40) * 0.05) * 0.1;
      m.y += m.vy + Math.cos((t + m.c * 30) * 0.04) * 0.08;
      if (m.x < 0) m.x += b.W;
      if (m.x > b.W) m.x -= b.W;
      if (Math.sin(t * 0.12 + m.c) < -0.4) continue;
      ctx.fillStyle = p.motes[m.c % p.motes.length];
      ctx.fillRect(Math.round(m.x), Math.round(m.y), 1, 1);
    }
  }

  function seedMotes() {
    if (!built) return;
    const { W, H } = built;
    motes = Array.from({ length: Math.round(W / 18) }, (_, i) => ({
      x: Math.random() * W,
      y: H * 0.55 + Math.random() * H * 0.3,
      vx: (Math.random() - 0.5) * 0.12,
      vy: 0,
      life: 0,
      max: 0,
      c: i,
    }));
  }

  function rebuild() {
    built = build();
    seedMotes();
    render();
  }

  function loop(now: number) {
    raf = requestAnimationFrame(loop);
    if (!visible || now - last < 1000 / FPS) return;
    last = now;
    frame++;
    render();
  }

  rebuild();
  if (reduceMotion) {
    // a single still frame, re-rendered only when something changes
    for (let i = 0; i < 40; i++) {
      frame++;
      render();
    }
  } else {
    raf = requestAnimationFrame(loop);
    window.addEventListener('pointermove', (e) => {
      pointer = { x: (e.clientX / innerWidth) * 2 - 1, y: (e.clientY / innerHeight) * 2 - 1 };
    });
  }

  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(canvas);
  document.addEventListener('visibilitychange', () => (visible = !document.hidden));

  let resizeTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(rebuild, 120);
  }).observe(canvas.parentElement!);

  new MutationObserver(() => {
    const next: Theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    if (next !== theme) {
      theme = next;
      rebuild();
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  return () => cancelAnimationFrame(raf);
}
