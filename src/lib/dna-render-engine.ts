import { DNA_STYLE } from './dna-renderer';

/**
 * DNA Fingerprint Render Engine.
 *
 * Matches the playground renderer logic. Each idea's 384-dim embedding
 * drives unique visual parameters. Embeddings are auto-normalized to
 * use the full dynamic range.
 */

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}

/** Normalize embedding to [-1, 1] using actual min/max */
function normalizeEmbedding(raw: number[]): number[] {
  let min = Infinity;
  let max = -Infinity;
  for (const v of raw) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min;
  if (range < 1e-10) return raw.map(() => 0);
  return raw.map((v) => ((v - min) / range) * 2 - 1);
}

function getColor(t: number, alpha: number): string {
  const mode = DNA_STYLE.palette.mode;
  const primary = DNA_STYLE.palette.primary;
  const secondary = DNA_STYLE.palette.secondary;

  if (mode === 'mono') {
    const [r, g, b] = hexToRgb(primary);
    return `rgba(${r},${g},${b},${alpha})`;
  } else if (mode === 'gradient') {
    const col = lerpColor(secondary, primary, t);
    return col.replace('rgb', 'rgba').replace(')', `,${alpha})`);
  } else {
    // multi — hue shift
    const hueShift = t * 120;
    const h = (120 + hueShift) % 360;
    return `hsla(${h},80%,${50 + t * 20}%,${alpha})`;
  }
}

