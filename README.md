# Ashen Oath

A dark fantasy habit tracker. Build habits, finish to-dos, and complete goal quests to level up a pixel-art hero and the stats you choose.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # game-logic unit tests
npm run build    # production build + PWA service worker in dist/
```

**Hosting:** every push to `main` runs `.github/workflows/deploy.yml`, which tests, builds, and publishes to GitHub Pages at `https://<user>.github.io/ashen-oath/`. To install it on a phone, open that URL and choose "Add to Home Screen".

## How it plays

- **Habits:** a *virtue* is done on set days or X times a week. A *vice* is something to resist: tap the skull when you give in.
- **To-dos** are one-off tasks. **Goals** are quests made of milestones. Finishing a goal gives big XP and an optional title.
- **XP** is split across the stats a deed is tagged with. Your hero and each stat level up on their own curves. Daily streaks add up to +50% XP.
- **Gold** is half the XP you earn. Spend it in the Market on gear, which changes your sprite and adds a bonus to one stat's XP. Every deed has a 5% chance to drop a loot chest.
- **Penalties:** missed daily habits and giving in to vices cost HP. At 0 HP you *fall*: you lose 10% of your gold and the XP toward your next level, but never a level or a stat. You can turn penalties off in Settings.
- **Regions** unlock as you level: Ashen Hamlet (1), Gloomwood (5), Drowned Marsh (10), Bone Cathedral (20), Obsidian Peaks (35).

All data stays on your device (IndexedDB). Use Settings → Export to make a backup.

## Code map

| Path | What |
| --- | --- |
| `src/game/` | Pure game engine: XP, penalties, streaks, daily reset, market. Fully unit-tested. |
| `src/data/` | Classes, gear catalog, achievements, regions, default stats |
| `src/art/` | Procedural pixel art: layered hero sprite and parallax landscapes |
| `src/store/useGame.ts` | Zustand store persisted to IndexedDB |
| `src/components/`, `src/pages/` | UI |

All art is generated in code. To swap in hand-drawn pixel art, replace `renderHeroGrid` in `src/art/sprite.ts` or the layer functions in `src/art/landscape.ts`.
