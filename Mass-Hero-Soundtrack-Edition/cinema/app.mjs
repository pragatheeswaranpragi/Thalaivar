import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CinemaGame, LEVELS, ALLIES, clamp } from "./game-core.mjs";
import { makeAvatar, animateAvatar, makeCar } from "./actors.mjs";
const $ = (id) => document.getElementById(id),
  root = $("experience"),
  keys = new Set(),
  queued = new Set(),
  touches = new Map();
const coarse = matchMedia("(pointer:coarse)").matches;
let reduced = matchMedia("(prefers-reduced-motion:reduce)").matches,
  high = !coarse,
  musicWanted = true,
  last = performance.now(),
  ready = false;
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 1.6 : 1.15));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
$("world").append(renderer.domElement);
renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute(
  "aria-label",
  "3D arena: WASD to move, J punch, K dash, I guard, L rocket, C cameo",
);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101923);
scene.fog = new THREE.FogExp2(0x14202b, 0.027);
const camera = new THREE.PerspectiveCamera(
  48,
  innerWidth / innerHeight,
  0.1,
  120,
);
camera.position.set(3.5, 2.1, 6);
const look = new THREE.Vector3(-3, 1.2, 1),
  desired = new THREE.Vector3(),
  focus = new THREE.Vector3(),
  vec = new THREE.Vector3();
const pmrem = new THREE.PMREMGenerator(renderer),
  room = new RoomEnvironment(),
  environment = pmrem.fromScene(room, 0.04);
scene.environment = environment.texture;
scene.environmentIntensity = 0.4;
room.dispose();
pmrem.dispose();
scene.add(new THREE.HemisphereLight(0x96b9da, 0x251b13, 1.05));
const sun = new THREE.DirectionalLight(0xffe0b2, 3.5);
sun.position.set(-4, 11, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(high ? 2048 : 1024, high ? 2048 : 1024);
Object.assign(sun.shadow.camera, {
  left: -19,
  right: 19,
  top: 15,
  bottom: -15,
  near: 0.5,
  far: 45,
});
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x87bbef, 1.5);
rim.position.set(5, 6, -7);
scene.add(rim);
const fireLight = new THREE.PointLight(0xff7730, 180, 27, 2);
fireLight.position.set(5, 2, -8);
scene.add(fireLight);
const blastLight = new THREE.PointLight(0xffb356, 0, 14, 2);
scene.add(blastLight);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight),
  0.32,
  0.55,
  1.05,
);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const standard = (c, r = 0.65, m = 0.15) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
function box(x, y, z, w, h, d, material, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}
function asphalt() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const p = c.getContext("2d");
  p.fillStyle = "#494e53";
  p.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6500; i++) {
    const g = 35 + ((i * 71) % 65);
    p.fillStyle = `rgb(${g},${g},${g})`;
    p.fillRect((i * 53) % 256, (i * 97 + Math.floor(i / 256) * 7) % 256, 1, 1);
  }
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 12);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(70, 46),
  new THREE.MeshStandardMaterial({
    color: 0x606871,
    map: asphalt(),
    roughness: 0.47,
    metalness: 0.28,
  }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const curb = standard(0x41484b),
  steel = standard(0x303b41, 0.4, 0.7),
  stripe = standard(0xc3a86a, 0.7),
  dark = standard(0x1d2931);
box(0, 0.12, -7.1, 29, 0.24, 0.35, curb);
box(0, 0.12, 7.1, 29, 0.24, 0.35, curb);
for (let x = -12; x <= 12; x += 4)
  box(x, 0.006, 0, 1.7, 0.012, 0.035, stripe, false);
const crateColors = [0x3d4f4e, 0x63382e, 0x39414d, 0x645b3e];
for (let i = 0; i < 10; i++) {
  const x = -18 + (i % 6) * 7,
    z = i < 6 ? -11.5 : 11.5,
    y = i >= 6 ? 1.6 : i % 3 === 0 ? 4.8 : 1.6,
    mat = standard(crateColors[i % 4], 0.66, 0.35);
  box(x, y, z, 6.2, 3.2, 2.7, mat);
  for (let rib = 0; rib < 13; rib++)
    box(
      x - 2.9 + rib * 0.48,
      y,
      z + (i < 6 ? 1.38 : -1.38),
      0.055,
      3.1,
      0.06,
      mat,
      false,
    );
  if (y > 2) box(x, 1.6, z, 6.2, 3.2, 2.7, standard(crateColors[(i + 1) % 4]));
}
for (const x of [-15, 15]) {
  box(x, 4.7, -8, 0.35, 9.4, 0.35, steel);
  box(x, 9.3, -6.8, 0.3, 0.3, 5, steel);
  const arm = box(x, 8.1, -6.6, 0.16, 3.1, 0.16, steel);
  arm.rotation.x = 0.5;
  const lamp = new THREE.SpotLight(0xffcf8b, 220, 28, Math.PI / 4, 0.7, 1.6);
  lamp.position.set(x, 9, -5);
  lamp.target.position.set(x * 0.4, 0, 0);
  scene.add(lamp, lamp.target);
  box(
    x,
    9.1,
    -4.5,
    0.8,
    0.15,
    0.5,
    new THREE.MeshBasicMaterial({ color: 0xffdc9b }),
  );
}
// Distant skyline and cranes remain outside the combat floor.
for (let i = 0; i < 18; i++) {
  const height = 5 + ((i * 7) % 12),
    x = -40 + i * 4.7;
  box(x, height / 2, -24, 3.5, height, 4, dark, false);
  for (let k = 0; k < 4; k++)
    box(
      x - 1 + k * 0.65,
      height * 0.7,
      -21.98,
      0.16,
      0.42,
      0.02,
      new THREE.MeshBasicMaterial({ color: k % 3 ? 0xa8824d : 0x7fabc3 }),
      false,
    );
}
for (const x of [-20, 18]) {
  box(x, 10, -17, 0.6, 20, 0.6, steel, false);
  box(x + 5, 19, -17, 13, 0.4, 0.4, steel, false);
  const diagonal = box(x + 2.4, 17, -17, 0.25, 6, 0.25, steel, false);
  diagonal.rotation.z = -0.9;
  box(x + 9, 13, -17, 0.04, 11, 0.04, steel, false);
}
const signCanvas = document.createElement("canvas");
signCanvas.width = 1024;
signCanvas.height = 256;
const signTexture = new THREE.CanvasTexture(signCanvas);
signTexture.colorSpace = THREE.SRGBColorSpace;
const sign = new THREE.Mesh(
  new THREE.PlaneGeometry(7, 1.75),
  new THREE.MeshStandardMaterial({
    map: signTexture,
    emissive: 0xd9a456,
    emissiveMap: signTexture,
    emissiveIntensity: 0.5,
    roughness: 0.65,
  }),
);
sign.position.set(0, 5.8, -10.05);
scene.add(sign);
function updateSign(level) {
  const c = signCanvas.getContext("2d");
  c.fillStyle = "#111b20";
  c.fillRect(0, 0, 1024, 256);
  c.strokeStyle = "#a1844e";
  c.lineWidth = 6;
  c.strokeRect(12, 12, 1000, 232);
  c.textAlign = "center";
  c.fillStyle = "#e7c48b";
  c.font = "bold 77px Georgia";
  c.fillText("JAILER", 512, 115);
  c.font = "22px sans-serif";
  c.fillStyle = "#aa9d87";
  c.fillText(LEVELS[level].location + " / SECTOR 0" + (level + 1), 512, 178);
  signTexture.needsUpdate = true;
}
updateSign(0);
const debris = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.1, 0.04, 0.07),
    standard(0x5a5550),
    80,
  ),
  matrix = new THREE.Matrix4();
