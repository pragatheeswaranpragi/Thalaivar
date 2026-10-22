# Mass Hero: Neon Reckoning — Three Boss Campaign

A browser arcade brawler starring Thalaivar against Bodhi Kalpak.

## Play

Serve the game directory with any static web server:

```sh
python3 -m http.server 8000 --directory Mass-Hero-Soundtrack-Edition
```

Choose **Start 3-level campaign** for one continuous run:

1. **Dockyard wave → The Enforcer** — three street enemies, then the bearded fighter with running and heavy punches.
2. **Mill wave → Kalpak Brother** — five enemies, then the moustached fighter with rush attacks and a defensive guard. Dash attacks bypass his guard.
3. **Neon wave → Bodhi Kalpak** — six enemies, then the final boss with stronger attacks and an enraged phase.

Each boss has distinct reference-based action sprites. Waves, bosses, and levels advance automatically, with no menus or Next Level buttons between fights. In-arena titles, boss entrance zooms, letterboxing, impact pauses, knockout slow motion, and dash/rush trails connect the action while the music continues. Movement remains active during transitions. Defeat a boss to gain 30 health and carry your energy and score into the next wave. A defeat lets you retry the current wave or boss with full health and the score earned before that phase. **Restart** resets the campaign. **Quick duel: Bodhi Kalpak** retains the direct final-boss fight. Character animations must load before the fight starts; a failed download offers a retry instead of silently displaying a static character.

## Controls

- **WASD / arrows:** move.
- **Hold J / Space:** punch combos.
- **K / Shift:** dash through an attack; contact deals damage.
- **Hold I:** guard punches and build special energy. Bodhi's crouching rush breaks guard; dash away when warned.
- **L / E** or **↓ → ↓ → R** at full energy: sunglasses-and-rocket fatality.
- **P / Escape:** pause.

Touch controls provide movement, punch, dash, guard, and fatality. **Cinema** toggles camera effects, impact pauses, and knockout slow motion; these effects default off when reduced motion is requested.

## Vercel

Import this repository using the **Other** preset. The root `vercel.json` serves `Mass-Hero-Soundtrack-Edition` without an install or build command. If the existing Vercel project's Root Directory is already `Mass-Hero-Soundtrack-Edition`, the configuration inside that directory serves `.` instead. Both configurations request fresh HTML so a new deployment can load the current game and its versioned animation asset.

Pushing to GitHub updates the source. A live Vercel update still requires a successful deployment of that commit; this repository cannot authenticate or publish to a Vercel account by itself.
