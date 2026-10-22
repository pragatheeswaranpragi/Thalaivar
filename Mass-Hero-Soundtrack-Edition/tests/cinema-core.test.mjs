import { test } from "node:test";
import assert from "node:assert/strict";
import { CinemaGame, LEVELS, ALLIES, distance } from "../cinema/game-core.mjs";
function fixture(id = "swetha") {
  const events = [],
    game = new CinemaGame({ emit: (e) => events.push(e), random: () => 0.5 });
  game.select(id);
  game.start();
  game.skip();
  game.update(0.025);
  return { game, events };
}
function advance(game, time, input = {}) {
  for (let left = time; left > 1e-8; ) {
    const dt = Math.min(0.025, left);
    game.update(dt, input);
    left -= dt;
  }
}
test("3D start requires exactly one valid cameo and preserves the chosen identity", () => {
  const g = new CinemaGame();
  assert.equal(g.start(), false);
  assert.equal(g.select("unknown"), false);
  for (const a of ALLIES) {
    assert(g.select(a.id));
    assert.equal(g.selected, a.id);
  }
  assert(g.start());
  assert.equal(g.mode, "intro");
});
test("3D campaign consumes all 54 minions before its three distinct bosses", () => {
  const { game } = fixture();
  let total = 0;
  for (let level = 0; level < 3; level++) {
    assert.equal(game.mode, "wave");
    const seen = new Set();
    game.hero.invulnerable = 10000;
    for (let i = 0; i < 4000 && game.mode === "wave"; i++) {
      for (const e of game.enemies) {
        if (!e.dead) {
          seen.add(e.id);
          game.hit(e, e.maxHp, { passive: true });
        }
      }
      game.update(0.05);
    }
    assert.equal(seen.size, LEVELS[level].count);
    total += seen.size;
    assert.equal(game.mode, "bossIntro");
    assert.equal(game.enemies[0].kind, "boss" + level);
    assert.equal(game.enemies[0].hp, LEVELS[level].hp);
    game.skip();
    game.update(0.025);
    assert.equal(game.mode, "boss");
    game.hit(game.enemies[0], game.enemies[0].maxHp);
    game.update(0.05);
    assert.equal(game.mode, level === 2 ? "victory" : "interlude");
    game.skip();
    game.update(0.05);
  }
  assert.equal(total, 54);
  assert.equal(game.mode, "won");
});
test("3D Swetha blocks mobs, enforces a circle, heals 60 and drains 25 each second", () => {
  const { game } = fixture();
  game.hero.hp = 20;
  game.enemies = [game.actor("grunt", game.hero.x + 0.2, game.hero.z)];
  const e = game.enemies[0];
  e.hp = e.maxHp = 1000;
  game.summon();
  advance(game, 0.975);
  assert.equal(e.hp, 1000);
  advance(game, 0.025);
  assert.equal(e.hp, 975);
  assert.equal(game.hero.hp, 26);
  assert(distance(e, game.hero) >= 3.29);
  game.hurt(e);
  assert.equal(game.hero.hp, 26);
  advance(game, 9);
  assert.equal(game.support, null);
  assert.equal(game.hero.hp, 80);
  assert.equal(e.hp, 750);
  game.hurt(e);
  assert.equal(game.hero.hp, 67);
});
test("3D pause freezes support, physics and choreography clocks", () => {
  const { game } = fixture();
  game.summon();
  game.update(0.1);
  const time = game.time,
    assist = game.support.time,
    x = game.hero.x;
  game.setPause(true);
  advance(game, 11, { right: true });
  assert.equal(game.time, time);
  assert.equal(game.support.time, assist);
  assert.equal(game.hero.x, x);
  game.setPause(false);
});
test("3D sniper kills three normal enemies in one shot and never a boss", () => {
  const { game } = fixture("narasimha");
  game.queue = 0;
  game.enemies = Array.from({ length: 4 }, (_, i) =>
    game.actor("grunt", i + 2, 0),
  );
  game.hero.invulnerable = 100;
  game.summon();
  advance(game, 1);
  assert.equal(game.enemies.filter((e) => e.dead).length, 3);
  assert.equal(game.enemies.filter((e) => !e.dead).length, 1);
  game.support = null;
  game.mode = "boss";
  game.enemies = [game.actor("boss", 2, 0)];
  const hp = game.enemies[0].hp;
  assert.equal(game.summon(), false);
  advance(game, 1);
  assert.equal(game.enemies[0].hp, hp);
});
test("3D rocket requires full energy, defeats the boss and resolves only once", () => {
  const { game, events } = fixture();
  game.spawnBoss();
  game.skip();
  game.update(0.025);
  assert.equal(game.rocket(), false);
  game.hero.energy = 100;
  assert(game.rocket());
  assert.equal(game.hero.energy, 0);
  assert.equal(game.rocket(), false);
  advance(game, 3);
  assert.equal(events.filter((e) => e.type === "explosion").length, 1);
  assert.equal(game.mode, "interlude");
});
test("3D guard earns energy, dash avoids hits, and movement stays on the floor", () => {
  const { game } = fixture();
  const enemy = game.enemies[0];
  game.hero.blocking = true;
  game.hurt(enemy);
  assert.equal(game.hero.hp, 100);
  assert.equal(game.hero.energy, 9);
  game.hero.invulnerable = 0;
  game.hero.blocking = false;
  game.hero.dash = 0.2;
  game.hurt(enemy);
  assert.equal(game.hero.hp, 100);
  game.hero.invulnerable = 100;
  advance(game, 20, { right: true, down: true });
  assert(game.hero.x <= 10 && game.hero.z <= 5.3);
});
test("3D checkpoint retry retains boss stage, level and cameo", () => {
  const { game } = fixture("pragi");
  game.level = 1;
  game.spawnBoss();
  game.mode = "lost";
  game.hero.hp = 0;
  game.start({ retry: true });
  assert.equal(game.level, 1);
  assert.equal(game.mode, "bossIntro");
  assert.equal(game.selected, "pragi");
  assert.equal(game.hero.hp, 100);
  assert.equal(game.enemies[0].kind, "boss1");
});
for (const id of ["mathew", "hrithik", "pragi"])
  test(
    "3D " + id + " deals temporary wave damage without attacking bosses",
    () => {
      const { game } = fixture(id);
      game.enemies = [game.actor("grunt", game.hero.x + 2, game.hero.z)];
      const enemy = game.enemies[0];
      enemy.hp = enemy.maxHp = 2000;
      game.hero.invulnerable = 100;
      assert(game.summon());
      advance(game, 2);
      assert(enemy.hp < 2000);
      game.spawnBoss();
      assert.equal(game.support, null);
      assert.equal(game.summon(), false);
    },
  );