for (let i = 0; i < 80; i++) {
  matrix.makeTranslation(
    -13 + ((i * 1.713) % 26),
    0.025,
    -6.5 + ((i * 3.787) % 13),
  );
  debris.setMatrixAt(i, matrix);
}
scene.add(debris);
const rainCount = 260,
  rainPositions = new Float32Array(rainCount * 6),
  rainGeo = new THREE.BufferGeometry();
for (let i = 0; i < rainCount; i++) {
  const x = -22 + ((i * 1.73) % 44),
    y = (i * 0.531) % 17,
    z = -15 + ((i * 3.31) % 30);
  rainPositions.set([x, y, z, x - 0.04, y - 0.4, z], i * 6);
}
rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
const rain = new THREE.LineSegments(
  rainGeo,
  new THREE.LineBasicMaterial({
    color: 0x799eb6,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  }),
);
scene.add(rain);
const sparkCount = 300,
  sparkPositions = new Float32Array(sparkCount * 3),
  sparkColors = new Float32Array(sparkCount * 3),
  sparkGeo = new THREE.BufferGeometry();
sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPositions, 3));
sparkGeo.setAttribute("color", new THREE.BufferAttribute(sparkColors, 3));
const sparks = new THREE.Points(
  sparkGeo,
  new THREE.PointsMaterial({
    size: 0.085,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }),
);
scene.add(sparks);
const particles = [];
function burst(x, y, z, count = 14, color = 0xffca7b, power = 1) {
  const c = new THREE.Color(color);
  for (let i = 0; i < count; i++) {
    if (particles.length >= sparkCount) particles.shift();
    particles.push({
      x,
      y,
      z,
      vx: (Math.random() - 0.5) * 5 * power,
      vy: Math.random() * 4 * power,
      vz: (Math.random() - 0.5) * 5 * power,
      life: 0.3 + Math.random() * 0.6,
      max: 1,
      c,
    });
  }
}
const traces = [];
function tracer(from, to) {
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(from.x, from.y || 1.35, from.z),
      new THREE.Vector3(to.x, 1.2, to.z),
    ]),
    new THREE.LineBasicMaterial({
      color: 0xffe4a5,
      transparent: true,
      opacity: 0.9,
    }),
  );
  scene.add(line);
  traces.push({ line, life: 0.13 });
}
const circle = new THREE.Group(),
  ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd17c,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