// Deterministic PRNG for consistent noise
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function renderDnaFingerprint(
  canvas: HTMLCanvasElement,
  embedding: number[],
  size: number,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx || !embedding || embedding.length < 384) return;

  canvas.width = size;
  canvas.height = size;

  const emb = normalizeEmbedding(embedding);

  const cx = size / 2;
  const cy = size / 2;
  const scaleFactor = DNA_STYLE.composition.scale;
  const radius = Math.min(cx, cy) * scaleFactor;
  const sf = size / 400;

  // Background
  ctx.fillStyle = '#0a0f0a';
  ctx.fillRect(0, 0, size, size);

  // Glow
  const glowAmount = DNA_STYLE.palette.glow;
  if (glowAmount > 0) {
    ctx.shadowColor = DNA_STYLE.palette.primary;
    ctx.shadowBlur = glowAmount * 20 * sf;
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((DNA_STYLE.composition.rotation * Math.PI) / 180);

  // Seed PRNG from first embedding value for per-idea consistency
  const seed = Math.abs(Math.round(embedding[0] * 1e8)) || 7;
  const rng = mulberry32(seed);
  const noiseAmt = DNA_STYLE.pattern.noise;
  const count = DNA_STYLE.shape.count;
  const sym = DNA_STYLE.pattern.symmetry;
  const cpx = DNA_STYLE.shape.complexity;
  const bias = DNA_STYLE.composition.centerBias;
  const lw = DNA_STYLE.pattern.lineWeight * sf;
  const opacity = DNA_STYLE.palette.opacity;

  // Crosshatch background
  const crosshatch = DNA_STYLE.details.crosshatch;
  if (crosshatch > 0) {
    const chAlpha = crosshatch * 0.15;
    const [pr, pg, pb] = hexToRgb(DNA_STYLE.palette.primary);
    ctx.strokeStyle = `rgba(${pr},${pg},${pb},${chAlpha})`;
    ctx.lineWidth = 0.5 * sf;
    const step = 8 * sf;
    for (let i = -radius; i <= radius; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, -radius);
      ctx.lineTo(i, radius);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-radius, i);
      ctx.lineTo(radius, i);
      ctx.stroke();
    }
  }

  // Draw shapes with symmetry
  for (let s = 0; s < sym; s++) {
    ctx.save();
    ctx.rotate((s / sym) * Math.PI * 2);

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const embIdx = Math.floor(t * 384) % 384;
      const embVal = (emb[embIdx] + 1) / 2; // 0..1
      const noise = (rng() - 0.5) * noiseAmt;

      let px: number, py: number;
      const layout = DNA_STYLE.composition.layout;

      if (layout === 'radial') {
        const angle = (t * Math.PI * 2) / sym;
        const dist = radius * (bias + (1 - bias) * embVal) * (0.3 + t * 0.7);
        px = Math.cos(angle) * dist + noise * radius * 0.2;
        py = Math.sin(angle) * dist + noise * radius * 0.2;
      } else if (layout === 'grid') {
        const cols = Math.ceil(Math.sqrt(count));
        const row = Math.floor(i / cols);
        const col = i % cols;
        const cellW = (radius * 2) / (cols + 1);
        px = -radius + (col + 1) * cellW + noise * cellW * 0.3;
        py = -radius + (row + 1) * cellW + noise * cellW * 0.3;
      } else {
        // spiral
        const angle = t * Math.PI * 4;
        const dist = radius * t * 0.9;
        px = Math.cos(angle) * dist + noise * radius * 0.1;
        py = Math.sin(angle) * dist + noise * radius * 0.1;
      }

      const shapeSize = (3 + embVal * cpx * 3) * sf;
      const color = getColor(t, opacity);

      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;

      const shapeType = DNA_STYLE.shape.type;

      if (shapeType === 'circles') {
        ctx.beginPath();
        ctx.arc(px, py, shapeSize, 0, Math.PI * 2);
        if (embVal > 0.5) ctx.fill();
        else ctx.stroke();
      } else if (shapeType === 'polygons') {
        const sides = 3 + Math.floor(embVal * 4);
        ctx.beginPath();
        for (let v = 0; v <= sides; v++) {
          const a = (v / sides) * Math.PI * 2 - Math.PI / 2;
          const x = px + Math.cos(a) * shapeSize;
          const y = py + Math.sin(a) * shapeSize;
          v === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        if (embVal > 0.5) ctx.fill();
        else ctx.stroke();
      } else {
        // lines
        const len = shapeSize * 2;
        const a = embVal * Math.PI;
        ctx.beginPath();
        ctx.moveTo(px - Math.cos(a) * len, py - Math.sin(a) * len);
        ctx.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Dots
  const dotCount = DNA_STYLE.details.dots;
  if (dotCount > 0) {
    const dotR = 1.5 * sf;
    const ringR = radius * 0.95;
    const [pr, pg, pb] = hexToRgb(DNA_STYLE.palette.primary);
    ctx.fillStyle = `rgba(${pr},${pg},${pb},${opacity * 0.6})`;
    for (let i = 0; i < dotCount; i++) {
      const a = (i / dotCount) * Math.PI * 2;
      const jitter = (emb[(i * 7) % 384] + 1) / 2;
      const r = ringR * (0.9 + jitter * 0.1);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r, dotR + jitter * dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Ring
  const ring = DNA_STYLE.details.ring;
  if (ring !== 'none') {
    const [pr, pg, pb] = hexToRgb(DNA_STYLE.palette.primary);
    ctx.strokeStyle = `rgba(${pr},${pg},${pb},${opacity * 0.4})`;
    ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.98, 0, Math.PI * 2);
    ctx.stroke();

    if (ring === 'double') {
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.88, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();

  // Frame
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = DNA_STYLE.palette.primary;
  ctx.lineWidth = 1 * sf;
  ctx.strokeRect(2, 2, size - 4, size - 4);
  ctx.restore();

  ctx.shadowBlur = 0;
}

/**
 * Render a colored overlay showing which parent contributed each DNA block.
 * Animates as a wave from left to right.
 */
export function renderInheritanceOverlay(
  canvas: HTMLCanvasElement,
  size: number,
  weights: number[],
  progress: number,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, size, size);

  const blocks = 6;
  const blockWidth = size / blocks;

  const colorA = { r: 255, g: 170, b: 0 };
  const colorB = { r: 0, g: 170, b: 255 };

  for (let i = 0; i < blocks; i++) {
    const blockCenter = (i + 0.5) / blocks;
    const wavePos = progress;
    const dist = Math.abs(blockCenter - wavePos);
    const intensity = Math.max(0, 1 - dist * 3);

    if (intensity <= 0) continue;

    const w = weights[i];
    let color: { r: number; g: number; b: number };
    let alpha: number;

    if (w < 0.4) {
      color = colorA;
      alpha = intensity * 0.35;
    } else if (w > 0.6) {
      color = colorB;
      alpha = intensity * 0.35;
    } else {
      const pulse = (Math.sin(progress * Math.PI * 4) + 1) / 2;
      color = {
        r: Math.round(colorA.r * (1 - pulse) + colorB.r * pulse),
        g: Math.round(colorA.g * (1 - pulse) + colorB.g * pulse),
        b: Math.round(colorA.b * (1 - pulse) + colorB.b * pulse),
      };
      alpha = intensity * 0.25;
    }

    ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${alpha})`;
    ctx.fillRect(i * blockWidth, 0, blockWidth, size);
  }
}
