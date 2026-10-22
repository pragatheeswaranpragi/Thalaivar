# Mass Hero: Neon Reckoning — Three Boss Campaign

A browser arcade brawler starring Thalaivar against Bodhi Kalpak.

## Play

Serve the game with the included media-aware development server (byte-range requests keep the ending music and title video seekable):

```sh
python3 Mass-Hero-Soundtrack-Edition/serve.py --port 8000
```

Choose **Start 3-level campaign**, then select exactly one cameo before entering the continuous run:

1. **Dockyard wave → The Enforcer** — three street enemies, then the bearded fighter with running and heavy punches.
2. **Mill wave → Kalpak Brother** — five enemies, then the moustached fighter with rush attacks and a defensive guard. Dash attacks bypass his guard.
3. **Neon wave → Bodhi Kalpak** — six enemies, then the final boss with stronger attacks and an enraged phase.

Each boss has distinct reference-based action sprites. Waves, bosses, and levels advance automatically, with no menus or Next Level buttons between fights. In-arena titles, boss entrance zooms, letterboxing, impact pauses, knockout slow motion, and dash/rush trails connect the action while the music continues. Movement remains active during transitions. Defeat a boss to gain 30 health and carry your energy and score into the next wave. A defeat lets you retry the current wave or boss with full health and the score earned before that phase. **Restart** resets the campaign. **Quick duel: Bodhi Kalpak** retains the direct final-boss fight. Character animations must load before the fight starts; a failed download offers a retry instead of silently displaying a static character.

## Cameo support

Choose **Narasimha**, **Mathew**, **Hrithik**, or **Pragi** before each new game. Your selection remains through the continuous campaign; retries retain that ally.

- **Narasimha — Sniper Support:** off-screen shots instantly eliminate targeted normal enemies. Press **T**, tap **Target**, or click a normal enemy in the arena to set the sniper target.
- **Mathew — Vehicular Impact:** a heavy SUV drives across the arena, damaging groups in its lane.
- **Hrithik — Avatar Assault:** three female tactical companions pursue enemies with punches, kicks, and energy shots.
- **Pragi — Sonic Lightning:** broad shockwaves damage and stun normal enemies in range.

Press **C** or tap **Summon** for one assist per normal wave. Each assist stays for exactly **10 unpaused seconds**, independent of combat slow motion or impact pauses. The timer and charge are displayed beneath the arena. A fresh wave restores the summon charge. If an assist clears the wave early, it stays on station until its 10-second extraction before the boss arrives.

Cameos cannot be summoned during boss phases or transitions. Boss enemies are excluded from every cameo damage path, including AoE attacks and vehicle collisions. Thalaivar's existing rocket fatality remains separate and can still defeat bosses. Pausing or opening the restart selection screen freezes the assist clock; restarting or ending a run clears existing helpers.

## Final victory cinematic

After the last wave and Bodhi Kalpak are defeated, a 28.76-second victory sequence plays before the score screen: a sunglasses reveal, explosions, Thalaivar adjusting his glasses, a slow close-up, then the original **SUPER STAR / RAJINI** title-card segment from the supplied reference video.

The ending uses the uploaded video's original AAC audio track, including its embedded sound effects. Audio playback drives the visual timeline so the title card lands at the reference cut (23.37 seconds). Gameplay music pauses for the ending. **Pause** freezes both picture and music; **Skip cinematic** goes straight to results. Muting music keeps the visual sequence running, and reduced-motion mode uses steady framing and a static title treatment. If the browser blocks ending audio, **Play ending music** retries it; **Continue muted** is available as a fallback.

## Controls

- **WASD / arrows:** move.
- **Hold J / Space:** punch combos.
- **C:** summon the selected cameo in a normal enemy wave.
- **T:** cycle normal enemy targets for Narasimha.
- **K / Shift:** dash through an attack; contact deals damage.
- **Hold I:** guard punches and build special energy. Bodhi's crouching rush breaks guard; dash away when warned.
- **L / E** or **↓ → ↓ → R** at full energy: sunglasses-and-rocket fatality.
- **P / Escape:** pause.

Touch controls provide movement, punch, dash, guard, fatality, cameo summon, and sniper targeting. **Cinema** toggles camera effects, impact pauses, and knockout slow motion; these effects default off when reduced motion is requested.

## Vercel

Import this repository using the **Other** preset. The root `vercel.json` serves `Mass-Hero-Soundtrack-Edition` without an install or build command. If the existing Vercel project's Root Directory is already `Mass-Hero-Soundtrack-Edition`, the configuration inside that directory serves `.` instead. Both configurations request fresh HTML so a new deployment can load the current game and its versioned animation asset.

Pushing to GitHub updates the source. A live Vercel update still requires a successful deployment of that commit; this repository cannot authenticate or publish to a Vercel account by itself.

## Combat-rule tests

```sh
node --test Mass-Hero-Soundtrack-Edition/tests/*.test.cjs
```
