/**
 * Toot – 90s Demoscene Visualizer
 * Lo-fi wireframe 3D torus, chrome vector balls, moiré interference,
 * phosphor motion trails, CRT scanlines & vignette.
 *
 * Renders at 1/3 resolution and upscales with nearest-neighbor for
 * authentic chunky pixel aesthetic.
 */

// Note → RGB colour mapping (matches Toot palette)
const NOTE_COLORS = {
  'c':  [255, 107, 107],
  'c#': [255, 133, 107],
  'd':  [255, 160, 107],
  'd#': [255, 188, 107],
  'e':  [255, 217,  61],
  'f':  [107, 255, 141],
  'f#': [ 26, 188, 156],
  'g':  [107, 221, 255],
  'g#': [155,  89, 182],
  'a':  [107, 141, 255],
  'a#': [160, 107, 255],
  'b':  [196, 107, 255],
  'c5': [255, 107, 181]
};

const DEFAULT_COLOR_1 = [0, 180, 210];    // Demoscene Cyan
const DEFAULT_COLOR_2 = [150, 50, 230];   // Demoscene Purple

/* ================================================================
   Visualizer
   ================================================================ */

class Visualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.animationFrameId = null;
    this.frameCount = 0;

    // Timing & energy
    this.time           = 0;
    this.lastFrameTime  = 0;
    this.ambientEnergy  = 0.22;
    this.energy         = 0.22;
    this.mode           = 'lobby';

    // Colour state
    this.currentColor1 = [...DEFAULT_COLOR_1];
    this.currentColor2 = [...DEFAULT_COLOR_2];
    this.targetColor1  = [...DEFAULT_COLOR_1];
    this.targetColor2  = [...DEFAULT_COLOR_2];

    // Lo-fi: render at 1/pixelScale resolution
    this.pixelScale = 3;
    this.offscreen  = document.createElement('canvas');
    this.offCtx     = this.offscreen.getContext('2d');

    // Geometry
    this.torusVerts = [];
    this.torusEdges = [];
    this.generateTorus(1.1, 0.4, 22, 12);
    this.ballVerts  = this.generateIcosahedron(0.85);
    this.ballSprite = this.createBallSprite(16);

    // Rotation state (torus and balls rotate independently)
    this.torusRX = 0;  this.torusRY = 0;  this.torusRZ = 0;
    this.ballRX  = 0;  this.ballRY  = 0;  this.ballRZ  = 0;

    // Shockwave rings on note hits
    this.shockwaves = [];

    // Cached CRT patterns / gradients (created on resize)
    this.scanlinePattern = null;
    this.vignetteGrad    = null;

    // Viewport
    this.width  = window.innerWidth  || 1920;
    this.height = window.innerHeight || 1080;
    this.dpr    = Math.min(window.devicePixelRatio || 1, 2);

    this.init();
  }

  /* ────────── Geometry Generators ────────── */

  generateTorus(R, r, uSegs, vSegs) {
    this.torusVerts = [];
    this.torusEdges = [];

    for (let i = 0; i < uSegs; i++) {
      for (let j = 0; j < vSegs; j++) {
        const u = (i / uSegs) * Math.PI * 2;
        const v = (j / vSegs) * Math.PI * 2;
        this.torusVerts.push([
          (R + r * Math.cos(v)) * Math.cos(u),
          (R + r * Math.cos(v)) * Math.sin(u),
          r * Math.sin(v)
        ]);
      }
    }

    for (let i = 0; i < uSegs; i++) {
      for (let j = 0; j < vSegs; j++) {
        const cur   = i * vSegs + j;
        const nextV = i * vSegs + ((j + 1) % vSegs);
        const nextU = ((i + 1) % uSegs) * vSegs + j;
        this.torusEdges.push([cur, nextV]);
        this.torusEdges.push([cur, nextU]);
      }
    }
  }

  generateIcosahedron(radius) {
    const phi = (1 + Math.sqrt(5)) / 2;
    const s   = radius / Math.sqrt(1 + phi * phi);
    const l   = s * phi;
    return [
      [0,  s,  l], [0,  s, -l], [0, -s,  l], [0, -s, -l],
      [ s,  l, 0], [ s, -l, 0], [-s,  l, 0], [-s, -l, 0],
      [ l, 0,  s], [ l, 0, -s], [-l, 0,  s], [-l, 0, -s]
    ];
  }

  /** Pre-render a small chrome-metallic ball sprite. */
  createBallSprite(size) {
    const c   = document.createElement('canvas');
    c.width   = size;
    c.height  = size;
    const ctx = c.getContext('2d');
    const r   = size / 2;

    // Radial gradient: light from upper-left
    const g = ctx.createRadialGradient(r * 0.6, r * 0.6, r * 0.05, r, r, r);
    g.addColorStop(0,    '#ffffff');
    g.addColorStop(0.25, '#c0d4ee');
    g.addColorStop(0.55, '#405878');
    g.addColorStop(0.85, '#15203a');
    g.addColorStop(1,    '#060810');

    ctx.beginPath();
    ctx.arc(r, r, r - 0.5, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    return c;
  }

  /* ────────── 3-D Helpers ────────── */

  /**
   * Rotate (x,y,z) using pre-computed cos/sin values for each axis.
   * Order: X → Y → Z
   */
  static rotate(x, y, z, cx, sx, cy, sy, cz, sz) {
    // X
    const y1 = y * cx - z * sx;
    const z1 = y * sx + z * cx;
    // Y
    const x2 =  x * cy + z1 * sy;
    const z2 = -x * sy + z1 * cy;
    // Z
    const x3 = x2 * cz - y1 * sz;
    const y3 = x2 * sz + y1 * cz;
    return [x3, y3, z2];
  }

  /** Perspective projection.  Camera sits at z = -3.5. */
  static project(x, y, z, cx, cy, fov) {
    const d = z + 3.5;
    if (d < 0.05) return null;
    const s = fov / d;
    return { sx: cx + x * s, sy: cy + y * s, s, z: d };
  }

  /* ────────── Lifecycle ────────── */

  init() {
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();

    // Black-fill first frame so there's never a flash
    if (this.ctx) {
      this.ctx.fillStyle = '#050510';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.render = this.render.bind(this);
    this.animationFrameId = requestAnimationFrame(this.render);
    console.log('[Demoscene Visualizer] Render loop active');
  }

  resize() {
    this.dpr    = Math.min(window.devicePixelRatio || 1, 2);
    this.width  = window.innerWidth  || 1920;
    this.height = window.innerHeight || 1080;

    // Main (hi-res) canvas
    const mw = Math.floor(this.width  * this.dpr);
    const mh = Math.floor(this.height * this.dpr);
    if (this.canvas.width !== mw || this.canvas.height !== mh) {
      this.canvas.width  = mw;
      this.canvas.height = mh;
    }

    // Off-screen (lo-fi) canvas
    const ow = Math.floor(this.width  / this.pixelScale);
    const oh = Math.floor(this.height / this.pixelScale);
    if (this.offscreen.width !== ow || this.offscreen.height !== oh) {
      this.offscreen.width  = ow;
      this.offscreen.height = oh;
      this.offCtx.imageSmoothingEnabled = false;
      this.offCtx.fillStyle = '#050510';
      this.offCtx.fillRect(0, 0, ow, oh);
    }

    // CRT scanline pattern
    this._createScanlinePattern();

    // Vignette gradient (cached)
    this.vignetteGrad = this.ctx.createRadialGradient(
      mw * 0.5, mh * 0.5, mh * 0.28,
      mw * 0.5, mh * 0.5, mh * 0.82
    );
    this.vignetteGrad.addColorStop(0, 'transparent');
    this.vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
  }

  _createScanlinePattern() {
    const ps = Math.max(2, Math.round(this.pixelScale * this.dpr));
    const p  = document.createElement('canvas');
    p.width  = 1;
    p.height = ps;
    const c  = p.getContext('2d');
    c.clearRect(0, 0, 1, ps);
    const lh = Math.max(1, Math.round(ps * 0.3));
    c.fillStyle = 'rgba(0, 0, 0, 0.15)';
    c.fillRect(0, ps - lh, 1, lh);
    this.scanlinePattern = this.ctx.createPattern(p, 'repeat');
  }

  /* ────────── Reactivity API ────────── */

  triggerNotePulse(noteName) {
    if (!noteName) return;
    const clean = noteName.toLowerCase().replace(/[0-9]/g, '');
    const isHC  = noteName.toUpperCase() === 'C5';
    const rgb   = isHC ? NOTE_COLORS['c5'] : (NOTE_COLORS[clean] || DEFAULT_COLOR_1);

    this.energy = Math.min(1.8, this.energy + 0.55);

    this.targetColor1 = [...rgb];
    this.targetColor2 = [
      Math.min(255, (rgb[0] * 0.4 + 110) | 0),
      Math.min(255, (rgb[1] * 0.4 +  45) | 0),
      Math.min(255, (rgb[2] * 0.9 +  55) | 0)
    ];

    // Expanding shockwave ring
    this.shockwaves.push({
      cx: 0.5 + (Math.random() - 0.5) * 0.3,
      cy: 0.5 + (Math.random() - 0.5) * 0.3,
      r: 0, maxR: 0.55,
      speed: 0.7 + this.energy * 0.4,
      color: [...rgb],
      alpha: 0.65
    });
    if (this.shockwaves.length > 5) this.shockwaves.shift();
  }

  triggerBeatTick(isDownbeat = false) {
    this.energy = Math.min(1.5, this.energy + (isDownbeat ? 0.10 : 0.03));
  }

  setMode(mode) {
    this.mode = mode;
    this.ambientEnergy =
      (mode === 'performance' || mode === 'showtime') ? 0.42 :
      mode === 'rehearsal' ? 0.32 : 0.22;
  }

  /* ────────── Render Layers ────────── */

  /** Moiré: two slowly orbiting sets of concentric circles.
   *  At lo-fi resolution, aliasing creates classic interference. */
  _renderMoire(ctx, w, h, c1, c2) {
    const t       = this.time;
    const maxR    = Math.sqrt(w * w + h * h);
    const spacing = 8;
    const n       = Math.ceil(maxR / spacing);
    const a       = (0.028 + this.energy * 0.022).toFixed(3);

    // Centre 1
    const cx1 = w * 0.5 + Math.sin(t * 0.17) * w * 0.28;
    const cy1 = h * 0.5 + Math.cos(t * 0.13) * h * 0.22;
    ctx.strokeStyle = `rgba(${c1[0]},${c1[1]},${c1[2]},${a})`;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    for (let i = 1; i <= n; i++) {
      const r = i * spacing;
      ctx.moveTo(cx1 + r, cy1);
      ctx.arc(cx1, cy1, r, 0, Math.PI * 2);
    }
    ctx.stroke();

    // Centre 2
    const cx2 = w * 0.5 + Math.sin(t * 0.23 + 2.1) * w * 0.32;
    const cy2 = h * 0.5 + Math.cos(t * 0.19 + 1.4) * h * 0.26;
    ctx.strokeStyle = `rgba(${c2[0]},${c2[1]},${c2[2]},${a})`;
    ctx.beginPath();
    for (let i = 1; i <= n; i++) {
      const r = i * spacing;
      ctx.moveTo(cx2 + r, cy2);
      ctx.arc(cx2, cy2, r, 0, Math.PI * 2);
    }
    ctx.stroke();
  }

  /** Expanding shockwave rings on note hits. */
  _renderShockwaves(ctx, w, h, dt) {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.r     += s.speed * dt;
      s.alpha -= dt * 0.9;
      if (s.alpha <= 0.01 || s.r > s.maxR) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      const px = s.cx * w;
      const py = s.cy * h;
      const pr = s.r * Math.min(w, h);
      ctx.strokeStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${s.alpha.toFixed(2)})`;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /** Wireframe torus — depth-bucketed for efficient batch rendering. */
  _renderWireframe(ctx, w, h, cx, cy, fov, color) {
    // Pre-compute trig for current torus orientation
    const cxR = Math.cos(this.torusRX), sxR = Math.sin(this.torusRX);
    const cyR = Math.cos(this.torusRY), syR = Math.sin(this.torusRY);
    const czR = Math.cos(this.torusRZ), szR = Math.sin(this.torusRZ);

    // Project every vertex
    const proj = new Array(this.torusVerts.length);
    for (let i = 0; i < this.torusVerts.length; i++) {
      const [vx, vy, vz] = this.torusVerts[i];
      const [rx, ry, rz] = Visualizer.rotate(vx, vy, vz, cxR, sxR, cyR, syR, czR, szR);
      proj[i] = Visualizer.project(rx, ry, rz, cx, cy, fov);
    }

    // Alpha-bucket edges (8 levels) so we can batch stroke() calls
    const NB = 8;
    const buckets = [];
    for (let b = 0; b < NB; b++) buckets.push([]);

    const eMul = 0.45 + this.energy * 0.55;
    for (let i = 0; i < this.torusEdges.length; i++) {
      const [a, b] = this.torusEdges[i];
      const pa = proj[a];
      const pb = proj[b];
      if (!pa || !pb) continue;
      const avgZ   = (pa.z + pb.z) * 0.5;
      const depthA = Math.max(0.06, Math.min(0.8, 1.0 - (avgZ - 2.5) / 3.5));
      const alpha  = depthA * eMul;
      const bucket = Math.min(NB - 1, Math.max(0, (alpha * NB) | 0));
      buckets[bucket].push(pa.sx, pa.sy, pb.sx, pb.sy);
    }

    ctx.lineWidth = 1;
    for (let b = 0; b < NB; b++) {
      const edges = buckets[b];
      if (edges.length === 0) continue;
      const a = ((b + 0.5) / NB).toFixed(2);
      ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${a})`;
      ctx.beginPath();
      for (let i = 0; i < edges.length; i += 4) {
        ctx.moveTo(edges[i], edges[i + 1]);
        ctx.lineTo(edges[i + 2], edges[i + 3]);
      }
      ctx.stroke();
    }
  }

  /** Chrome vector balls — z-sorted icosahedron vertices. */
  _renderVectorBalls(ctx, w, h, cx, cy, fov) {
    const cxR = Math.cos(this.ballRX), sxR = Math.sin(this.ballRX);
    const cyR = Math.cos(this.ballRY), syR = Math.sin(this.ballRY);
    const czR = Math.cos(this.ballRZ), szR = Math.sin(this.ballRZ);

    const balls = [];
    for (let i = 0; i < this.ballVerts.length; i++) {
      const [vx, vy, vz] = this.ballVerts[i];
      const [rx, ry, rz] = Visualizer.rotate(vx, vy, vz, cxR, sxR, cyR, syR, czR, szR);
      const p = Visualizer.project(rx, ry, rz, cx, cy, fov);
      if (p) balls.push(p);
    }

    // Draw far → near
    balls.sort((a, b) => b.z - a.z);

    const baseR = fov * 0.03;
    for (const ball of balls) {
      const r     = Math.max(2, baseR / ball.z);
      const alpha = Math.max(0.25, Math.min(1.0, 1.0 - (ball.z - 2.5) / 3.5));
      ctx.globalAlpha = alpha;
      ctx.drawImage(this.ballSprite, ball.sx - r, ball.sy - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }

  /* ────────── Main Render Loop ────────── */

  render(timestamp) {
    this.animationFrameId = requestAnimationFrame(this.render);
    if (!this.ctx || !this.offCtx) return;

    // Delta time
    if (!timestamp) timestamp = performance.now();
    if (!this.lastFrameTime) this.lastFrameTime = timestamp;
    let dt = (timestamp - this.lastFrameTime) / 1000;
    this.lastFrameTime = timestamp;
    if (isNaN(dt) || dt <= 0 || dt > 0.1) dt = 1 / 60;

    // Advance simulation clock & decay energy toward ambient
    this.time   += dt * (0.5 + this.energy * 0.7);
    this.energy += (this.ambientEnergy - this.energy) * Math.min(dt * 1.8, 1.0);

    // Smooth colour interpolation back toward defaults
    for (let i = 0; i < 3; i++) {
      this.targetColor1[i]  += (DEFAULT_COLOR_1[i] - this.targetColor1[i]) * dt * 0.45;
      this.targetColor2[i]  += (DEFAULT_COLOR_2[i] - this.targetColor2[i]) * dt * 0.45;
      this.currentColor1[i] += (this.targetColor1[i] - this.currentColor1[i]) * dt * 1.4;
      this.currentColor2[i] += (this.targetColor2[i] - this.currentColor2[i]) * dt * 1.4;
    }
    const c1 = this.currentColor1.map(v => Math.round(v));
    const c2 = this.currentColor2.map(v => Math.round(v));

    // Rotation (energy increases speed)
    const eSpd = 1.0 + this.energy * 1.5;
    this.torusRX += 0.11 * eSpd * dt;
    this.torusRY += 0.17 * eSpd * dt;
    this.torusRZ += 0.06 * eSpd * dt;
    this.ballRX  += 0.08 * eSpd * dt;
    this.ballRY  -= 0.13 * eSpd * dt;
    this.ballRZ  += 0.11 * eSpd * dt;

    /* ---------- Off-screen (lo-fi) ---------- */

    const oCtx = this.offCtx;
    const ow   = this.offscreen.width;
    const oh   = this.offscreen.height;
    const ocx  = ow * 0.5;
    const ocy  = oh * 0.5;
    const fov  = Math.min(ow, oh) * 0.85;

    // 1. Phosphor decay (darker = longer trails)
    const trailDecay = 0.14 + this.energy * 0.12;
    oCtx.globalCompositeOperation = 'source-over';
    oCtx.fillStyle = `rgba(5, 5, 16, ${trailDecay.toFixed(2)})`;
    oCtx.fillRect(0, 0, ow, oh);

    // 2. Additive layers: moiré, shockwaves, wireframe
    oCtx.globalCompositeOperation = 'lighter';
    this._renderMoire(oCtx, ow, oh, c1, c2);
    this._renderShockwaves(oCtx, ow, oh, dt);
    this._renderWireframe(oCtx, ow, oh, ocx, ocy, fov, c1);

    // 3. Vector balls (normal blend so chrome shadow is visible)
    oCtx.globalCompositeOperation = 'source-over';
    this._renderVectorBalls(oCtx, ow, oh, ocx, ocy, fov);

    /* ---------- Main canvas ---------- */

    const mCtx = this.ctx;
    const mw   = this.canvas.width;
    const mh   = this.canvas.height;

    // Nearest-neighbour upscale → chunky pixels
    mCtx.imageSmoothingEnabled = false;
    mCtx.drawImage(this.offscreen, 0, 0, mw, mh);

    // CRT scanlines
    if (this.scanlinePattern) {
      mCtx.fillStyle = this.scanlinePattern;
      mCtx.fillRect(0, 0, mw, mh);
    }

    // Vignette
    if (this.vignetteGrad) {
      mCtx.fillStyle = this.vignetteGrad;
      mCtx.fillRect(0, 0, mw, mh);
    }

    this.frameCount++;
    if (this.frameCount === 1 || this.frameCount === 60) {
      console.log(`[Demoscene Visualizer] Frame ${this.frameCount}, energy: ${this.energy.toFixed(2)}`);
    }
  }

  /* ────────── Cleanup ────────── */

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    window.removeEventListener('resize', this.resize);
  }
}

/* ================================================================
   Module Exports (same API as before)
   ================================================================ */

let activeVisualizer = null;

export function initVisualizer(canvasElement) {
  if (activeVisualizer) activeVisualizer.destroy();
  if (!canvasElement) return null;
  activeVisualizer = new Visualizer(canvasElement);
  return activeVisualizer;
}

export function triggerNotePulse(noteName) {
  if (activeVisualizer) activeVisualizer.triggerNotePulse(noteName);
}

export function triggerBeatTick(isDownbeat = false) {
  if (activeVisualizer) activeVisualizer.triggerBeatTick(isDownbeat);
}

export function setVisualizerMode(mode) {
  if (activeVisualizer) activeVisualizer.setMode(mode);
}
