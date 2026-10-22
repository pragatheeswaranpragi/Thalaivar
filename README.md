# Mass Hero: Neon Reckoning — Bodhi Showdown

A browser arcade brawler starring Thalaivar against Bodhi Kalpak.

## Play

Serve the game directory with any static web server:

```sh
python3 -m http.server 8000 --directory Mass-Hero-Soundtrack-Edition
```

Choose **Fight Bodhi Kalpak** to face the animated boss immediately, or **Play 3-wave campaign** for the original street battles. Character animations must load before the fight starts; a failed download offers a retry instead of silently displaying a static character.

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
