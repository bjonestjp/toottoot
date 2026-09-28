/**
 * Toot - 3D Particle Ribbon Visualizer
 * Pure WebGL procedural background inspired by classic Winamp / MilkDrop / AVS.
 * Features 3D parametric ribbons and a luminous particle vortex with note reactivity.
 */

// Note to RGB color mapping
const NOTE_COLORS = {
  'c': [1.00, 0.42, 0.42],  // Coral Red
  'c#': [1.00, 0.52, 0.38],
  'd': [1.00, 0.63, 0.42],  // Warm Orange
  'd#': [1.00, 0.74, 0.38],
  'e': [1.00, 0.85, 0.24],  // Vivid Yellow
  'f': [0.42, 1.00, 0.55],  // Bright Green
  'f#': [0.10, 0.80, 0.65],  // Teal
  'g': [0.42, 0.87, 1.00],  // Cyan / Sky
  'g#': [0.55, 0.42, 0.95],
  'a': [0.42, 0.55, 1.00],  // Royal Blue
  'a#': [0.63, 0.42, 1.00],
  'b': [0.77, 0.42, 1.00],  // Purple
  'c5': [1.00, 0.42, 0.71]  // Pink / Magenta
};

const DEFAULT_COLOR_1 = [0.12, 0.55, 0.95]; // Neon cyan-blue
const DEFAULT_COLOR_2 = [0.65, 0.20, 0.95]; // Electric violet

class Visualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = null;
    this.ctx2d = null;
    this.animationFrameId = null;
    this.frameCount = 0;
    
    // Physics & State
    this.time = 0;
    this.lastFrameTime = 0;
    this.ambientEnergy = 0.30;
    this.energy = 0.30;
    this.mode = 'lobby'; // lobby | rehearsal | performance
    
    // Colors
    this.currentColor1 = [...DEFAULT_COLOR_1];
    this.currentColor2 = [...DEFAULT_COLOR_2];
    this.targetColor1 = [...DEFAULT_COLOR_1];
    this.targetColor2 = [...DEFAULT_COLOR_2];

    // WebGL Resources & Cached Locations
    this.ribbonProgram = null;
    this.particleProgram = null;
    this.ribbonBuffer = null;
    this.particleBuffer = null;
    this.rLocs = {};
    this.pLocs = {};

    // Config
    this.numRibbons = 4;
    this.ribbonSegments = 140;
    this.numParticles = 1600;
    this.particles = null;

    this.init();
  }

  init() {
    console.log('[Toot Visualizer] Initializing...');

    const glOptions = {
      alpha: false,
      antialias: true,
      depth: false,
      powerPreference: 'high-performance'
    };

    let gl = null;
    try {
      gl = this.canvas.getContext('webgl', glOptions) || 
           this.canvas.getContext('experimental-webgl', glOptions);
    } catch (e) {
      console.warn('[Toot Visualizer] WebGL context exception:', e);
    }

    if (gl) {
      this.gl = gl;
      const shadersOk = this.setupShaders();
      if (shadersOk) {
        this.setupRibbons();
        this.setupParticles();
        console.log('[Toot Visualizer] WebGL engine active and ready');
      } else {
        console.warn('[Toot Visualizer] Shader compilation failed');
        this.gl = null;
      }
    }

    // Fallback to Canvas 2D if WebGL was unavailable or shaders failed
    if (!this.gl) {
      console.warn('[Toot Visualizer] Using Canvas 2D fallback');
      try {
        this.ctx2d = this.canvas.getContext('2d');
        this.setupParticles2D();
      } catch (e) {
        console.error('[Toot Visualizer] 2D context error:', e);
      }
    }

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();

    this.render = this.render.bind(this);
    this.animationFrameId = requestAnimationFrame(this.render);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor((window.innerWidth || 1920) * dpr);
    const h = Math.floor((window.innerHeight || 1080) * dpr);
    
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    
    if (this.gl) {
      this.gl.viewport(0, 0, w, h);
    }
  }

  createShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('[Toot Visualizer] Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  createProgram(vsSource, fsSource) {
    const gl = this.gl;
    const vs = this.createShader(gl.VERTEX_SHADER, vsSource);
    const fs = this.createShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[Toot Visualizer] Program link error:', gl.getProgramInfoLog(program));
      return null;
    }
    return program;
  }

  setupShaders() {
    const gl = this.gl;

    // --- Ribbon Shaders (GLSL ES 1.0 compliant) ---
    const ribbonVS = `
      attribute vec3 aPosition;
      attribute vec2 aRibbonCoord;
      
      uniform vec2 uResolution;
      
      varying vec2 vRibbonCoord;
      varying float vDepth;

      void main() {
        vRibbonCoord = aRibbonCoord;
        
        float z = aPosition.z + 3.0;
        vDepth = clamp(z / 6.0, 0.0, 1.0);
        
        float fov = 1.8;
        vec2 projected = (aPosition.xy / z) * fov;
        
        float aspect = uResolution.x / uResolution.y;
        if (aspect > 1.0) {
          projected.x /= aspect;
        } else {
          projected.y *= aspect;
        }

        gl_Position = vec4(projected, 0.0, 1.0);
      }
    `;

    const ribbonFS = `
      precision mediump float;
      
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform float uEnergy;
      
      varying vec2 vRibbonCoord;
      varying float vDepth;

      void main() {
        float edge = clamp(abs(vRibbonCoord.y), 0.0, 1.0);
        float core = pow(1.0 - edge, 2.0);
        float glow = exp(-edge * 2.2);
        
        vec3 col = mix(uColor1, uColor2, vRibbonCoord.x);
        col += vec3(0.2, 0.2, 0.25) * uEnergy;
        
        float alpha = (core * 0.75 + glow * 0.35) * (0.9 - vDepth * 0.4);
        gl_FragColor = vec4(col, alpha);
      }
    `;

    this.ribbonProgram = this.createProgram(ribbonVS, ribbonFS);
    if (!this.ribbonProgram) return false;

    // Cache Ribbon Locations
    const rProg = this.ribbonProgram;
    this.rLocs = {
      aPos: gl.getAttribLocation(rProg, 'aPosition'),
      aCoord: gl.getAttribLocation(rProg, 'aRibbonCoord'),
      uRes: gl.getUniformLocation(rProg, 'uResolution'),
      uCol1: gl.getUniformLocation(rProg, 'uColor1'),
      uCol2: gl.getUniformLocation(rProg, 'uColor2'),
      uEnergy: gl.getUniformLocation(rProg, 'uEnergy')
    };

    // --- Particle Shaders (GLSL ES 1.0 compliant) ---
    const particleVS = `
      attribute vec3 aPosition;
      attribute float aPhase;
      attribute float aSize;

      uniform vec2 uResolution;
      uniform float uEnergy;

      varying float vAlpha;
      varying float vPhase;

      void main() {
        vPhase = aPhase;
        
        float z = aPosition.z + 2.8;
        float fov = 1.8;
        vec2 projected = (aPosition.xy / z) * fov;
        
        float aspect = uResolution.x / uResolution.y;
        if (aspect > 1.0) {
          projected.x /= aspect;
        } else {
          projected.y *= aspect;
        }

        float pSize = (aSize * (1.0 + uEnergy * 0.6)) * (450.0 / z) * (uResolution.y / 1000.0);
        gl_PointSize = clamp(pSize, 1.5, 32.0);
        gl_Position = vec4(projected, 0.0, 1.0);

        vAlpha = clamp(1.0 - (z - 1.2) / 3.6, 0.1, 0.95);
      }
    `;

    const particleFS = `
      precision mediump float;

      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform float uEnergy;

      varying float vAlpha;
      varying float vPhase;

      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5, 0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;

        float glow = exp(-dist * dist * 10.0);
        vec3 col = mix(uColor1, uColor2, sin(vPhase * 3.14159) * 0.5 + 0.5);
        col += vec3(0.25, 0.25, 0.25) * uEnergy;

        float alpha = glow * vAlpha * (0.65 + uEnergy * 0.35);
        gl_FragColor = vec4(col, alpha);
      }
    `;

    this.particleProgram = this.createProgram(particleVS, particleFS);
    if (!this.particleProgram) return false;

    // Cache Particle Locations
    const pProg = this.particleProgram;
    this.pLocs = {
      aPos: gl.getAttribLocation(pProg, 'aPosition'),
      aPhase: gl.getAttribLocation(pProg, 'aPhase'),
      aSize: gl.getAttribLocation(pProg, 'aSize'),
      uRes: gl.getUniformLocation(pProg, 'uResolution'),
      uCol1: gl.getUniformLocation(pProg, 'uColor1'),
      uCol2: gl.getUniformLocation(pProg, 'uColor2'),
      uEnergy: gl.getUniformLocation(pProg, 'uEnergy')
    };

    return true;
  }

  setupRibbons() {
    const gl = this.gl;
    const floatsPerVertex = 5;
    const totalVertices = this.numRibbons * this.ribbonSegments * 2;
    this.ribbonArray = new Float32Array(totalVertices * floatsPerVertex);
    this.ribbonBuffer = gl.createBuffer();
  }

  setupParticles() {
    const gl = this.gl;
    const num = this.numParticles;
    this.particles = new Float32Array(num * 8);

    for (let i = 0; i < num; i++) {
      const idx = i * 8;
      const theta = Math.random() * Math.PI * 2;
      const radius = 0.3 + Math.random() * 2.2;
      const z = (Math.random() - 0.5) * 2.5;

      this.particles[idx]     = Math.cos(theta) * radius; // x
      this.particles[idx + 1] = Math.sin(theta) * radius; // y
      this.particles[idx + 2] = z;                       // z
      this.particles[idx + 3] = Math.random();            // phase
      this.particles[idx + 4] = 1.2 + Math.random() * 3.2; // size
      this.particles[idx + 5] = -Math.sin(theta) * (0.15 + Math.random() * 0.25); // vx
      this.particles[idx + 6] = Math.cos(theta) * (0.15 + Math.random() * 0.25);  // vy
      this.particles[idx + 7] = (Math.random() - 0.5) * 0.2;                      // vz
    }

    this.particleBuffer = gl.createBuffer();
    this.particleRenderData = new Float32Array(num * 5);
  }

  setupParticles2D() {
    const num = 120;
    this.particles2D = [];
    for (let i = 0; i < num; i++) {
      this.particles2D.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        r: 1.5 + Math.random() * 3.5
      });
    }
  }

  updateRibbons(dt) {
    const numRibbons = this.numRibbons;
    const segments = this.ribbonSegments;
    const arr = this.ribbonArray;
    let ptr = 0;

    const t = this.time;
    const energy = this.energy;
    const ampBoost = 1.0 + energy * 0.6;
    const ribbonHalfWidth = 0.08 * (1.0 + energy * 0.4);

    for (let r = 0; r < numRibbons; r++) {
      const strandOffset = (r / numRibbons) * Math.PI * 2;
      const phaseSpeed = 0.7 + r * 0.15;

      for (let s = 0; s < segments; s++) {
        const u = s / (segments - 1);
        const param = u * 4.0 + t * phaseSpeed;

        const cx = (Math.sin(param * 1.1 + strandOffset) * 1.25 + 
                    Math.cos(param * 0.7 - t * 0.3) * 0.55) * ampBoost;
        const cy = (Math.cos(param * 0.9 + strandOffset * 0.7) * 0.85 + 
                    Math.sin(param * 1.3 + t * 0.4) * 0.4) * ampBoost;
        const cz = (Math.sin(param * 0.6 + strandOffset * 1.3) * 1.1 + 
                    Math.cos(param * 1.1) * 0.3);

        const dParam = 0.05;
        const nextParam = param + dParam;
        const nx = (Math.sin(nextParam * 1.1 + strandOffset) * 1.25 + 
                    Math.cos(nextParam * 0.7 - t * 0.3) * 0.55) * ampBoost;
        const ny = (Math.cos(nextParam * 0.9 + strandOffset * 0.7) * 0.85 + 
                    Math.sin(nextParam * 1.3 + t * 0.4) * 0.4) * ampBoost;

        const tx = nx - cx;
        const ty = ny - cy;
        const tLen = Math.sqrt(tx * tx + ty * ty) || 1.0;
        
        const px = (-ty / tLen) * ribbonHalfWidth;
        const py = (tx / tLen) * ribbonHalfWidth;

        arr[ptr++] = cx - px;
        arr[ptr++] = cy - py;
        arr[ptr++] = cz;
        arr[ptr++] = u;
        arr[ptr++] = -1.0;

        arr[ptr++] = cx + px;
        arr[ptr++] = cy + py;
        arr[ptr++] = cz;
        arr[ptr++] = u;
        arr[ptr++] = 1.0;
      }
    }
  }

  updateParticles(dt) {
    const num = this.numParticles;
    const p = this.particles;
    const out = this.particleRenderData;
    const speedMult = 1.0 + this.energy * 2.2;

    let outPtr = 0;
    for (let i = 0; i < num; i++) {
      const idx = i * 8;
      
      p[idx]     += p[idx + 5] * dt * speedMult;
      p[idx + 1] += p[idx + 6] * dt * speedMult;
      p[idx + 2] += p[idx + 7] * dt * speedMult;
      p[idx + 3] += dt * 0.2;

      const x = p[idx];
      const y = p[idx + 1];
      const z = p[idx + 2];
      const dist2D = Math.sqrt(x * x + y * y);

      if (dist2D > 3.2 || dist2D < 0.15 || z > 1.8 || z < -1.8) {
        const theta = Math.random() * Math.PI * 2;
        const rad = 0.5 + Math.random() * 2.0;
        p[idx]     = Math.cos(theta) * rad;
        p[idx + 1] = Math.sin(theta) * rad;
        p[idx + 2] = (Math.random() - 0.5) * 2.2;
        p[idx + 5] = -Math.sin(theta) * (0.15 + Math.random() * 0.25);
        p[idx + 6] = Math.cos(theta) * (0.15 + Math.random() * 0.25);
        p[idx + 7] = (Math.random() - 0.5) * 0.2;
      }

      out[outPtr++] = p[idx];
      out[outPtr++] = p[idx + 1];
      out[outPtr++] = p[idx + 2];
      out[outPtr++] = p[idx + 3];
      out[outPtr++] = p[idx + 4];
    }
  }

  triggerNotePulse(noteName) {
    if (!noteName) return;
    const cleanNote = noteName.toLowerCase().replace(/[0-9]/g, '');
    const isHighC = noteName.toUpperCase() === 'C5';
    const noteColor = isHighC ? NOTE_COLORS['c5'] : (NOTE_COLORS[cleanNote] || DEFAULT_COLOR_1);

    // Energy spike
    this.energy = Math.min(2.0, this.energy + 0.7);

    // Transition colors
    this.targetColor1 = [...noteColor];
    this.targetColor2 = [
      Math.min(1.0, noteColor[0] * 0.4 + 0.3),
      Math.min(1.0, noteColor[1] * 0.4 + 0.2),
      Math.min(1.0, noteColor[2] * 0.8 + 0.3)
    ];
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'performance' || mode === 'showtime') {
      this.ambientEnergy = 0.45;
    } else if (mode === 'rehearsal') {
      this.ambientEnergy = 0.35;
    } else {
      this.ambientEnergy = 0.28;
    }
  }

  render(timestamp) {
    // ALWAYS request next frame first to guarantee the animation loop can never freeze
    this.animationFrameId = requestAnimationFrame(this.render);

    try {
      if (!timestamp) timestamp = performance.now();
      if (!this.lastFrameTime) this.lastFrameTime = timestamp;
      
      let dt = (timestamp - this.lastFrameTime) / 1000;
      this.lastFrameTime = timestamp;
      
      // Strict sanity check on dt: prevents NaN or large jumps when tab switches
      if (isNaN(dt) || dt <= 0 || dt > 0.1) {
        dt = 1 / 60;
      }

      this.time += dt * (0.8 + this.energy * 1.5);
      this.energy += (this.ambientEnergy - this.energy) * Math.min(dt * 2.5, 1.0);

      const colorLerpSpeed = dt * 1.8;
      for (let c = 0; c < 3; c++) {
        this.targetColor1[c] += (DEFAULT_COLOR_1[c] - this.targetColor1[c]) * dt * 0.7;
        this.targetColor2[c] += (DEFAULT_COLOR_2[c] - this.targetColor2[c]) * dt * 0.7;

        this.currentColor1[c] += (this.targetColor1[c] - this.currentColor1[c]) * colorLerpSpeed;
        this.currentColor2[c] += (this.targetColor2[c] - this.currentColor2[c]) * colorLerpSpeed;
      }

      this.frameCount++;
      if (this.frameCount <= 3) {
        console.log('[Toot Visualizer] Render frame:', this.frameCount, 'time:', this.time.toFixed(2));
      }

      // --- WebGL Render Path ---
      if (this.gl && this.ribbonProgram && this.particleProgram) {
        const gl = this.gl;

        this.updateRibbons(dt);
        this.updateParticles(dt);

        gl.clearColor(0.039, 0.039, 0.102, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

        // --- Draw Ribbons ---
        gl.useProgram(this.ribbonProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.ribbonBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.ribbonArray, gl.DYNAMIC_DRAW);

        const r = this.rLocs;
        if (r.uRes) gl.uniform2f(r.uRes, this.canvas.width, this.canvas.height);
        if (r.uCol1) gl.uniform3fv(r.uCol1, this.currentColor1);
        if (r.uCol2) gl.uniform3fv(r.uCol2, this.currentColor2);
        if (r.uEnergy) gl.uniform1f(r.uEnergy, this.energy);

        if (r.aPos >= 0) {
          gl.enableVertexAttribArray(r.aPos);
          gl.vertexAttribPointer(r.aPos, 3, gl.FLOAT, false, 20, 0);
        }
        if (r.aCoord >= 0) {
          gl.enableVertexAttribArray(r.aCoord);
          gl.vertexAttribPointer(r.aCoord, 2, gl.FLOAT, false, 20, 12);
        }

        const vertsPerRibbon = this.ribbonSegments * 2;
        for (let idx = 0; idx < this.numRibbons; idx++) {
          gl.drawArrays(gl.TRIANGLE_STRIP, idx * vertsPerRibbon, vertsPerRibbon);
        }

        // Cleanly disable ribbon attributes
        if (r.aPos >= 0) gl.disableVertexAttribArray(r.aPos);
        if (r.aCoord >= 0) gl.disableVertexAttribArray(r.aCoord);

        // --- Draw Particles ---
        gl.useProgram(this.particleProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.particleRenderData, gl.DYNAMIC_DRAW);

        const p = this.pLocs;
        if (p.uRes) gl.uniform2f(p.uRes, this.canvas.width, this.canvas.height);
        if (p.uCol1) gl.uniform3fv(p.uCol1, this.currentColor1);
        if (p.uCol2) gl.uniform3fv(p.uCol2, this.currentColor2);
        if (p.uEnergy) gl.uniform1f(p.uEnergy, this.energy);

        if (p.aPos >= 0) {
          gl.enableVertexAttribArray(p.aPos);
          gl.vertexAttribPointer(p.aPos, 3, gl.FLOAT, false, 20, 0);
        }
        if (p.aPhase >= 0) {
          gl.enableVertexAttribArray(p.aPhase);
          gl.vertexAttribPointer(p.aPhase, 1, gl.FLOAT, false, 20, 12);
        }
        if (p.aSize >= 0) {
          gl.enableVertexAttribArray(p.aSize);
          gl.vertexAttribPointer(p.aSize, 1, gl.FLOAT, false, 20, 16);
        }

        gl.drawArrays(gl.POINTS, 0, this.numParticles);

        // Cleanly disable particle attributes
        if (p.aPos >= 0) gl.disableVertexAttribArray(p.aPos);
        if (p.aPhase >= 0) gl.disableVertexAttribArray(p.aPhase);
        if (p.aSize >= 0) gl.disableVertexAttribArray(p.aSize);
      } 
      // --- 2D Canvas Fallback ---
      else if (this.ctx2d) {
        const ctx = this.ctx2d;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const colStr = `rgb(${Math.floor(this.currentColor1[0]*255)}, ${Math.floor(this.currentColor1[1]*255)}, ${Math.floor(this.currentColor1[2]*255)})`;
        ctx.fillStyle = colStr;

        for (let pt of this.particles2D) {
          pt.x += pt.vx * (1.0 + this.energy * 2.0);
          pt.y += pt.vy * (1.0 + this.energy * 2.0);
          if (pt.x < 0) pt.x = w;
          if (pt.x > w) pt.x = 0;
          if (pt.y < 0) pt.y = h;
          if (pt.y > h) pt.y = 0;

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.r * (1.0 + this.energy * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    } catch (err) {
      console.error('[Toot Visualizer] Render loop error:', err);
    }
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
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
