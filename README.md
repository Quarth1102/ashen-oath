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

- **Habits:** a *virtue* is either **Daily** (choose its penalty days and how many times per day it can be logged) or **Weekly** (a times-per-week target; any number of logs per day, each one counts as a session). A *vice* is something to resist: tap the skull when you give in.
- **No-penalty habits:** leave every penalty day unselected on a daily habit to make it optional. It still earns XP, but missing it never costs HP, which is handy while easing into something new.
- **Camp's "Today's deeds"** lists only what's left. Once-a-day habits disappear when done and return the next day. Repeatable habits drop to the bottom after a log.
- **Repeatable habits:** set *Times per day* (1, 2, 3, 5 or unlimited) on a daily habit to log it more than once a day. Each log earns full XP and gold. On a set day, one log is what avoids the penalty and keeps the streak, so extra logs are pure bonus. For weekly habits, each log counts as a session.
- **To-dos** are one-off tasks. **Goals** are quests made of milestones. Finishing a goal gives big XP and an optional title.
- **XP** is split across the stats a deed is tagged with. Your hero and each stat level up on their own curves. Daily streaks add up to +50% XP.
- **Classes are earned.** You start as a Wanderer, and at level 3 your class awakens from the stats you train most. A single dominant stat gives a pure class (Strength → Knight, Wisdom → Witch, and so on). Two close top stats give one of 15 hybrids, such as Strength + Discipline → Templar. Training everything evenly makes an Ashen Paragon. Your class is reassessed each new day and each level-up, adds a small XP bonus to its stats, and grants themed gear the first time you reach it. The thresholds are in `src/game/classes.ts`.
- **Gold** is half the XP you earn. Spend it in the Market on gear, which changes your sprite and adds a bonus to one stat's XP. Every deed has a 5% chance to drop a loot chest.
- **Penalties:** missed daily habits and giving in to vices cost HP. At 0 HP you *fall*: you lose 10% of your gold and the XP toward your next level, but never a level or a stat. You can turn penalties off in Settings.
- **Catch-up check-in:** when a new day starts with habits left unmarked, the app asks "Did you do these?" before applying any penalty. Ticked habits are credited on the day they belonged to, so you get the XP and keep the streak. Only the unticked ones cost HP. Weekly habits ask how many more sessions you did. You can switch this off in Settings.
- **Your hero lives at camp:** the Camp scene shows your hero doing something that fits your local time of day. They sleep by the embers late at night; at dawn, midday and evening they sit by the campfire with their tent; during the day they wander, fish at a pond or keep watch. The pick is random but stays the same for about 90 minutes. Add `?activity=camp` (or `fish`, `wander`, `sleep`, `watch`) to the URL to preview one. The schedule is in `src/game/activity.ts`.
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
