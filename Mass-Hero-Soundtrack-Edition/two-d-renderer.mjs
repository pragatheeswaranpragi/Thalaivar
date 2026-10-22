import * as THREE from './vendor/three/build/three.module.js';

// Preserve the hand-painted 2D art, with an orthographic Three.js compositor.
export class TwoDRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    this.layers = new Map();
    this.zoom = 1;
    this.centerX = this.width / 2;
    this.shakeX = this.shakeY = 0;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#080b17');
    this.camera = new THREE.OrthographicCamera(
      -this.width / 2, this.width / 2, this.height / 2, -this.height / 2, .1, 10,
    );
    this.camera.position.z = 5;
    this.arena = new THREE.Group();
    this.scene.add(this.arena);
    this.geometry = new THREE.PlaneGeometry(this.width, this.height);
    for (const [index, name] of ['background', 'world', 'overlay'].entries()) {
      const surface = document.createElement('canvas');
      surface.width = this.width;
      surface.height = this.height;
      const ctx = surface.getContext('2d');
      const texture = new THREE.CanvasTexture(surface);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = false;
      texture.minFilter = texture.magFilter = THREE.LinearFilter;
      const material = new THREE.MeshBasicMaterial({
        map: texture, transparent: true, depthTest: false, depthWrite: false,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(this.geometry, material);
      mesh.renderOrder = index;
      (name === 'overlay' ? this.scene : this.arena).add(mesh);
      this.layers.set(name, { surface, ctx, texture, material });
    }
    // Probe on a separate canvas: a failed WebGL context must not prevent the
    // visible canvas from acquiring its 2D fallback context.
    const probe = document.createElement('canvas');
    let gl;
    try { gl = probe.getContext('webgl2'); } catch {}
    if (gl) {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      try {
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
        this.renderer.setPixelRatio(1);
        this.renderer.setSize(this.width, this.height, false);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.NoToneMapping;
      } catch { this.enableFallback(); }
    } else this.enableFallback();
    this.canvas.dataset.renderer = this.renderer ? 'three-webgl' : 'canvas-fallback';
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      this.enableFallback();
    });
    window.addEventListener('pagehide', event => {
      if (!event.persisted) this.dispose();
    });
  }

  enableFallback() {
    // A canvas that already owns WebGL cannot acquire a 2D context. Keep it as
    // the stable pointer/target surface and place an output canvas above it.
    if (this.fallback) return;
    this.fallback = this.canvas.getContext('2d');
    if (!this.fallback) {
      const output = document.createElement('canvas');
      output.width = this.width;
      output.height = this.height;
      Object.assign(output.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%',
        pointerEvents: 'none',
      });
      this.canvas.after(output);
      this.fallback = output.getContext('2d');
    }
    this.renderer?.dispose();
    this.renderer = null;
    this.canvas.dataset.renderer = 'canvas-fallback';
  }

  context(name) { return this.layers.get(name).ctx; }

  beginFrame() {
    for (const { ctx } of this.layers.values()) {
      ctx.clearRect(0, 0, this.width, this.height);
    }
    this.setCamera(1, this.width / 2, 0, 0);
  }

  setCamera(zoom, centerX, shakeX = 0, shakeY = 0) {
    this.zoom = zoom;
    this.centerX = centerX;
    this.shakeX = shakeX;
    this.shakeY = shakeY;
    this.arena.scale.set(zoom, zoom, 1);
    this.arena.position.set(
      (this.width / 2 - centerX + shakeX) * zoom, -shakeY * zoom, 0,
    );
  }

  render() {
    if (this.renderer) {
      for (const { texture } of this.layers.values()) texture.needsUpdate = true;
      this.renderer.render(this.scene, this.camera);
      return;
    }
    const ctx = this.fallback;
    ctx.fillStyle = '#080b17';
    ctx.fillRect(0, 0, this.width, this.height);
    for (const [name, { surface }] of this.layers) {
      ctx.save();
      if (name !== 'overlay') {
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.centerX + this.shakeX, -this.height / 2 + this.shakeY);
      }
      ctx.drawImage(surface, 0, 0);
      ctx.restore();
    }
  }

  dispose() {
    this.renderer?.dispose();
    this.geometry.dispose();
    for (const { texture, material } of this.layers.values()) {
      texture.dispose();
      material.dispose();
    }
  }
}
