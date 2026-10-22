export const LEVELS = [
  {
    name: "THE ENFORCER",
    location: "DOCKYARD AMBUSH",
    count: 12,
    hp: 340,
    damage: 17,
    speed: 2.5,
  },
  {
    name: "KALPAK BROTHER",
    location: "MILL LOCKDOWN",
    count: 18,
    hp: 460,
    damage: 21,
    speed: 2.9,
  },
  {
    name: "BODHI KALPAK",
    location: "NEON RECKONING",
    count: 24,
    hp: 620,
    damage: 25,
    speed: 3.2,
  },
];
export const ALLIES = [
  {
    id: "narasimha",
    name: "Narasimha",
    ability: "Triple sniper",
    detail: "Three targets. One shot.",
    color: "#c3df95",
  },
  {
    id: "mathew",
    name: "Mathew",
    ability: "Vehicular impact",
    detail: "A heavy SUV clears the street.",
    color: "#edb177",
  },
  {
    id: "hrithik",
    name: "Hrithik",
    ability: "Strike team",
    detail: "Rifle fire and three melee fighters.",
    color: "#c7a0f2",
  },
  {
    id: "pragi",
    name: "Pragathees",
    ability: "Martial arts",
    detail: "Close-range punches and roundhouse kicks.",
    color: "#91d4e4",
  },
  {
    id: "swetha",
    name: "Swetha",
    ability: "Guardian circle",
    detail: "Keep mobs out. Drain 25 HP/s. Heal 6 HP/s.",
    color: "#f8daa1",
  },
];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const normal = (e) => !e.dead && !e.boss;
export class CinemaGame {
  constructor({ emit = () => {}, random = Math.random } = {}) {
    this.emit = emit;
    this.random = random;
    this.uid = 0;
    this.mode = "menu";
    this.paused = false;
    this.selected = null;
    this.enemies = [];
    this.support = null;
    this.hero = this.makeHero();
    this.time = 0;
    this.score = 0;
    this.level = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.cinematic = null;
  }
  makeHero() {
    return {
      id: "hero",
      kind: "hero",
      x: -3,
      z: 1,
      hp: 100,
      energy: 0,
      yaw: Math.PI / 2,
      attack: null,
      cooldown: 0,
      invulnerable: 0,
      dash: 0,
      dashCooldown: 0,
      dashX: 1,
      dashZ: 0,
      blocking: false,
      moving: false,
      walk: 0,
    };
  }
  select(id) {
    if (!ALLIES.some((a) => a.id === id)) return false;
    this.selected = id;
    return true;
  }
  start({ retry = false } = {}) {
    if (!this.selected) return false;
    const checkpoint = retry ? this.checkpoint : null;
    this.hero = this.makeHero();
    this.score = checkpoint?.score || 0;
    this.level = checkpoint?.level || 0;
    this.enemies = [];
    this.support = null;
    this.combo = 0;
    this.comboTimer = 0;
    this.time = 0;
    this.paused = false;
    this.hitStop = 0;
    this.used = false;
    this.cinematic = null;
    if (checkpoint?.boss) this.spawnBoss();
    else {
      this.mode = "intro";
      this.modeTime = 0;
    }
    this.emit({ type: "start" });
    return true;
  }
  actor(kind, x, z) {
    const boss = kind === "boss",
      heavy = kind === "heavy",
      hp = boss
        ? LEVELS[this.level].hp
        : heavy
          ? 150 + this.level * 15
          : 90 + this.level * 10;
    return {
      id: ++this.uid,
      kind: boss ? "boss" + this.level : kind,
      boss,
      heavy,
      x,
      z,
      hp,
      maxHp: hp,
      yaw: -Math.PI / 2,
      cooldown: 0.8 + this.random() * 0.6,
      windup: 0,
      attack: null,
      attackCount: 0,
      stun: 0,
      flash: 0,
      moving: false,
      walk: this.random() * 6,
      dead: false,
      guard: 0,
    };
  }
  spawnWave() {
    this.mode = "wave";
    this.modeTime = 0;
    this.enemies = [];
    this.support = null;
    this.used = false;
    this.queue = LEVELS[this.level].count;
    this.spawnTimer = 1;
    this.waveSpawned = 0;
    this.checkpoint = { level: this.level, boss: false, score: this.score };
    for (let i = 0; i < 4; i++) this.spawnMob();
    this.emit({ type: "wave", level: this.level });
  }
  spawnMob() {
    if (!this.queue) return;
    const i = this.waveSpawned++,
      e = this.actor(
        i % 4 === 3 ? "heavy" : "grunt",
        i % 2 ? -12.5 : 12.5,
        -4 + this.random() * 8,
      );
    this.queue--;
    this.enemies.push(e);
  }
  spawnBoss() {
    this.support = null;
    this.enemies = [this.actor("boss", 7, 0)];
    this.mode = "bossIntro";
    this.modeTime = 0;
    this.checkpoint = { level: this.level, boss: true, score: this.score };
    this.emit({ type: "boss", level: this.level, actor: this.enemies[0] });
  }
  setPause(value = !this.paused) {
    if (["menu", "lost", "won"].includes(this.mode)) return;
    this.paused = value;
  }
  skip() {
    if (this.mode === "intro") this.modeTime = 4;
    else if (this.mode === "bossIntro") this.modeTime = 3;
    else if (this.mode === "interlude") this.modeTime = 2.5;
    else if (this.mode === "victory") this.modeTime = 8;
    else if (this.cinematic) this.cinematic.time = 2.7;
  }
  target() {
    return this.enemies
      .filter((e) => !e.dead)
      .sort((a, b) => distance(this.hero, a) - distance(this.hero, b))[0];
  }
  cycleTarget() {
    const mobs = this.enemies.filter(normal);
    const at = mobs.findIndex((e) => e.id === this.targetId);
    this.targetId = mobs[(at + 1) % mobs.length]?.id;
  }
  hasCircle() {
    return this.mode === "wave" && this.support?.id === "swetha";
  }
  enforceCircle() {
    if (!this.hasCircle()) return;
    for (const e of this.enemies.filter(normal)) {
      const d = distance(e, this.hero);
      if (d >= 3.3) continue;
      let angle =
        d > 0.001 ? Math.atan2(e.z - this.hero.z, e.x - this.hero.x) : e.id;
      let x = this.hero.x + Math.cos(angle) * 3.3,
        z = this.hero.z + Math.sin(angle) * 3.3;
      if (Math.abs(x) > 10.8 || Math.abs(z) > 5.8) {
        let best = Infinity;
        for (let i = 0; i < 48; i++) {
          const a = (i * Math.PI) / 24,
            tx = this.hero.x + Math.cos(a) * 3.3,
            tz = this.hero.z + Math.sin(a) * 3.3;
          if (Math.abs(tx) > 10.8 || Math.abs(tz) > 5.8) continue;
          const cost = Math.hypot(tx - e.x, tz - e.z);
          if (cost < best) {
            best = cost;
            x = tx;
            z = tz;
          }
        }
      }
      e.x = x;
      e.z = z;
      e.windup = 0;
      e.stun = Math.max(e.stun, 0.08);
    }
  }
  summon() {
    if (
      this.mode !== "wave" ||
      this.paused ||
      this.support ||
      this.used ||
      this.cinematic ||
      !this.enemies.some(normal)
    )
      return false;
    this.used = true;
    this.support = {
      id: this.selected,
      time: 0,
      nextPulse: 1,
      actors: [],
      car: { x: -18, z: this.hero.z, dir: 1, hits: new Set() },
    };
    const ids =
      this.selected === "hrithik"
        ? ["hrithik", "girl0", "girl1", "girl2"]
        : [this.selected];
    if (this.selected !== "mathew")
      this.support.actors = ids.map((kind, i) => ({
        id: "ally" + i,
        kind,
        x: this.hero.x - 2 - i * 0.45,
        z: this.hero.z + (i - 1) * 0.7,
        yaw: this.hero.yaw,
        cooldown: 0.2 + i * 0.08,
        attack: null,
        walk: 0,
        moving: false,
      }));
    this.emit({
      type: "support",
      name: ALLIES.find((a) => a.id === this.selected).name,
    });
    return true;
  }
  hit(e, amount, { passive = false } = {}) {
    if (!e || e.dead) return;
    if (e.boss && e.guard > 0 && amount < 60) amount = Math.ceil(amount * 0.4);
    e.hp = Math.max(0, e.hp - amount);
    e.flash = 0.15;
    if (!passive) {
      e.stun = e.boss ? 0.1 : 0.22;
      this.score += 25;
      this.combo++;
      this.comboTimer = 2;
      this.hero.energy = clamp(this.hero.energy + 11, 0, 100);
      this.hitStop = 0.035;
    }
    this.emit({ type: "hit", actor: e, amount, passive });
    if (e.hp <= 0) {
      e.dead = true;
      e.deathTime = 0;
      this.score += e.boss ? 2000 : e.heavy ? 300 : 160;
      this.hero.energy = clamp(this.hero.energy + 8, 0, 100);
      this.emit({ type: "ko", actor: e });
    }
  }
  hurt(e) {
    const p = this.hero;
    if (
      p.invulnerable > 0 ||
      p.dash > 0 ||
      this.cinematic ||
      (this.hasCircle() && !e.boss)
    )
      return;
    if (p.blocking && e.attackKind !== "rush") {
      p.invulnerable = 0.25;
      p.energy = clamp(p.energy + 9, 0, 100);
      this.emit({ type: "block", actor: p });
      return;
    }
    const amount = e.boss
      ? LEVELS[this.level].damage
      : e.heavy
        ? 18 + this.level * 2
        : 13 + this.level * 2;
    p.hp = Math.max(0, p.hp - amount);
    p.invulnerable = 0.65;
    this.combo = 0;
    this.emit({ type: "hurt", actor: p, amount });
    if (!p.hp) {
      this.mode = "lost";
      this.support = null;
      this.emit({ type: "lost" });
    }
  }
  rocket() {
    if (
      !["wave", "boss"].includes(this.mode) ||
      this.paused ||
      this.cinematic ||
      this.hero.energy < 100
    )
      return false;
    const target = this.enemies.find((e) => e.boss && !e.dead) || this.target();
    if (!target) return false;
    this.hero.energy = 0;
    this.hero.attack = null;
    this.hero.dash = 0;
    this.hero.yaw = Math.atan2(target.x - this.hero.x, target.z - this.hero.z);
    this.cinematic = {
      type: "rocket",
      time: 0,
      target,
      launched: false,
      impacted: false,
    };
    this.emit({ type: "finisher", actor: target });
    return true;
  }
  updateSupport(dt) {
    const s = this.support;
    if (!s || this.mode !== "wave") return;
    const before = s.time;
    s.time = Math.min(10, s.time + dt);
    if (10 - s.time < 1e-9) s.time = 10;
    const step = s.time - before,
      p = this.hero;
    for (const a of s.actors) {
      a.cooldown = Math.max(0, a.cooldown - step);
      if (a.attack) {
        a.attack.time += step;
        if (a.attack.time > 0.44) a.attack = null;
      }
      a.walk += step * 11;
      a.moving = false;
    }
    this.enforceCircle();
    if (s.id === "swetha") {
      const a = s.actors[0];
      a.x += (p.x - 1.8 - a.x) * (1 - Math.exp(-5 * step));
      a.z += (p.z + 0.6 - a.z) * (1 - Math.exp(-5 * step));
      a.yaw = p.yaw;
      a.moving = distance(a, p) > 2.2;
      while (s.nextPulse <= s.time + 1e-9) {
        p.hp = Math.min(100, p.hp + 6);
        for (const e of this.enemies.filter(normal))
          if (distance(e, p) < 4.4) this.hit(e, 25, { passive: true });
        this.emit({ type: "heal", actor: p });
        s.nextPulse++;
      }
    } else if (s.id === "narasimha") {
      while (s.nextPulse <= s.time + 1e-9) {
        const mobs = this.enemies.filter(normal),
          primary =
            mobs.find((e) => e.id === this.targetId) ||
            mobs.sort((a, b) => distance(p, a) - distance(p, b))[0];
        if (primary)
          for (const e of [
            primary,
            ...mobs
              .filter((e) => e !== primary)
              .sort((a, b) => distance(a, primary) - distance(b, primary)),
          ].slice(0, 3)) {
            this.emit({
              type: "shot",
              from: { x: -17, z: -5, y: 5 },
              actor: e,
            });
            this.hit(e, e.hp, { passive: true });
          }
        s.nextPulse += 1.25;
      }
    } else if (s.id === "mathew") {
      const car = s.car,
        old = car.x;
      car.x += car.dir * 13 * step;
      for (const e of this.enemies.filter(normal))
        if (
          !car.hits.has(e.id) &&
          Math.abs(e.z - car.z) < 1.8 &&
          e.x >= Math.min(old, car.x) - 2 &&
          e.x <= Math.max(old, car.x) + 2
        ) {
          car.hits.add(e.id);
          this.hit(e, 160, { passive: true });
          this.emit({ type: "impact", actor: e });
        }
      if (Math.abs(car.x) > 18) {
        car.dir *= -1;
        car.x = clamp(car.x, -18, 18);
        car.z = this.target()?.z || p.z;
        car.hits.clear();
      }
    } else {
      s.actors.forEach((a, i) => {
        const mobs = this.enemies
            .filter(normal)
            .sort((x, y) => distance(a, x) - distance(a, y)),
          target = mobs[i % mobs.length];
        if (!target) return;
        const gun = a.kind === "hrithik",
          d = distance(a, target);
        a.yaw = Math.atan2(target.x - a.x, target.z - a.z);
        if (d > (gun ? 5 : 1.55)) {
          const travel = Math.min(d, step * 6.5);
          a.x += ((target.x - a.x) / d) * travel;
          a.z += ((target.z - a.z) / d) * travel;
          a.moving = true;
        }
        if (d < (gun ? 10 : 2) && a.cooldown <= 0) {
          a.attack = { time: 0, kick: i % 2 === 1 };
          a.cooldown = gun ? 0.2 : 0.5;
          this.hit(target, gun ? 24 : s.id === "pragi" ? 48 : 26, {
            passive: true,
          });
          if (gun)
            this.emit({
              type: "shot",
              from: { x: a.x, z: a.z, y: 1.4 },
              actor: target,
            });
        }
      });
    }
    if (s.time >= 10) {
      this.support = null;
      this.emit({ type: "extracted" });
    }
  }
  update(dt, input = {}, realDt = dt) {
    if (this.paused || this.mode === "menu" || !Number.isFinite(dt) || dt <= 0)
      return;
    this.time += dt;
    this.modeTime = (this.modeTime || 0) + dt;
    for (const e of this.enemies) {
      if (e.dead) e.deathTime += dt;
      e.flash = Math.max(0, e.flash - dt);
    }
    if (this.mode === "intro") {
      if (this.modeTime >= 4) this.spawnWave();
      return;
    }
    if (this.mode === "bossIntro") {
      if (this.modeTime >= 3) {
        this.mode = "boss";
        this.modeTime = 0;
      }
      return;
    }
    if (this.mode === "interlude") {
      if (this.modeTime >= 2.5) {
        this.hero.hp = Math.min(100, this.hero.hp + 30);
        this.level++;
        this.spawnWave();
      }
      return;
    }
    if (this.mode === "victory") {
      if (this.modeTime >= 8) this.mode = "won";
      return;
    }
    if (["lost", "won"].includes(this.mode)) return;
    this.updateSupport(realDt);
    const p = this.hero;
    if (this.cinematic) {
      const f = this.cinematic;
      f.time += dt;
      if (f.time >= 1.1 && !f.launched) {
        f.launched = true;
        this.emit({
          type: "rocket",
          from: { x: p.x, z: p.z, y: 1.5 },
          actor: f.target,
        });
      }
      if (f.time >= 2.1 && !f.impacted) {
        f.impacted = true;
        for (const e of this.enemies)
          if (!e.dead && distance(e, f.target) < 4)
            this.hit(e, e === f.target ? e.maxHp : 140, { passive: true });
        this.emit({ type: "explosion", actor: f.target });
      }
      if (f.time >= 2.8) this.cinematic = null;
      return;
    }
    this.hitStop = Math.max(0, this.hitStop - dt);
    if (this.hitStop > 0) return;
    p.cooldown = Math.max(0, p.cooldown - dt);
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (!this.comboTimer) this.combo = 0;
    const mx = Number(input.right || 0) - Number(input.left || 0),
      mz = Number(input.down || 0) - Number(input.up || 0),
      length = Math.hypot(mx, mz) || 1;
    p.blocking = !!input.guard;
    p.moving = !!(mx || mz);
    if (input.fatality) this.rocket();
    if (this.cinematic) return;
    if (input.dash && p.dashCooldown <= 0) {
      p.dash = 0.22;
      p.dashCooldown = 1.2;
      p.dashX = p.moving ? mx / length : Math.sin(p.yaw);
      p.dashZ = p.moving ? mz / length : Math.cos(p.yaw);
      p.dashHits = new Set();
      this.emit({ type: "dash", actor: p });
    }
    if (p.dash > 0) {
      p.dash = Math.max(0, p.dash - dt);
      p.x += p.dashX * 15 * dt;
      p.z += p.dashZ * 15 * dt;
      for (const e of this.enemies)
        if (!e.dead && distance(e, p) < 1.5 && !p.dashHits.has(e.id)) {
          p.dashHits.add(e.id);
          this.hit(e, 30);
        }
    } else {
      const speed = p.blocking ? 2 : 5;
      p.x += (mx / length) * speed * dt;
      p.z += (mz / length) * speed * dt;
      if (p.moving) p.yaw = Math.atan2(mx, mz);
    }
    p.x = clamp(p.x, -10, 10);
    p.z = clamp(p.z, -5.3, 5.3);
    if (p.moving) p.walk += dt * 11;
    if (input.punch && p.cooldown <= 0) {
      const target = this.target();
      if (target && distance(p, target) < 4)
        p.yaw = Math.atan2(target.x - p.x, target.z - p.z);
      p.attack = { time: 0, hit: false, kick: this.combo % 3 === 2 };
      p.cooldown = 0.36;
    }
    if (p.attack) {
      p.attack.time += dt;
      if (p.attack.time >= 0.12 && !p.attack.hit) {
        p.attack.hit = true;
        this.emit({ type: "swing", actor: p });
        for (const e of this.enemies) {
          const d = distance(e, p),
            forward =
              (e.x - p.x) * Math.sin(p.yaw) + (e.z - p.z) * Math.cos(p.yaw);
          if (!e.dead && d < (p.attack.kick ? 2.6 : 2.15) && forward > -0.2)
            this.hit(e, p.attack.kick ? 46 : 32);
        }
      }
      if (p.attack.time > 0.34) p.attack = null;
    }
    this.spawnTimer -= dt;
    if (
      this.mode === "wave" &&
      this.queue &&
      this.spawnTimer <= 0 &&
      this.enemies.filter((e) => !e.dead).length < 6 + this.level
    ) {
      this.spawnMob();
      this.spawnTimer = 0.9;
    }
    let windups = this.enemies.filter((e) => !e.dead && e.windup > 0).length;
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.cooldown = Math.max(0, e.cooldown - dt);
      e.stun = Math.max(0, e.stun - dt);
      e.guard = Math.max(0, e.guard - dt);
      e.moving = false;
      if (e.attack) {
        e.attack.time += dt;
        if (e.attack.time > 0.4) e.attack = null;
      }
      if (e.stun > 0) continue;
      const d = distance(e, p);
      e.yaw = Math.atan2(p.x - e.x, p.z - e.z);
      if (e.rush > 0) {
        e.yaw = e.rushYaw;
        e.rush -= dt;
        e.x = clamp(e.x + Math.sin(e.rushYaw) * 12 * dt, -11, 11);
        e.z = clamp(e.z + Math.cos(e.rushYaw) * 12 * dt, -5.7, 5.7);
        e.moving = true;
        e.walk += dt * 17;
        if (distance(e, p) < 1.6 && !e.rushHit) {
          this.hurt(e);
          e.rushHit = true;
        }
        continue;
      }
      if (e.windup > 0) {
        e.windup -= dt;
        if (e.windup <= 0) {
          e.attack = { time: 0, kick: e.attackKind === "heavy" };
          if (e.attackKind === "rush") {
            e.rush = 0.5;
            e.rushYaw = e.yaw;
            e.rushHit = false;
          } else if (d < 2.4) this.hurt(e);
          e.cooldown = e.boss ? 0.95 : e.heavy ? 1.4 : 1.2;
          if (e.kind === "boss1") e.guard = 0.5;
        }
        continue;
      }
      if (d > (e.boss ? 1.9 : 1.5)) {
        const speed = e.boss
          ? LEVELS[this.level].speed * (e.hp < e.maxHp / 2 ? 1.25 : 1)
          : e.heavy
            ? 2
            : 2.6;
        const stop = Math.max(0, d - 1.4),
          travel = Math.min(stop, speed * dt);
        e.x += ((p.x - e.x) / (d || 1)) * travel;
        e.z += ((p.z - e.z) / (d || 1)) * travel;
        e.moving = true;
        e.walk += dt * 10;
      } else if (e.cooldown <= 0 && (e.boss || windups < 2)) {
        e.attackCount++;
        e.attackKind =
          e.boss && this.level > 0 && e.attackCount % 3 === 0
            ? "rush"
            : e.attackCount % 2
              ? "punch"
              : "heavy";
        e.windup = e.boss ? 0.8 : 0.65;
        windups++;
        this.emit({ type: "warning", actor: e });
      }
    }
    this.enforceCircle();
    this.enemies = this.enemies.filter((e) => !e.dead || e.deathTime < 1.4);
    if (
      !this.enemies.some((e) => !e.dead) &&
      !(this.mode === "wave" && this.queue) &&
      !this.support
    ) {
      if (this.mode === "wave") this.spawnBoss();
      else {
        this.mode = this.level === 2 ? "victory" : "interlude";
        this.modeTime = 0;
        this.score += 600 * (this.level + 1);
        this.emit({ type: this.mode });
      }
    }
  }
}
