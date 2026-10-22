import * as THREE from "three";
const sphere = new THREE.SphereGeometry(1, 12, 10),
  box = new THREE.BoxGeometry(1, 1, 1),
  capsule = new THREE.CapsuleGeometry(1, 1, 4, 8);
const styles = {
  hero: [0x292b2d, 0x15171b, 0xba8969, 0x68615b],
  grunt: [0x34404b, 0x1b2630, 0xab7858, 0x171615],
  heavy: [0x5a3432, 0x202027, 0xb28365, 0x1d1815],
  boss0: [0x405045, 0x22282b, 0x936b50, 0x17191a],
  boss1: [0x51313b, 0x171b21, 0xaf7958, 0x261d19],
  boss2: [0xd0c4a7, 0x22262d, 0xc8946f, 0x19191b],
  narasimha: [0x252d31, 0x1c2328, 0x9b6f53, 0x363838],
  mathew: [0x904641, 0x24272e, 0xae8064, 0x1b1513],
  hrithik: [0x19232e, 0x171e25, 0xb17e60, 0x27201b],
  pragi: [0xd6ccb4, 0x34362e, 0xb78a69, 0x24211f],
  swetha: [0xbcb49a, 0xb3a98e, 0xc59b7c, 0x30251d],
  girl0: [0x694683, 0x262535, 0xb88969, 0x231a23],
  girl1: [0x346781, 0x1d2a37, 0xb98f70, 0x211c19],
  girl2: [0x9e8546, 0x292a2f, 0xba8767, 0x302018],
};
const mat = (color, roughness = 0.72, metalness = 0.08) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
function mesh(parent, geo, material, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function segment(parent, material, radius, length) {
  const m = mesh(
    parent,
    capsule,
    material,
    0,
    -length / 2,
    0,
    radius,
    (length + radius * 2) / 3,
    radius,
  );
  return m;
}
export function makeRifle() {
  const g = new THREE.Group(),
    steel = mat(0x252a2e, 0.3, 0.75),
    black = mat(0x121518);
  mesh(g, box, steel, 0, 0, 0.13, 0.1, 0.12, 0.43);
  mesh(g, box, black, 0, -0.1, 0.03, 0.07, 0.17, 0.09);
  const barrel = mesh(
    g,
    new THREE.CylinderGeometry(0.023, 0.026, 0.45, 8),
    steel,
    0,
    0.02,
    0.5,
    1,
    1,
    1,
  );
  barrel.rotation.x = Math.PI / 2;
  mesh(g, box, black, 0, 0.01, -0.17, 0.1, 0.15, 0.2);
  return g;
}
export function makeAvatar(kind) {
  const [shirt, pants, skin, hair] = styles[kind] || styles.grunt,
    g = new THREE.Group(),
    torsoMat = mat(shirt),
    skinMat = mat(skin, 0.9),
    pantsMat = mat(pants),
    hairMat = mat(hair, 0.95),
    shoeMat = mat(0x151517, 0.45),
    metal = mat(0xc2ad78, 0.3, 0.7),
    dark = mat(0x121719, 0.22, 0.5);
  const female = kind.startsWith("girl") || kind === "swetha",
    wide = kind === "heavy" ? 1.25 : female ? 0.9 : 1;
  const body = new THREE.Group();
  g.add(body);
  mesh(body, capsule, torsoMat, 0, 1.22, 0, 0.23 * wide, 0.26, 0.16);
  mesh(body, box, pantsMat, 0, 0.91, 0, 0.36 * wide, 0.16, 0.28);
  if (kind === "hero" || kind === "boss2" || kind === "pragi") {
    for (const side of [-1, 1]) {
      const collar = mesh(
        body,
        box,
        torsoMat,
        side * 0.065,
        1.48,
        0.15,
        0.09,
        0.12,
        0.025,
      );
      collar.rotation.z = side * 0.45;
    }
    for (let i = 0; i < 3; i++)
      mesh(body, sphere, metal, 0, 1.36 - i * 0.13, 0.166, 0.012, 0.012, 0.008);
  }
  const neck = mesh(body, capsule, skinMat, 0, 1.52, 0, 0.065, 0.045, 0.065),
    head = new THREE.Group();
  head.position.y = 1.73;
  body.add(head);
  mesh(head, sphere, skinMat, 0, 0, 0, 0.155, 0.2, 0.145);
  mesh(head, sphere, skinMat, 0, -0.1, 0.025, 0.13, 0.1, 0.12);
  for (const side of [-1, 1]) {
    mesh(head, sphere, skinMat, side * 0.156, -0.01, 0, 0.028, 0.045, 0.025);
    mesh(
      head,
      sphere,
      mat(0xe5d7c5),
      side * 0.062,
      0.015,
      0.128,
      0.035,
      0.018,
      0.018,
    );
    mesh(head, sphere, dark, side * 0.062, 0.015, 0.145, 0.015, 0.014, 0.008);
    mesh(head, box, hairMat, side * 0.06, 0.05, 0.139, 0.07, 0.018, 0.016);
  }
  const nose = mesh(
    head,
    sphere,
    skinMat,
    0,
    -0.025,
    0.151,
    0.032,
    0.045,
    0.043,
  );
  mesh(head, box, mat(0x8b5c4b), 0, -0.1, 0.129, 0.063, 0.011, 0.008);
  if (kind !== "boss0") {
    mesh(head, sphere, hairMat, 0, 0.15, -0.015, 0.17, 0.09, 0.15);
    for (let i = 0; i < 6; i++)
      mesh(
        head,
        sphere,
        hairMat,
        Math.sin(i * 2.1) * 0.115,
        0.17 + Math.cos(i) * 0.025,
        -0.02 + Math.cos(i * 2.1) * 0.08,
        0.073,
        0.05,
        0.07,
      );
  } else mesh(head, sphere, hairMat, 0, 0.05, -0.08, 0.16, 0.12, 0.08);
  if (female) {
    mesh(head, capsule, hairMat, 0, -0.12, -0.12, 0.19, 0.24, 0.11);
    mesh(head, sphere, hairMat, 0.13, 0.02, -0.08, 0.1, 0.22, 0.1);
  }
  if (
    ["hero", "boss0", "narasimha", "mathew", "pragi", "hrithik"].includes(kind)
  ) {
    const beard = kind === "hero" ? mat(0x827e72) : hairMat;
    mesh(head, sphere, beard, 0, -0.13, 0.06, 0.137, 0.077, 0.11);
    mesh(head, sphere, skinMat, 0, -0.105, 0.14, 0.065, 0.018, 0.012);
  }
  if (kind === "boss1") {
    for (const side of [-1, 1]) {
      const moustache = mesh(
        head,
        capsule,
        hairMat,
        side * 0.036,
        -0.074,
        0.145,
        0.02,
        0.035,
        0.013,
      );
      moustache.rotation.z = side * 0.8;
    }
  }
  const glasses = new THREE.Group();
  if (["hero", "boss2", "mathew"].includes(kind)) {
    head.add(glasses);
    for (const side of [-1, 1]) {
      const frame = mesh(
        glasses,
        new THREE.TorusGeometry(0.048, 0.009, 4, 12),
        kind === "boss2" ? metal : dark,
        side * 0.064,
        0.02,
        0.155,
        1.15,
        0.78,
        1,
      );
      mesh(
        glasses,
        sphere,
        dark,
        side * 0.064,
        0.02,
        0.154,
        0.049,
        0.032,
        0.006,
      );
    }
    mesh(glasses, box, dark, 0, 0.02, 0.16, 0.035, 0.012, 0.014);
  }
  const arms = [],
    elbows = [],
    legs = [],
    knees = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.115, 0.91, 0);
    body.add(leg);
    segment(leg, pantsMat, 0.09, 0.41);
    const knee = new THREE.Group();
    knee.position.y = -0.41;
    leg.add(knee);
    segment(knee, pantsMat, 0.075, 0.39);
    mesh(knee, sphere, shoeMat, 0, -0.4, 0.05, 0.09, 0.06, 0.16);
    legs.push(leg);
    knees.push(knee);
    const arm = new THREE.Group();
    arm.position.set(side * 0.28 * wide, 1.43, 0);
    body.add(arm);
    segment(arm, kind === "boss0" ? skinMat : torsoMat, 0.075, 0.31);
    const elbow = new THREE.Group();
    elbow.position.y = -0.31;
    arm.add(elbow);
    segment(elbow, skinMat, 0.06, 0.28);
    mesh(elbow, sphere, skinMat, 0, -0.29, 0, 0.064, 0.07, 0.067);
    arms.push(arm);
    elbows.push(elbow);
  }
  let gun = null;
  if (kind === "hrithik" || kind === "narasimha") {
    gun = makeRifle();
    gun.position.set(0, -0.29, 0.05);
    elbows[1].add(gun);
  }
  const launcher = new THREE.Group();
  const tube = mesh(
    launcher,
    new THREE.CylinderGeometry(0.1, 0.1, 1.1, 12),
    mat(0x455544, 0.4, 0.35),
    0,
    0,
    0.2,
    1,
    1,
    1,
  );
  tube.rotation.x = Math.PI / 2;
  mesh(
    launcher,
    new THREE.CylinderGeometry(0.115, 0.115, 0.08, 12),
    dark,
    0,
    0,
    0.73,
    1,
    1,
    1,
  ).rotation.x = Math.PI / 2;
  launcher.position.set(0.3, 1.47, 0);
  body.add(launcher);
  launcher.visible = false;
  if (kind === "hrithik") {
    mesh(body, box, torsoMat, 0, 0.76, -0.12, 0.43, 0.66, 0.1);
  }
  if (kind === "swetha") {
    mesh(body, capsule, torsoMat, 0, 0.86, -0.08, 0.29, 0.37, 0.12);
    const gold = new THREE.MeshBasicMaterial({
      color: 0xf6cd74,
      transparent: true,
      opacity: 0.21,
      depthWrite: false,
    });
    for (const side of [-1, 1])
      mesh(body, sphere, gold, side * 0.38, 1.47, -0.13, 0.37, 0.43, 0.035);
    const chain = mesh(
      body,
      new THREE.TorusGeometry(0.1, 0.009, 4, 16),
      metal,
      0,
      1.41,
      0.15,
      1,
      0.9,
      1,
    );
    const scarf = mesh(
      body,
      box,
      mat(0xd1c9af),
      -0.13,
      1.12,
      0.17,
      0.12,
      0.72,
      0.02,
    );
    scarf.rotation.z = 0.14;
  }
  g.userData = {
    body,
    head,
    arms,
    elbows,
    legs,
    knees,
    torsoMat,
    launcher,
    kind,
    glasses,
    gun,
  };
  return g;
}
export function animateAvatar(
  g,
  actor,
  time,
  {
    finisher = false,
    celebrate = false,
    reducedMotion = false,
    delta = 1 / 60,
  } = {},
) {
  const r = g.userData;
  g.position.set(actor.x, 0, actor.z);
  g.rotation.y = actor.yaw || 0;
  if (r.mixer) {
    r.mixer.update(delta);
    const state = actor.dead
      ? "death"
      : actor.attack
        ? "punch"
        : actor.blocking
          ? "block"
          : actor.moving
            ? "run"
            : "idle";
    const name = r.clipMap[state] || r.clipMap.idle;
    if (name && name !== r.currentClip) {
      r.currentAction?.fadeOut(0.15);
      r.currentAction = r.mixer.clipAction(name);
      r.currentAction
        .reset()
        .setLoop(
          state === "death" || state === "punch"
            ? THREE.LoopOnce
            : THREE.LoopRepeat,
          state === "death" || state === "punch" ? 1 : Infinity,
        );
      r.currentAction.clampWhenFinished = state === "death";
      r.currentAction.timeScale = state === "punch" ? name.duration / 0.34 : 1;
      r.currentAction.fadeIn(0.15).play();
      r.currentClip = name;
    }
    g.rotation.z = actor.dead ? -Math.min(Math.PI / 2, actor.deathTime * 2) : 0;
    return;
  }
  const stride = actor.moving ? Math.sin(actor.walk || time * 10) * 0.65 : 0,
    attack = actor.attack
      ? Math.sin(Math.min(1, actor.attack.time / 0.34) * Math.PI)
      : 0;
  r.body.position.y = actor.moving
    ? Math.abs(Math.sin((actor.walk || 0) * 2)) * 0.025
    : Math.sin(time * 2) * 0.006;
  r.body.rotation.set(0, attack * 0.12, 0);
  r.head.rotation.set(0, 0, 0);
  for (let i = 0; i < 2; i++) {
    const sign = i ? 1 : -1;
    r.legs[i].rotation.set(stride * sign, 0, 0);
    r.knees[i].rotation.x = Math.max(0, -stride * sign) * 0.8;
    r.arms[i].rotation.set(-stride * sign * 0.6, 0, sign * 0.07);
    r.elbows[i].rotation.x = -0.16;
  }
  if (actor.attack) {
    if (actor.attack.kick) {
      r.legs[1].rotation.x = -attack * 1.55;
      r.knees[1].rotation.x = 0.15;
      r.body.rotation.z = -attack * 0.1;
    } else {
      r.arms[1].rotation.x = -attack * 1.8;
      r.elbows[1].rotation.x = -attack * 0.15;
      r.arms[0].rotation.x = -0.5;
    }
  }
  if (actor.windup > 0) {
    r.arms[1].rotation.x = -0.8;
    r.arms[1].rotation.z = 0.4;
    r.body.rotation.z = -0.08;
  }
  if (actor.blocking) {
    r.arms.forEach((a) => {
      a.rotation.x = -1.2;
    });
    r.elbows.forEach((e) => (e.rotation.x = -1.4));
  }
  if (r.gun) {
    r.arms[1].rotation.x = -1.3;
    r.elbows[1].rotation.x = -0.25;
    r.arms[0].rotation.x = -1.1;
    r.elbows[0].rotation.x = -0.8;
  }
  if (r.kind === "swetha") {
    r.arms[0].rotation.x = -0.8;
    r.elbows[0].rotation.x = -0.6;
    r.arms[1].rotation.z = 0.7;
    r.arms[1].rotation.x = -0.5;
  }
  r.launcher.visible = finisher;
  if (finisher) {
    r.arms[1].rotation.x = -1.5;
    r.arms[0].rotation.x = -1.1;
    r.elbows[0].rotation.x = -1.5;
    r.head.rotation.y = -0.12;
  }
  if (celebrate) {
    r.arms[1].rotation.x = -0.5;
    r.elbows[1].rotation.x = -1.7;
    r.head.rotation.y = Math.sin(time * 0.6) * 0.15;
  }
  r.torsoMat.emissive.setHex(actor.flash > 0 ? 0x75502b : 0);
  r.torsoMat.emissiveIntensity = actor.flash > 0 ? 0.6 : 0;
  if (actor.dead) {
    g.rotation.z = -Math.min(Math.PI / 2, (actor.deathTime || 0) * 2.5);
    g.position.y = 0.06;
    g.scale.setScalar(Math.max(0.8, 1 - (actor.deathTime || 0) * 0.07));
  } else {
    g.rotation.z = 0;
    g.scale.setScalar(1);
  }
}
export function makeCar() {
  const g = new THREE.Group(),
    black = mat(0x171c21, 0.27, 0.72),
    glass = mat(0x283c45, 0.12, 0.6),
    rubber = mat(0x0d1013, 0.9),
    steel = mat(0x666b6e, 0.3, 0.8);
  mesh(g, box, black, 0, 0.85, 0, 3.8, 0.65, 1.7);
  mesh(g, box, black, -0.25, 1.5, 0, 2.1, 0.75, 1.6);
  mesh(g, box, glass, 0.82, 1.55, 0, 0.025, 0.48, 1.42);
  mesh(g, box, glass, -1.32, 1.55, 0, 0.025, 0.48, 1.42);
  for (const side of [-1, 1]) {
    mesh(g, box, glass, -0.2, 1.55, side * 0.806, 1.85, 0.43, 0.012);
    for (const x of [-1.1, 1.15]) {
      const wheel = mesh(
        g,
        new THREE.CylinderGeometry(0.43, 0.43, 0.24, 16),
        rubber,
        x,
        0.47,
        side * 0.86,
        1,
        1,
        1,
      );
      wheel.rotation.x = Math.PI / 2;
      mesh(
        g,
        new THREE.CylinderGeometry(0.24, 0.24, 0.25, 12),
        steel,
        x,
        0.47,
        side * 0.87,
        1,
        1,
        1,
      ).rotation.x = Math.PI / 2;
    }
    mesh(
      g,
      box,
      new THREE.MeshBasicMaterial({ color: 0xffe4aa }),
      1.92,
      0.91,
      side * 0.53,
      0.025,
      0.16,
      0.34,
    );
  }
  return g;
}
