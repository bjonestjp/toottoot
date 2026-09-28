/**
 * Toot - 3D Particle Ribbon Visualizer
 * Procedural background inspired by classic Winamp / MilkDrop / AVS.
 * Features 3D parametric ribbons, a swirling luminous particle vortex,
 * phosphor motion trails, and dynamic note reactivity.
 */

// Note to RGB color mapping matching the Toot palette
const NOTE_COLORS = {
  'c':  [255, 107, 107], // Coral Red
  'c#': [255, 133, 107], // Coral Orange
  'd':  [255, 160, 107], // Warm Orange
  'd#': [255, 188, 107], // Amber
  'e':  [255, 217, 61],  // Vivid Yellow
  'f':  [107, 255, 141], // Bright Green
  'f#': [26, 188, 156],  // Teal
  'g':  [107, 221, 255], // Cyan
  'g#': [155, 89, 182],  // Purple
  'a':  [107, 141, 255], // Royal Blue
  'a#': [160, 107, 255], // Violet
  'b':  [196, 107, 255], // Magenta
  'c5': [255, 107, 181]  // Pink / Magenta (High Octave)
};

const DEFAULT_COLOR_1 = [30, 144, 255];  // Electric Cyan-Blue
const DEFAULT_COLOR_2 = [170, 50, 250];  // Vivid Neon Violet

class Visualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.animationFrameId = null;
    this.frameCount = 0;

    // Simulation Clock & Energy
    this.time = 0;
    this.lastFrameTime = 0;
    this.ambientEnergy = 0.32;
    this.energy = 0.32;
    this.mode = 'lobby'; // lobby | rehearsal | performance

    // Color Transitions
    this.currentColor1 = [...DEFAULT_COLOR_1];
    this.currentColor2 = [...DEFAULT_COLOR_2];
    this.targetColor1 = [...DEFAULT_COLOR_1];
    this.targetColor2 = [...DEFAULT_COLOR_2];

    // 3D Ribbons Config
    this.numRibbons = 4;
    this.ribbonSegments = 90;

    // 3D Particles Config
    this.numParticles = 260;
    this.particles = [];
    this.initParticles();

    // Shockwave Rings on Note Hits
    this.shockwaves = [];

    // Viewport Size
    this.width = window.innerWidth || 1920;
    this.height = window.innerHeight || 1080;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.init();
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.numParticles; i++) {
      const theta = Math.random() * Math.PI * 2;
      const radius = 0.4 + Math.random() * 2.2;
      this.particles.push({
        theta,
        radius,
        z: Math.random() * 5.0 + 1.2,
        speed: (0.3 + Math.random() * 0.7) * (Math.random() > 0.5 ? 1 : -1),
        zSpeed: 0.8 + Math.random() * 1.4,
        size: 1.2 + Math.random() * 2.6,
        colorMix: Math.random(),
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
  }

  init() {
    console.log('[Toot Visualizer] Initializing 3D Particle Ribbon Engine...');

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();

    // Fill initial canvas background so there is never a blank flash
    if (this.ctx) {
      this.ctx.fillStyle = '#0a0a1a';
      this.ctx.fillRect(0, 0, this.width, this.height);
    }

    this.render = this.render.bind(this);
    this.animationFrameId = requestAnimationFrame(this.render);
    console.log('[Toot Visualizer] Render loop active');
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displayWidth = window.innerWidth || 1920;
    const displayHeight = window.innerHeight || 1080;

    this.width = displayWidth;
    this.height = displayHeight;

    const targetW = Math.floor(displayWidth * this.dpr);
    const targetH = Math.floor(displayHeight * this.dpr);

    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }
  }

  triggerNotePulse(noteName) {
    if (!noteName) return;
    const cleanNote = noteName.toLowerCase().replace(/[0-9]/g, '');
    const isHighC = noteName.toUpperCase() === 'C5';
    const noteRgb = isHighC ? NOTE_COLORS['c5'] : (NOTE_COLORS[cleanNote] || DEFAULT_COLOR_1);

    // Energy spike
    this.energy = Math.min(2.2, this.energy + 0.85);

    // Dynamic color burst
    this.targetColor1 = [...noteRgb];
    this.targetColor2 = [
      Math.min(255, Math.floor(noteRgb[0] * 0.4 + 140)),
      Math.min(255, Math.floor(noteRgb[1] * 0.4 + 60)),
      Math.min(255, Math.floor(noteRgb[2] * 0.9 + 70))
    ];

    // Spawn 3D Shockwave Ring
    this.shockwaves.push({
      radius: 0.1,
      maxRadius: 3.5,
      speed: 3.2 + this.energy * 1.5,
      z: 2.5 + Math.random() * 1.5,
      tilt: (Math.random() - 0.5) * 0.8,
      color: [...noteRgb],
      alpha: 0.95
    });

    if (this.shockwaves.length > 6) {
      this.shockwaves.shift();
    }
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'performance' || mode === 'showtime') {
      this.ambientEnergy = 0.50;
    } else if (mode === 'rehearsal') {
      this.ambientEnergy = 0.38;
    } else {
      this.ambientEnergy = 0.28;
    }
  }

  render(timestamp) {
    // Schedule next frame immediately so animation loop never freezes
    this.animationFrameId = requestAnimationFrame(this.render);

    if (!this.ctx) return;
    const ctx = this.ctx;

    // Delta time calculation with strict clamping
    if (!timestamp) timestamp = performance.now();
    if (!this.lastFrameTime) this.lastFrameTime = timestamp;
    let dt = (timestamp - this.lastFrameTime) / 1000;
    this.lastFrameTime = timestamp;
    if (isNaN(dt) || dt <= 0 || dt > 0.1) dt = 1 / 60;

    // Simulation time advance
    this.time += dt * (0.75 + this.energy * 1.4);
    this.energy += (this.ambientEnergy - this.energy) * Math.min(dt * 2.2, 1.0);

    // Smooth color return toward ambient palette
    const colorSpeed = dt * 1.6;
    for (let i = 0; i < 3; i++) {
      this.targetColor1[i] += (DEFAULT_COLOR_1[i] - this.targetColor1[i]) * dt * 0.6;
      this.targetColor2[i] += (DEFAULT_COLOR_2[i] - this.targetColor2[i]) * dt * 0.6;

      this.currentColor1[i] += (this.targetColor1[i] - this.currentColor1[i]) * colorSpeed;
      this.currentColor2[i] += (this.targetColor2[i] - this.currentColor2[i]) * colorSpeed;
    }

    const c1 = this.currentColor1.map(v => Math.round(v));
    const c2 = this.currentColor2.map(v => Math.round(v));
    const c1Str = `rgb(${c1[0]}, ${c1[1]}, ${c1[2]})`;
    const c2Str = `rgb(${c2[0]}, ${c2[1]}, ${c2[2]})`;

    // Canvas & Viewport Setup
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    const w = this.width;
    const h = this.height;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const fov = Math.min(w, h) * 0.95;

    // --- 1. Phosphor Decay / Motion Trail Background ---
    // Drawing a semi-transparent dark navy fill gives authentic Winamp phosphorescent ghost trails
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(10, 10, 26, 0.22)';
    ctx.fillRect(0, 0, w, h);

    // Switch to Additive Blending for radiant neon laser glow
    ctx.globalCompositeOperation = 'lighter';

    // --- 2. Render 3D Shockwave Rings ---
    for (let swIdx = this.shockwaves.length - 1; swIdx >= 0; swIdx--) {
      const sw = this.shockwaves[swIdx];
      sw.radius += sw.speed * dt;
      sw.alpha -= dt * 0.65;

      if (sw.alpha <= 0.01 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(swIdx, 1);
        continue;
      }

      const swScale = fov / (sw.z + 2.5);
      const swRadiusX = sw.radius * swScale;
      const swRadiusY = swRadiusX * 0.52;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sw.tilt);
      ctx.beginPath();
      ctx.ellipse(0, 0, swRadiusX, swRadiusY, 0, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(2, (8 + this.energy * 6) * sw.alpha);
      ctx.strokeStyle = `rgba(${sw.color[0]}, ${sw.color[1]}, ${sw.color[2]}, ${(sw.alpha * 0.8).toFixed(2)})`;
      ctx.shadowBlur = 20;
      ctx.shadowColor = `rgb(${sw.color[0]}, ${sw.color[1]}, ${sw.color[2]})`;
      ctx.stroke();
      ctx.restore();
    }

    // --- 3. Render 3D Swirling Particle Vortex ---
    const pSpeedMult = 1.0 + this.energy * 2.2;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.theta += p.speed * dt * pSpeedMult * 0.8;
      p.z -= p.zSpeed * dt * pSpeedMult;
      p.twinklePhase += dt * 3.0;

      // Wrap particle back into distance when it passes the camera
      if (p.z < 0.6) {
        p.z = 6.0;
        p.radius = 0.4 + Math.random() * 2.2;
        p.theta = Math.random() * Math.PI * 2;
      }

      // 3D Coordinates
      const px = Math.cos(p.theta) * p.radius;
      const py = Math.sin(p.theta) * (p.radius * 0.65) + Math.sin(this.time * 0.8 + i) * 0.15;
      const pz = p.z;

      // Perspective Projection
      const pScale = fov / (pz + 2.2);
      const sx = cx + px * pScale;
      const sy = cy + py * pScale;

      // Depth-based fade and sizing
      const depthAlpha = Math.min(1.0, Math.max(0.1, 1.0 - (pz - 1.0) / 4.8));
      const twinkle = 0.75 + Math.sin(p.twinklePhase) * 0.25;
      const pAlpha = depthAlpha * twinkle * (0.6 + this.energy * 0.4);
      const rad = Math.max(1.0, p.size * (pScale / (fov / 5.0)) * (1.0 + this.energy * 0.4));

      // Particle Color
      const pr = Math.round(c1[0] * (1 - p.colorMix) + c2[0] * p.colorMix);
      const pg = Math.round(c1[1] * (1 - p.colorMix) + c2[1] * p.colorMix);
      const pb = Math.round(c1[2] * (1 - p.colorMix) + c2[2] * p.colorMix);

      ctx.beginPath();
      ctx.arc(sx, sy, rad, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${pAlpha.toFixed(2)})`;
      ctx.fill();

      // White-hot core for large close particles
      if (rad > 2.5) {
        ctx.beginPath();
        ctx.arc(sx, sy, rad * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${(pAlpha * 0.9).toFixed(2)})`;
        ctx.fill();
      }
    }

    // --- 4. Render 3D Parametric Ribbons ---
    const numRibbons = this.numRibbons;
    const segments = this.ribbonSegments;
    const ampBoost = 1.0 + this.energy * 0.75;
    const t = this.time;

    for (let r = 0; r < numRibbons; r++) {
      const strandOffset = (r / numRibbons) * Math.PI * 2;
      const phaseSpeed = 0.65 + r * 0.12;

      // Build projected nodes for this ribbon strand
      const nodes = [];
      for (let s = 0; s < segments; s++) {
        const u = s / (segments - 1);
        const param = u * 4.2 + t * phaseSpeed;

        const x = (Math.sin(param * 1.1 + strandOffset) * 1.35 +
                   Math.cos(param * 0.75 - t * 0.35) * 0.55) * ampBoost;
        const y = (Math.cos(param * 0.9 + strandOffset * 0.8) * 0.85 +
                   Math.sin(param * 1.35 + t * 0.45) * 0.45) * ampBoost;
        const z = Math.sin(param * 0.65 + strandOffset * 1.3) * 1.15 +
                  Math.cos(param * 1.05) * 0.35 + 3.4;

        const scale = fov / (z + 2.2);
        const sx = cx + x * scale;
        const sy = cy + y * scale;
        const depth = Math.max(0.1, Math.min(1.0, 1.0 - (z - 2.0) / 3.0));

        nodes.push({ x: sx, y: sy, z, scale, depth, u });
      }

      if (nodes.length < 2) continue;

      // Create flowing linear gradient along ribbon length
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const grad = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
      const ribbonAlpha = 0.65 + this.energy * 0.35;
      grad.addColorStop(0.0, `rgba(${c1[0]}, ${c1[1]}, ${c1[2]}, ${(0.7 * ribbonAlpha).toFixed(2)})`);
      grad.addColorStop(0.5, `rgba(${c2[0]}, ${c2[1]}, ${c2[2]}, ${(0.9 * ribbonAlpha).toFixed(2)})`);
      grad.addColorStop(1.0, `rgba(${c1[0]}, ${c1[1]}, ${c1[2]}, ${(0.7 * ribbonAlpha).toFixed(2)})`);

      // Pass A: Outer Neon Glow Halo
      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y);
      for (let s = 1; s < nodes.length; s++) {
        const xc = (nodes[s - 1].x + nodes[s].x) * 0.5;
        const yc = (nodes[s - 1].y + nodes[s].y) * 0.5;
        ctx.quadraticCurveTo(nodes[s - 1].x, nodes[s - 1].y, xc, yc);
      }
      ctx.lineTo(nodes[nodes.length - 1].x, nodes[nodes.length - 1].y);
      ctx.lineWidth = 14 + this.energy * 10;
      ctx.strokeStyle = `rgba(${c2[0]}, ${c2[1]}, ${c2[2]}, ${(0.22 * ribbonAlpha).toFixed(2)})`;
      ctx.stroke();

      // Pass B: Main Radiant Ribbon Body
      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y);
      for (let s = 1; s < nodes.length; s++) {
        const xc = (nodes[s - 1].x + nodes[s].x) * 0.5;
        const yc = (nodes[s - 1].y + nodes[s].y) * 0.5;
        ctx.quadraticCurveTo(nodes[s - 1].x, nodes[s - 1].y, xc, yc);
      }
      ctx.lineTo(nodes[nodes.length - 1].x, nodes[nodes.length - 1].y);
      ctx.lineWidth = 5 + this.energy * 4;
      ctx.strokeStyle = grad;
      ctx.stroke();

      // Pass C: White-Hot Laser Spine
      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y);
      for (let s = 1; s < nodes.length; s++) {
        const xc = (nodes[s - 1].x + nodes[s].x) * 0.5;
        const yc = (nodes[s - 1].y + nodes[s].y) * 0.5;
        ctx.quadraticCurveTo(nodes[s - 1].x, nodes[s - 1].y, xc, yc);
      }
      ctx.lineTo(nodes[nodes.length - 1].x, nodes[nodes.length - 1].y);
      ctx.lineWidth = 1.8 + this.energy * 1.2;
      ctx.strokeStyle = `rgba(255, 255, 255, ${(0.85 * ribbonAlpha).toFixed(2)})`;
      ctx.stroke();
    }

    ctx.restore();

    this.frameCount++;
    if (this.frameCount === 1 || this.frameCount === 60) {
      console.log(`[Toot Visualizer] Active & rendering (frame ${this.frameCount}, energy: ${this.energy.toFixed(2)})`);
    }
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    window.removeEventListener('resize', this.resize);
  }
}

let activeVisualizer = null;

export function initVisualizer(canvasElement) {
  if (activeVisualizer) {
    activeVisualizer.destroy();
  }
  if (!canvasElement) return null;
  activeVisualizer = new Visualizer(canvasElement);
  return activeVisualizer;
}

export function triggerNotePulse(noteName) {
  if (activeVisualizer) {
    activeVisualizer.triggerNotePulse(noteName);
  }
}

export function setVisualizerMode(mode) {
  if (activeVisualizer) {
    activeVisualizer.setMode(mode);
  }
}