for (const [inner, outer] of [
  [3.26, 3.3],
  [3.07, 3.09],
]) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(inner, outer, 96),
    ringMaterial,
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.025;
  circle.add(ring);
}
const dome = new THREE.Mesh(
  new THREE.SphereGeometry(3.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  new THREE.MeshBasicMaterial({
    color: 0xffd189,
    transparent: true,
    opacity: 0.035,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
);
dome.scale.y = 0.6;
circle.add(dome);
circle.visible = false;
scene.add(circle);
const missile = new THREE.Group(),
  missileMaterial = standard(0x455c42, 0.4, 0.6),
  cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, 0.8, 12),
    missileMaterial,
  );
cylinder.rotation.x = Math.PI / 2;
missile.add(cylinder);
const cone = new THREE.Mesh(
  new THREE.ConeGeometry(0.075, 0.25, 12),
  standard(0x313737),
);
cone.rotation.x = Math.PI / 2;
cone.position.z = 0.52;
missile.add(cone);
for (const side of [-1, 1]) {
  const fin = new THREE.Mesh(
    new THREE.BoxGeometry(0.23, 0.02, 0.2),
    missileMaterial,
  );
  fin.position.set(side * 0.07, 0, -0.25);
  missile.add(fin);
}
missile.visible = false;
scene.add(missile);
const hero = makeAvatar("hero");
scene.add(hero);
const actors = new Map(),
  warnings = new Map(),
  car = makeCar();
car.visible = false;
scene.add(car);
let messageTime = 0,
  shake = 0,
  blastTime = 0,
  audioContext;
const numbers = [];
function sound(frequency = 140, duration = 0.08) {
  if (!musicWanted) return;
  try {
    audioContext ??= new AudioContext();
    audioContext.resume();
    const oscillator = audioContext.createOscillator(),
      gain = audioContext.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      55,
      audioContext.currentTime + duration,
    );
    gain.gain.setValueAtTime(0.025, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audioContext.currentTime + duration,
    );
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {}
}
function announce(text, seconds = 1.8) {
  $("announcement").textContent = text;
  messageTime = seconds;
}
function damageNumber(actor, text, color = "#f9dca0") {
  if (numbers.length > 16) {
    numbers.shift().element.remove();
  }
  const element = document.createElement("span");
  element.textContent = text;
  element.style.color = color;
  $("numbers").append(element);
  numbers.push({ element, x: actor.x, y: 1.9, z: actor.z, life: 0.8 });
}
const game = new CinemaGame({
  emit: (event) => {
    if (event.type === "start") {
      keys.clear();
      queued.clear();
      if (musicWanted)
        $("soundtrack")
          .play()
          .catch(() => announce("Music is paused. Use Settings to enable it."));
    }
    if (event.type === "wave") {
      updateSign(event.level);
      announce(
        "WAVE " + (event.level + 1) + " · " + LEVELS[event.level].location,
        2.4,
      );
    }
    if (event.type === "hit") {
      burst(
        event.actor.x,
        1.15,
        event.actor.z,
        event.passive ? 4 : 16,
        event.passive ? 0xf0c378 : 0xffce8d,
      );
      damageNumber(event.actor, "−" + event.amount);
      if (!event.passive) {
        shake = 0.12;
        sound(140);
      }
    }
    if (event.type === "hurt") {
      shake = 0.22;
      burst(event.actor.x, 1.1, event.actor.z, 17, 0xf36c61);
      damageNumber(event.actor, "−" + event.amount, "#ff9588");
      sound(90, 0.14);
    }
    if (event.type === "block") {
      burst(event.actor.x, 1.2, event.actor.z, 12, 0x9fe0f5);
      announce("GUARD · ENERGY GAINED", 0.7);
      sound(400);
    }
    if (event.type === "ko") {
      burst(
        event.actor.x,
        0.7,
        event.actor.z,
        event.actor.boss ? 45 : 15,
        0xffb86f,
        event.actor.boss ? 1.7 : 1,
      );
      if (event.actor.boss) {
        shake = 0.4;
        sound(75, 0.35);
      }
    }
    if (event.type === "swing") sound(240, 0.045);
    if (event.type === "dash")
      burst(event.actor.x, 0.15, event.actor.z, 14, 0xafd3d7, 0.5);
    if (event.type === "support")
      announce(event.name.toUpperCase() + " · ON YOUR SIDE", 1.5);
    if (event.type === "shot") {
      tracer(event.from, event.actor);
      burst(event.actor.x, 1.25, event.actor.z, 7, 0xffe3a0);
      sound(190, 0.045);
    }
    if (event.type === "impact") {
      burst(event.actor.x, 0.6, event.actor.z, 23, 0xffc485, 1.5);
      shake = 0.2;
    }
    if (event.type === "heal") {
      damageNumber(event.actor, "+6 HP", "#d5efac");
      burst(event.actor.x, 1, event.actor.z, 5, 0xf7dba2, 0.4);
    }
    if (event.type === "extracted") announce("SUPPORT EXTRACTED", 1);
    if (event.type === "rocket") sound(70, 0.4);
    if (event.type === "explosion") {
      burst(event.actor.x, 1, event.actor.z, 130, 0xffaf54, 3);
      blastLight.position.set(event.actor.x, 2, event.actor.z);
      blastTime = 0.6;
      shake = 0.6;
      sound(60, 0.5);
    }
    if (event.type === "lost") {
      $("soundtrack").pause();
      keys.clear();
    }
    if (event.type === "victory") {
      announce("THE CITY REMEMBERS.", 2.2);
    }
  },
});
function getActor(actor) {
  let model = actors.get(actor.id);
  if (!model) {
    model = makeAvatar(actor.kind);
    scene.add(model);
    actors.set(actor.id, model);
  }
  return model;
}
function syncActors(dt) {
  animateAvatar(hero, game.hero, game.time, {
    finisher: !!game.cinematic,
    celebrate: ["victory", "interlude", "won"].includes(game.mode),
    reducedMotion: reduced,
    delta: dt,
  });
  const visible = new Set();
  for (const e of [...game.enemies, ...(game.support?.actors || [])]) {
    visible.add(e.id);
    animateAvatar(getActor(e), e, game.time, {
      reducedMotion: reduced,
      delta: dt,
    });
  }
  for (const [id, actor] of actors)
    if (!visible.has(id)) {
      scene.remove(actor);
      const materials = new Set();
      actor.traverse((o) => {
        if (o.isMesh) materials.add(o.material);
      });
      materials.forEach((m) => m.dispose());
      actors.delete(id);
    }
  for (const e of game.enemies) {
    let warning = warnings.get(e.id);
    if (!warning) {
      warning = new THREE.Mesh(
        new THREE.RingGeometry(0.85, 0.9, 32),
        new THREE.MeshBasicMaterial({
          color: 0xff6655,
          transparent: true,
          opacity: 0.75,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      warning.rotation.x = -Math.PI / 2;
      warning.position.y = 0.03;
      scene.add(warning);
      warnings.set(e.id, warning);
    }
    warning.position.x = e.x;
    warning.position.z = e.z;
    warning.visible = !e.dead && e.windup > 0;
    warning.material.opacity = reduced
      ? 0.6
      : 0.35 + Math.sin(game.time * 15) * 0.25;
  }
  for (const [id, w] of warnings)
    if (!visible.has(id)) {
      scene.remove(w);
      w.geometry.dispose();
      w.material.dispose();
      warnings.delete(id);
    }
  circle.visible = game.hasCircle();
  circle.position.set(game.hero.x, 0.015, game.hero.z);
  ringMaterial.opacity = reduced ? 0.65 : 0.55 + Math.sin(game.time * 3) * 0.12;
  car.visible = game.support?.id === "mathew";
  if (car.visible) {
    const state = game.support.car;
    car.position.set(state.x, 0, state.z);
    car.rotation.y = state.dir > 0 ? 0 : Math.PI;
  }
  const f = game.cinematic;
  missile.visible = !!f && f.time >= 1.1 && f.time < 2.1;
  if (missile.visible) {
    const t = clamp(f.time - 1.1, 0, 1);
    missile.position.set(
      THREE.MathUtils.lerp(game.hero.x, f.target.x, t),
      1.5 + Math.sin(t * Math.PI) * 0.3,
      THREE.MathUtils.lerp(game.hero.z, f.target.z, t),
    );
    missile.lookAt(f.target.x, 1.2, f.target.z);
    if (!game.paused)
      burst(
        missile.position.x,
        missile.position.y,
        missile.position.z,
        2,
        0xffb557,
        0.3,
      );
  }
}
function cameraFrame(dt) {
  const p = game.hero,
    aspect = innerWidth / innerHeight,
    wide = aspect < 1 ? 1.4 : 1,
    f = game.cinematic;
  let cinema =
    ["intro", "bossIntro", "interlude", "victory", "won"].includes(game.mode) ||
    !!f;
  const close =
    !reduced &&
    game.enemies.some((e) => !e.dead && Math.hypot(e.x - p.x, e.z - p.z) < 3);
  desired.set(
    p.x + (close ? 4.2 : 5.2) * wide,
    (close ? 3.5 : 4.9) * wide,
    p.z + (close ? 7.2 : 9.5) * wide,
  );
  focus.set(p.x, 0.9, p.z);
  if (game.mode === "menu") {
    const t = reduced ? 0 : game.time * 0.07;
    desired.set(p.x + 2.7 + Math.sin(t) * 0.25, 1.95, p.z + 3.8);
    focus.set(p.x - 1.5, 1.2, p.z);
  } else if (!reduced && game.mode === "intro") {
    const t = clamp(game.modeTime / 4, 0, 1),
      distance = 2.7 + t * 3.5;
    desired.set(
      p.x + Math.sin(p.yaw + 0.18) * distance,
      1.9 + t * 1.9,
      p.z + Math.cos(p.yaw + 0.18) * distance,
    );
    focus.set(p.x, 1.4 - t * 0.3, p.z);
  } else if (!reduced && game.mode === "bossIntro") {
    const e = game.enemies.find((e) => e.boss);
    if (e) {
      desired.set(e.x - 3.1, 2.0, e.z + 2.5);
      focus.set(e.x, 1.18, e.z);
    }
  } else if (!reduced && f) {
    if (f.time < 1.1) {
      desired.set(
        p.x + Math.sin(p.yaw + 0.38) * 2.4,
        1.95,
        p.z + Math.cos(p.yaw + 0.38) * 2.4,
      );
      focus.set(p.x, 1.6, p.z);
    } else if (f.time < 2.1) {
      const t = f.time - 1.1,
        x = THREE.MathUtils.lerp(p.x, f.target.x, t),
        z = THREE.MathUtils.lerp(p.z, f.target.z, t);
      desired.set(x + 3, 3.8, z + 3);
      focus.set(f.target.x, 1, f.target.z);
    } else {
      desired.set(f.target.x + 6, 5, f.target.z + 7);
      focus.set(f.target.x, 0.9, f.target.z);
    }
  } else if (!reduced && ["victory", "won", "interlude"].includes(game.mode)) {
    const angle = p.yaw + game.modeTime * 0.18;
    desired.set(p.x + Math.sin(angle) * 3.6, 2.0, p.z + Math.cos(angle) * 3.6);
    focus.set(p.x, 1.35, p.z);
  }
  const blend = 1 - Math.exp(-dt * (game.mode === "menu" ? 2 : 4));
  camera.position.lerp(desired, blend);
  look.lerp(focus, blend);
  if (!reduced && shake > 0) {
    camera.position.x += Math.sin(game.time * 97) * shake * 0.25;
    camera.position.y += Math.sin(game.time * 83) * shake * 0.14;
  }
  camera.lookAt(look);
  root.classList.toggle("cinematic", cinema && !reduced);
}
function effects(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.vy -= 7 * dt;
  }
  for (let i = 0; i < sparkCount; i++) {
    const p = particles[i];
    sparkPositions.set(p ? [p.x, p.y, p.z] : [0, -100, 0], i * 3);
    sparkColors.set(
      p ? [p.c.r * p.life, p.c.g * p.life, p.c.b * p.life] : [0, 0, 0],
      i * 3,
    );
  }
  sparkGeo.attributes.position.needsUpdate = true;
  sparkGeo.attributes.color.needsUpdate = true;
  for (let i = 0; i < rainCount; i++) {
    const k = i * 6;
    if (!reduced) {
      rainPositions[k] -= dt * 0.5;
      rainPositions[k + 1] -= dt * 12;
      rainPositions[k + 3] -= dt * 0.5;
      rainPositions[k + 4] -= dt * 12;
    }
    if (rainPositions[k + 1] < 0) {
      rainPositions[k + 1] = 16;
      rainPositions[k + 4] = 15.6;
    }
  }
  rainGeo.attributes.position.needsUpdate = true;
  rain.visible = !reduced;
  for (let i = traces.length - 1; i >= 0; i--) {
    const t = traces[i];
    t.life -= dt;
    t.line.material.opacity = Math.max(0, t.life / 0.13);
    if (t.life <= 0) {
      scene.remove(t.line);
      t.line.geometry.dispose();
      t.line.material.dispose();
      traces.splice(i, 1);
    }
  }
  for (let i = numbers.length - 1; i >= 0; i--) {
    const n = numbers[i];
    n.life -= dt;
    n.y += dt * 0.7;
    if (n.life <= 0) {
      n.element.remove();
      numbers.splice(i, 1);
      continue;
    }
    vec.set(n.x, n.y, n.z).project(camera);
    n.element.style.left = (vec.x * 0.5 + 0.5) * innerWidth + "px";
    n.element.style.top = (-vec.y * 0.5 + 0.5) * innerHeight + "px";
    n.element.style.opacity = Math.min(1, n.life * 3);
    n.element.hidden = vec.z > 1;
  }
  blastTime = Math.max(0, blastTime - dt);
  blastLight.intensity = blastTime * 450;
  shake = Math.max(0, shake - dt);
  fireLight.intensity = 180 + (reduced ? 0 : Math.sin(game.time * 7) * 10);
}
function syncUI() {
  root.dataset.state = game.mode;
  $("health-text").textContent = Math.ceil(game.hero.hp) + " / 100";
  $("health-fill").style.width = game.hero.hp + "%";
  $("energy-text").textContent =
    Math.floor(game.hero.energy) +
    "%" +
    (game.hero.energy >= 100 ? " · READY" : "");
  $("energy-fill").style.width = game.hero.energy + "%";
  $("score").textContent = String(game.score).padStart(6, "0");
  $("phase-label").textContent =
    "0" + (game.level + 1) + " / " + LEVELS[game.level].location;
  const alive = game.enemies.filter((e) => !e.dead),
    boss = alive.find((e) => e.boss);
  $("remaining").textContent =
    game.mode === "wave"
      ? alive.length + (game.queue || 0) + " HOSTILES REMAINING"
      : boss
        ? "BOSS FIGHT"
        : "THE LEGEND CONTINUES";
  $("boss-status").hidden = !boss || game.mode === "bossIntro";
  if (boss) {
    $("boss-name").textContent = LEVELS[game.level].name;
    $("boss-fill").style.width =
      Math.max(0, (boss.hp / boss.maxHp) * 100) + "%";
    $("boss-phase").textContent =
      boss.hp < boss.maxHp / 2 ? "ENRAGED" : "SHOWDOWN";
  }
  $("menu").hidden = game.mode !== "menu";
  $("pause-screen").hidden = !game.paused;
  const done = ["lost", "won"].includes(game.mode);
  $("results").hidden = !done;
  if (done) {
    $("result-kicker").textContent =
      game.mode === "won" ? "THE CITY IS YOURS" : "THE LEGEND IS NOT FINISHED";
    $("result-title").textContent =
      game.mode === "won" ? "Hukum delivered." : "Rise again.";
    $("result-detail").textContent =
      "SCORE " +
      game.score.toLocaleString() +
      " · " +
      (game.mode === "won"
        ? "All three bosses defeated."
        : LEVELS[game.level].name + " awaits.");
    $("retry").hidden = game.mode === "won";
  }
  const ally = ALLIES.find((a) => a.id === game.selected);
  $("support").hidden = !ally || ["menu", "lost", "won"].includes(game.mode);
  if (ally) {
    $("support-name").textContent =
      ally.name.toUpperCase() + " · " + ally.ability.toUpperCase();
    $("support-state").textContent = game.support
      ? (10 - game.support.time).toFixed(1) + "s · SUPPORT ACTIVE"
      : game.mode !== "wave"
        ? "Boss & cinematic lock"
        : game.used
          ? "Used this wave"
          : "Ready · once per wave";
    $("support-fill").style.width = game.support
      ? (10 - game.support.time) * 10 + "%"
      : game.used
        ? "0%"
        : "100%";
    $("summon").disabled =
      game.mode !== "wave" ||
      game.paused ||
      game.used ||
      !!game.support ||
      !!game.cinematic;
    $("target").hidden = game.selected !== "narasimha";
    $("target").disabled = game.mode !== "wave";
  }
  const cut =
    ["intro", "bossIntro", "interlude", "victory"].includes(game.mode) ||
    !!game.cinematic;
  $("skip").hidden = !cut || game.paused;
  $("cinema-caption").hidden = !cut;
  $("cinema-caption").classList.toggle("hero-close", game.mode === "intro");
  if (cut) {
    let kicker = "",
      title = "",
      subtitle = "";
    if (game.cinematic) {
      kicker = "FULL ENERGY · FINAL WORD";
      title = game.cinematic.time < 1.1 ? "GLASSES ON." : "ROCKET RECKONING";
      subtitle = "TIGER KA HUKUM";
    } else if (game.mode === "intro") {
      kicker = "THE CITY HAS RULES";
      title = "JAILER";
      subtitle = "HE IS THE EXCEPTION.";
    } else if (game.mode === "bossIntro") {
      kicker = "LEVEL 0" + (game.level + 1) + " · SHOWDOWN";
      title = LEVELS[game.level].name;
      subtitle = "GUARD THE PUNCH. DASH AWAY FROM THE RUSH.";
    } else if (game.mode === "interlude") {
      kicker = "LEVEL CONQUERED";
      title = "THE HUNT CONTINUES";
      subtitle = "NEXT WAVE INCOMING · +30 HEALTH";
    } else {
      kicker = "THE CITY REMEMBERS";
      title = "JAILER";
      subtitle = "TIGER KA HUKUM · ALL BOSSES DEFEATED";
    }
    $("cinema-kicker").textContent = kicker;
    $("cinema-title").textContent = title;
    $("cinema-subtitle").textContent = subtitle;
  }
  $("combo").textContent = game.combo > 1 ? game.combo + " HIT COMBO" : "";
  $("announcement").style.opacity = messageTime > 0 ? "1" : "0";
  $("pause").textContent = game.paused ? "▶" : "Ⅱ";
}
$("allies").innerHTML = ALLIES.map(
  (a) =>
    `<button type="button" role="radio" aria-checked="false" data-ally="${a.id}" style="--ally-color:${a.color}"><strong>${a.name}</strong><small>${a.detail}</small></button>`,
).join("");
function choose(id) {
  game.select(id);
  document.querySelectorAll("[data-ally]").forEach((b) => {
    b.setAttribute("aria-checked", String(b.dataset.ally === id));
    b.tabIndex = b.dataset.ally === id ? 0 : -1;
  });
  $("start").disabled = !ready;
  $("start").textContent =
    "ENTER WITH " + ALLIES.find((a) => a.id === id).name.toUpperCase() + " →";
}
const allyButtons = Array.from(document.querySelectorAll("[data-ally]"));
allyButtons.forEach((button, i) => {
  button.tabIndex = i === 0 ? 0 : -1;
  button.onclick = () => choose(button.dataset.ally);
  button.onkeydown = (e) => {
    if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      const next =
        (i +
          (["ArrowRight", "ArrowDown"].includes(e.key) ? 1 : -1) +
          ALLIES.length) %
        ALLIES.length;
      choose(ALLIES[next].id);
      allyButtons[next].focus();
    }
  };
});
function openMenu() {
  game.mode = "menu";
  game.paused = false;
  game.support = null;
  game.enemies = [];
  game.hero = game.makeHero();
  game.time = 0;
  keys.clear();
  $("soundtrack").pause();
  $("settings").open = false;
  if (game.selected) choose(game.selected);
}
function begin(retry = false) {
  $("settings").open = false;
  if (game.start({ retry })) {
    renderer.domElement.focus();
  }
}
$("start").onclick = () => begin();
$("retry").onclick = () => begin(true);
$("new-run").onclick = openMenu;
$("restart").onclick = openMenu;
function pause(value) {
  game.setPause(value);
  keys.clear();
  queued.clear();
  touches.clear();
  document
    .querySelectorAll(".pressed")
    .forEach((b) => b.classList.remove("pressed"));
  if (game.paused) {
    $("soundtrack").pause();
    $("resume").focus();
  } else {
    if (musicWanted && !["menu", "lost", "won"].includes(game.mode))
      $("soundtrack")
        .play()
        .catch(() => {});
    renderer.domElement.focus();
  }
  syncUI();
}
$("pause").onclick = () => pause(!game.paused);
$("resume").onclick = () => pause(false);
$("skip").onclick = () => game.skip();
$("summon").onclick = () => game.summon();
$("target").onclick = () => game.cycleTarget();
const normalize = (key) =>
  ({ " ": "j", shift: "k", e: "l" })[key.toLowerCase()] || key.toLowerCase();
addEventListener("keydown", (e) => {
  if (
    ["INPUT", "SELECT", "TEXTAREA", "SUMMARY"].includes(e.target.tagName) ||
    $("settings").contains(e.target)
  )
    return;
  const key = normalize(e.key);
  if (
    [
      "w",
      "a",
      "s",
      "d",
      "j",
      "k",
      "i",
      "l",
      "c",
      "t",
      "p",
      "escape",
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
    ].includes(key) &&
    game.mode !== "menu"
  )
    e.preventDefault();
  if (["p", "escape"].includes(key) && !e.repeat) {
    pause(!game.paused);
    return;
  }
  if (game.paused) return;
  if (key === "c" && !e.repeat) game.summon();
  if (key === "t" && !e.repeat) game.cycleTarget();
  keys.add(key);
  if (["j", "k", "l"].includes(key) && !e.repeat) queued.add(key);
});
addEventListener("keyup", (e) => keys.delete(normalize(e.key)));
addEventListener("blur", () => {
  if (!["menu", "lost", "won"].includes(game.mode)) pause(true);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && !["menu", "lost", "won"].includes(game.mode))
    pause(true);
});
for (const button of document.querySelectorAll("[data-key]")) {
  button.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    touches.set(e.pointerId, button.dataset.key);
    keys.add(button.dataset.key);
    if (["j", "k", "l"].includes(button.dataset.key))
      queued.add(button.dataset.key);
    button.classList.add("pressed");
  });
  const release = (e) => {
    const key = touches.get(e.pointerId);
    touches.delete(e.pointerId);
    if (key && !Array.from(touches.values()).includes(key)) keys.delete(key);
    button.classList.remove("pressed");
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
}
$("settings").addEventListener("toggle", () => {
  if (!$("settings").open && game.mode !== "menu") renderer.domElement.focus();
});
$("settings").addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.stopPropagation();
    $("settings").open = false;
    renderer.domElement.focus();
  }
});
$("fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await root.requestFullscreen();
  } catch {
    announce("Fullscreen is unavailable on this browser.");
  }
};
$("quality").value = high ? "high" : "balanced";
$("quality").onchange = () => {
  high = $("quality").value === "high";
  renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 1.6 : 1.15));
  resize();
};
$("motion").textContent = "Cinema camera: " + (reduced ? "Off" : "On");
$("motion").onclick = () => {
  reduced = !reduced;
  $("motion").textContent = "Cinema camera: " + (reduced ? "Off" : "On");
};
$("music-toggle").onclick = () => {
  musicWanted = !musicWanted;
  $("music-toggle").textContent = "Music: " + (musicWanted ? "On" : "Off");
  if (musicWanted && game.mode !== "menu" && !game.paused)
    $("soundtrack")
      .play()
      .catch(() => announce("Tap Music again to retry playback."));
  else $("soundtrack").pause();
};
$("soundtrack").volume = 0.45;
$("model-file").onchange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".glb")) {
    $("model-status").textContent = "Choose a self-contained GLB file.";
    return;
  }
  if (file.size > 40 * 1024 * 1024) {
    $("model-status").textContent = "Use a GLB smaller than 40 MB.";
    return;
  }
  const previousPause = game.paused;
  game.setPause(true);
  $("model-status").textContent = "Loading hero model…";
  try {
    const buffer = await file.arrayBuffer(),
      view = new DataView(buffer);
    if (buffer.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67)
      throw Error("Not a GLB file");
    const jsonLength = view.getUint32(12, true);
    if (20 + jsonLength > buffer.byteLength)
      throw Error("Invalid GLB JSON chunk");
    const manifest = JSON.parse(
      new TextDecoder().decode(buffer.slice(20, 20 + jsonLength)),
    );
    if (
      [...(manifest.buffers || []), ...(manifest.images || [])].some(
        (resource) => resource.uri && !resource.uri.startsWith("data:"),
      )
    )
      throw Error("Model resources must be embedded");
    const gltf = await new GLTFLoader().parseAsync(buffer, "");
    const model = gltf.scene,
      bounds = new THREE.Box3().setFromObject(model),
      size = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y < 0.001)
      throw Error("Model has no usable geometry");
    const scale = 1.95 / size.y;
    model.scale.setScalar(scale);
    model.position.set(
      -(bounds.min.x + size.x / 2) * scale,
      -bounds.min.y * scale,
      -(bounds.min.z + size.z / 2) * scale,
    );
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    if (hero.userData.imported) hero.remove(hero.userData.imported);
    hero.userData.body.visible = false;
    hero.add(model);
    hero.userData.imported = model;
    hero.userData.mixer = new THREE.AnimationMixer(model);
    hero.userData.clipMap = {};
    for (const [state, pattern] of Object.entries({
      idle: /idle|stand/i,
      run: /run|walk/i,
      punch: /punch|attack|fight/i,
      block: /block|guard/i,
      death: /death|die/i,
    }))
      hero.userData.clipMap[state] = gltf.animations.find((c) =>
        pattern.test(c.name),
      );
    hero.userData.currentClip = null;
    $("model-status").textContent =
      file.name +
      " · " +
      gltf.animations.length +
      " animation clips" +
      (gltf.animations.length ? "" : " · movement only; model has no clips");
  } catch (error) {
    $("model-status").textContent =
      "Could not load this GLB. Use an uncompressed, self-contained model.";
    console.warn("Hero model:", error.message);
  } finally {
    game.paused = previousPause;
  }
};
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(innerWidth, innerHeight);
}
addEventListener("resize", resize);
renderer.domElement.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  pause(true);
  $("fallback").hidden = false;
  $("failure-message").textContent =
    "The graphics context was lost. Reload this page or continue in 2D.";
});
function frame(now) {
  const raw = Math.max(0, (now - last) / 1000 || 0.016);
  last = now;
  const dt = Math.min(raw, 0.12);
  if (!game.paused) {
    if (game.mode === "menu") {
      game.time += dt;
      game.hero.yaw = 0.3;
    } else {
      let remaining = dt;
      while (remaining > 0) {
        const step = Math.min(0.025, remaining);
        game.update(
          step,
          {
            up: keys.has("w") || keys.has("arrowup"),
            down: keys.has("s") || keys.has("arrowdown"),
            left: keys.has("a") || keys.has("arrowleft"),
            right: keys.has("d") || keys.has("arrowright"),
            punch: keys.has("j") || queued.has("j"),
            dash: keys.has("k") || queued.has("k"),
            guard: keys.has("i"),
            fatality: keys.has("l") || queued.has("l"),
          },
          step * (dt ? raw / dt : 1),
        );
        if (!game.hitStop) queued.clear();
        remaining -= step;
      }
    }
    messageTime = Math.max(0, messageTime - dt);
    syncActors(dt);
    effects(dt);
  }
  cameraFrame(game.paused ? 0 : dt);
  syncUI();
  if (high) composer.render(dt);
  else renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
syncActors(0);
cameraFrame(1);
renderer.compile(scene, camera);
ready = true;
$("loading").textContent = "Arena ready · keyboard & touch";
if (game.selected) $("start").disabled = false;
if (new URLSearchParams(location.search).has("debug"))
  window.__JAILER3D__ = {
    game,
    scene,
    renderer,
    camera,
    hero,
    actors,
    choose,
    begin,
    frame,
    high: () => high,
  };
requestAnimationFrame(frame);
