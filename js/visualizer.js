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
    this.animationFrameId = null;
    
    // Physics & State
    this.time = 0;
    this.lastFrameTime = performance.now();
    this.ambientEnergy = 0.28;
    this.energy = 0.28;
    this.mode = 'lobby'; // lobby | rehearsal | performance
    
    // Colors
    this.currentColor1 = [...DEFAULT_COLOR_1];
    this.currentColor2 = [...DEFAULT_COLOR_2];
    this.targetColor1 = [...DEFAULT_COLOR_1];
    this.targetColor2 = [...DEFAULT_COLOR_2];

    // WebGL Resources
    this.ribbonProgram = null;
    this.particleProgram = null;
    this.ribbonBuffer = null;
    this.particleBuffer = null;

    // Config
    this.numRibbons = 4;
    this.ribbonSegments = 140;
    this.numParticles = 1800;
    this.particles = null;

    this.init();
  }

  init() {
    const gl = this.canvas.getContext('webgl', {
      alpha: false,
      antialias: true,
      depth: false,
      powerPreference: 'high-performance'
    });

    if (!gl) {
      console.warn('WebGL not supported for visualizer background');
      return;
    }
    this.gl = gl;

    this.setupShaders();
    this.setupRibbons();
    this.setupParticles();

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();

    this.render = this.render.bind(this);
    this.animationFrameId = requestAnimationFrame(this.render);
  }

  resize() {
    if (!this.gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, w, h);
  }

  createShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  createProgram(vsSource, fsSource) {
    const gl = this.gl;
    const vs = this.createShader(gl.VERTEX_SHADER, vsSource);
    const fs = this.createShader(gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return null;
    }
    return program;
  }

  setupShaders() {
    const gl = this.gl;

    // --- Ribbon Shaders ---
    const ribbonVS = `
      attribute vec3 aPosition;
      attribute vec2 aRibbonCoord; // x: progress (0..1), y: edge (-1..1)
      
      uniform vec2 uResolution;
      uniform float uTime;
      
      varying vec2 vRibbonCoord;
      varying float vDepth;

      void main() {
        vRibbonCoord = aRibbonCoord;
        
        // 3D Perspective projection
        float z = aPosition.z + 3.0; // Distance offset
        vDepth = clamp(z / 6.0, 0.0, 1.0);
        
        float fov = 1.8;
        vec2 projected = (aPosition.xy / z) * fov;
        
        // Correct aspect ratio
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
        float edge = abs(vRibbonCoord.y);
        // Soft glowing ribbon core with neon edge falloff
        float core = pow(1.0 - edge, 2.0);
        float glow = exp(-edge * 2.2);
        
        // Color gradient along ribbon length
        vec3 col = mix(uColor1, uColor2, vRibbonCoord.x);
        
        // Energy flare
        col += vec3(0.2, 0.2, 0.25) * uEnergy;
        
        float alpha = (core * 0.7 + glow * 0.3) * (0.85 - vDepth * 0.45);
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `;

    this.ribbonProgram = this.createProgram(ribbonVS, ribbonFS);

    // --- Particle Shaders ---
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

        // Depth-scaled point size
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
        // Circular soft-particle glow
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;

        float glow = exp(-dist * dist * 10.0);
        vec3 col = mix(uColor1, uColor2, sin(vPhase * 3.14159) * 0.5 + 0.5);
        col += vec3(0.25) * uEnergy;

        float alpha = glow * vAlpha * (0.6 + uEnergy * 0.4);
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `;

    this.particleProgram = this.createProgram(particleVS, particleFS);
  }

  setupRibbons() {
    const gl = this.gl;
    // Pre-allocate buffer for dynamic ribbon vertices
    const floatsPerVertex = 5;
    const totalVertices = this.numRibbons * this.ribbonSegments * 2;
    this.ribbonArray = new Float32Array(totalVertices * floatsPerVertex);
    this.ribbonBuffer = gl.createBuffer();
  }

  setupParticles() {
    const gl = this.gl;
    const num = this.numParticles;
    // Each particle: x, y, z, phase, size, vx, vy, vz
    this.particles = new Float32Array(num * 8);

    for (let i = 0; i < num; i++) {
      const idx = i * 8;
      // Cylindrical / toroidal cloud distribution
      const theta = Math.random() * Math.PI * 2;
      const radius = 0.3 + Math.random() * 2.2;
      const z = (Math.random() - 0.5) * 2.5;

      this.particles[idx]     = Math.cos(theta) * radius; // x
      this.particles[idx + 1] = Math.sin(theta) * radius; // y
      this.particles[idx + 2] = z;                       // z
      this.particles[idx + 3] = Math.random();            // phase
      this.particles[idx + 4] = 1.0 + Math.random() * 3.0; // size
      // Angular velocity + gentle z-drift
      this.particles[idx + 5] = -Math.sin(theta) * (0.15 + Math.random() * 0.25); // vx
      this.particles[idx + 6] = Math.cos(theta) * (0.15 + Math.random() * 0.25);  // vy
      this.particles[idx + 7] = (Math.random() - 0.5) * 0.2;                      // vz
    }

    this.particleBuffer = gl.createBuffer();
    this.particleRenderData = new Float32Array(num * 5); // x,y,z, phase, size
  }

  updateRibbons(dt) {
    const numRibbons = this.numRibbons;
    const segments = this.ribbonSegments;
    const arr = this.ribbonArray;
    let ptr = 0;

    const t = this.time;
    const energy = this.energy;

    // Amplitude and frequency influenced by energy
    const ampBoost = 1.0 + energy * 0.6;
    const ribbonHalfWidth = 0.075 * (1.0 + energy * 0.4);

    for (let r = 0; r < numRibbons; r++) {
      const strandOffset = (r / numRibbons) * Math.PI * 2;
      const phaseSpeed = 0.7 + r * 0.15;

      for (let s = 0; s < segments; s++) {
        const u = s / (segments - 1); // 0 to 1 along length
        const param = u * 4.0 + t * phaseSpeed;

        // 3D Lissajous / parametric spine curve
        const cx = (Math.sin(param * 1.1 + strandOffset) * 1.25 + 
                    Math.cos(param * 0.7 - t * 0.3) * 0.55) * ampBoost;
        const cy = (Math.cos(param * 0.9 + strandOffset * 0.7) * 0.85 + 
                    Math.sin(param * 1.3 + t * 0.4) * 0.4) * ampBoost;
        const cz = (Math.sin(param * 0.6 + strandOffset * 1.3) * 1.1 + 
                    Math.cos(param * 1.1) * 0.3);

        // Approximate tangent for ribbon width normal
        const dParam = 0.05;
        const nextParam = param + dParam;
        const nx = (Math.sin(nextParam * 1.1 + strandOffset) * 1.25 + 
                    Math.cos(nextParam * 0.7 - t * 0.3) * 0.55) * ampBoost;
        const ny = (Math.cos(nextParam * 0.9 + strandOffset * 0.7) * 0.85 + 
                    Math.sin(nextParam * 1.3 + t * 0.4) * 0.4) * ampBoost;

        const tx = nx - cx;
        const ty = ny - cy;
        const tLen = Math.sqrt(tx * tx + ty * ty) || 1.0;
        
        // Perpendicular vector in XY plane
        const px = (-ty / tLen) * ribbonHalfWidth;
        const py = (tx / tLen) * ribbonHalfWidth;

        // Vertex 1: left edge (v = -1)
        arr[ptr++] = cx - px;
        arr[ptr++] = cy - py;
        arr[ptr++] = cz;
        arr[ptr++] = u;
        arr[ptr++] = -1.0;

        // Vertex 2: right edge (v = 1)
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
      
      // Update position with velocity
      p[idx]     += p[idx + 5] * dt * speedMult;
      p[idx + 1] += p[idx + 6] * dt * speedMult;
      p[idx + 2] += p[idx + 7] * dt * speedMult;
      p[idx + 3] += dt * 0.2; // phase

      // Gravity/pull toward center vortex
      const x = p[idx];
      const y = p[idx + 1];
      const z = p[idx + 2];
      const dist2D = Math.sqrt(x * x + y * y);

      // Re-circulate particles if they escape boundary
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
      out[outPtr++] = p[idx + 4]; // size
    }
  }

  triggerNotePulse(noteName) {
    if (!noteName) return;
    const cleanNote = noteName.toLowerCase().replace(/[0-9]/g, '');
    const isHighC = noteName.toUpperCase() === 'C5';
    const noteColor = isHighC ? NOTE_COLORS['c5'] : (NOTE_COLORS[cleanNote] || DEFAULT_COLOR_1);

    // Energy spike
    this.energy = Math.min(2.0, this.energy + 0.65);

    // Dynamic color transition to match note
    this.targetColor1 = [...noteColor];
    // Secondary complementary harmonic tint
    this.targetColor2 = [
      Math.min(1.0, noteColor[0] * 0.4 + 0.3),
      Math.min(1.0, noteColor[1] * 0.4 + 0.2),
      Math.min(1.0, noteColor[2] * 0.8 + 0.3)
    ];
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'performance' || mode === 'showtime') {
      this.ambientEnergy = 0.42;
    } else if (mode === 'rehearsal') {
      this.ambientEnergy = 0.32;
    } else {
      this.ambientEnergy = 0.25;
    }
  }

  render(timestamp) {
    if (!this.gl) return;
    const gl = this.gl;

    const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = timestamp;

    // Advance time and decay energy
    this.time += dt * (0.8 + this.energy * 1.5);
    this.energy += (this.ambientEnergy - this.energy) * Math.min(dt * 2.5, 1.0);

    // Smooth color lerp back to default ambient palette
    const colorLerpSpeed = dt * 1.8;
    for (let c = 0; c < 3; c++) {
      // Lerp target back to default slowly
      this.targetColor1[c] += (DEFAULT_COLOR_1[c] - this.targetColor1[c]) * dt * 0.7;
      this.targetColor2[c] += (DEFAULT_COLOR_2[c] - this.targetColor2[c]) * dt * 0.7;

      // Current follows target
      this.currentColor1[c] += (this.targetColor1[c] - this.currentColor1[c]) * colorLerpSpeed;
      this.currentColor2[c] += (this.targetColor2[c] - this.currentColor2[c]) * colorLerpSpeed;
    }

    // Update geometry
    this.updateRibbons(dt);
    this.updateParticles(dt);

    // Deep space dark background clear
    gl.clearColor(0.039, 0.039, 0.102, 1.0); // #0a0a1a
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Additive blending for luminous neon trails
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    // --- Draw Ribbons ---
    gl.useProgram(this.ribbonProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ribbonBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.ribbonArray, gl.DYNAMIC_DRAW);

    const rProg = this.ribbonProgram;
    const aPos = gl.getAttribLocation(rProg, 'aPosition');
    const aCoord = gl.getAttribLocation(rProg, 'aRibbonCoord');

    const uRes = gl.getUniformLocation(rProg, 'uResolution');
    const uTime = gl.getUniformLocation(rProg, 'uTime');
    const uCol1 = gl.getUniformLocation(rProg, 'uColor1');
    const uCol2 = gl.getUniformLocation(rProg, 'uColor2');
    const uEnergy = gl.getUniformLocation(rProg, 'uEnergy');

    gl.uniform2f(uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(uTime, this.time);
    gl.uniform3fv(uCol1, this.currentColor1);
    gl.uniform3fv(uCol2, this.currentColor2);
    gl.uniform1f(uEnergy, this.energy);

    gl.enableVertexAttribArray(aPos);
    gl.enableVertexAttribArray(aCoord);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(aCoord, 2, gl.FLOAT, false, 20, 12);

    // Draw each ribbon strand as a triangle strip
    const vertsPerRibbon = this.ribbonSegments * 2;
    for (let r = 0; r < this.numRibbons; r++) {
      gl.drawArrays(gl.TRIANGLE_STRIP, r * vertsPerRibbon, vertsPerRibbon);
    }

    // --- Draw Particles ---
    gl.useProgram(this.particleProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.particleRenderData, gl.DYNAMIC_DRAW);

    const pProg = this.particleProgram;
    const apPos = gl.getAttribLocation(pProg, 'aPosition');
    const apPhase = gl.getAttribLocation(pProg, 'aPhase');
    const apSize = gl.getAttribLocation(pProg, 'aSize');

    const upRes = gl.getUniformLocation(pProg, 'uResolution');
    const upCol1 = gl.getUniformLocation(pProg, 'uColor1');
    const upCol2 = gl.getUniformLocation(pProg, 'uColor2');
    const upEnergy = gl.getUniformLocation(pProg, 'uEnergy');

    gl.uniform2f(upRes, this.canvas.width, this.canvas.height);
    gl.uniform3fv(upCol1, this.currentColor1);
    gl.uniform3fv(upCol2, this.currentColor2);
    gl.uniform1f(upEnergy, this.energy);

    gl.enableVertexAttribArray(apPos);
    gl.enableVertexAttribArray(apPhase);
    gl.enableVertexAttribArray(apSize);
    gl.vertexAttribPointer(apPos, 3, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(apPhase, 1, gl.FLOAT, false, 20, 12);
    gl.vertexAttribPointer(apSize, 1, gl.FLOAT, false, 20, 16);

    gl.drawArrays(gl.POINTS, 0, this.numParticles);

    // Loop
    this.animationFrameId = requestAnimationFrame(this.render);
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
