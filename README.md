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
- **Habits are split by schedule:** Daily (penalty days), Weekly (times per week), Anytime (no penalty) and Vices, on both the Habits tab and Today. Inside each, they're grouped by stat. Every section folds.
- **Organized by stat:** on Quests (and Camp's "Today's deeds"), quests are grouped into sections by their first tagged stat, with an Untagged section at the end. Tap a section header to fold it, and the app remembers. Habits can be **paused** from the editor: they move to a Paused section, leave Camp, and are never penalised, but keep their history and streak.
- **Repeatable habits:** set *Times per day* (1, 2, 3, 5 or unlimited) on a daily habit to log it more than once a day. Each log earns full XP and gold. On a set day, one log is what avoids the penalty and keeps the streak, so extra logs are pure bonus. For weekly habits, each log counts as a session.
- **To-dos** are one-off tasks. **Goals** are quests made of milestones. Finishing a goal gives big XP and an optional title.
- **Four pillars:** every habit, to-do and goal trains exactly one of **Body** (fitness, health, sleep, food), **Mind** (learning, focus, craft), **Spirit** (calm, reflection, faith, connection) or **Discipline** (self-control, routines, follow-through). Discipline also grows on its own: +10 on a perfect day, +15 at streak milestones, and +2 per clean day on a vice. Daily streaks add up to +50% XP.
- **Ranks are earned.** You start as a Wanderer, and at level 3 your rank awakens from the pillar you train most: Body → Knight, Mind → Mage, Spirit → Mystic, Discipline → Sentinel. Two close pillars give a hybrid: Spellblade (Body+Mind), Paladin (Body+Spirit), Templar (Body+Discipline), Oracle (Mind+Spirit), Runekeeper (Mind+Discipline) or Monk (Spirit+Discipline). All four in balance makes you The Chosen One. Your class is reassessed each new day and each level-up, adds a small XP bonus to its stats, and grants themed gear the first time you reach it. The thresholds are in `src/game/classes.ts`.
- **Gold** is half the XP you earn. Spend it on your camp. Every deed has a 5% chance to drop a loot chest of gold.
- **Gear is cosmetic and comes with your rank.** Your class decides your wardrobe: a Knight wears Knight gear, a Warden wears Warden gear, hybrids wear both parents', a Paragon wears anything, and everyone has the Traveller's basics. New pieces unlock automatically at levels 3, 8, 15 and 25. When your rank changes, the old rank's gear is put away. "Wear my rank's equipment" on the Hero page puts on the best set in one tap.
- **Penalties:** missed daily habits and giving in to vices cost HP. At 0 HP you *fall*: you lose 10% of your gold and the XP toward your next level, but never a level or a stat. You can turn penalties off in Settings.
- **Catch-up check-in:** when a new day starts with habits left unmarked, the app asks "Did you do these?" before applying any penalty. Ticked habits are credited on the day they belonged to, so you get the XP and keep the streak. Only the unticked ones cost HP. Weekly habits ask how many more sessions you did. You can switch this off in Settings.
- **Your hero lives at camp:** the Camp scene shows your hero doing something that fits your local time of day. They sleep stretched out on a bedroll by the embers late at night; at dawn, midday and evening they're busy around the campfire, switching every 15–30 seconds between warming their hands, tending the fire, polishing a blade, roasting supper, reading, sipping a brew, keeping watch and fussing over the pet (preview one with `?activity=camp&chore=cook`; the list is in `src/game/chores.ts`); during the day they travel the road side-on (the scenery scrolls past: villages, groves, ruins, shrines and signposts that fit the region), fish at a pond or keep watch. The pick is random but stays the same for about 90 minutes. Add `?activity=camp` (or `fish`, `wander`, `sleep`, `watch`) to the URL to preview one. The schedule is in `src/game/activity.ts`.
- **Daily Quests:** three quests are generated at each daily reset. One always targets your weakest pillar. One boosts one of your habits ("Walk 10,000 steps" becomes "Walk 15,000 steps"). The third comes from another lower pillar, either a fresh challenge or a tracked goal like "Complete 2 Mind deeds". Each gives XP to its pillar, and finishing all three earns a loot chest and bonus XP. You get one reroll a day, and there's no penalty for skipping.
- **Combos:** complete deeds within 5 minutes of each other to build a combo (shown in the HP/XP panel). Each step adds +5% XP, up to +25%, and the chime rises in pitch.
- **Perfect day:** finish every due habit to get +50 XP spread evenly across all your stats. The campfire flares and the day is sealed in gold on the calendar. Undoing a habit takes the bonus back.
- **Camp tab:** spend gold on tycoon-style upgrades (tent, hearth, banner, weapon rack, lanterns, fishing dock) that grant max HP, HP regen, gold or XP perks. Adopt a pet (raven, black cat, wolf pup) and customize tent colour, fire colour, and banner colour and sigil. Everything shows up in the home scene.
- **Weekly Chronicle:** when a new week starts, a recap shows last week's XP, deeds, perfect days, best day, stats trained, how each habit held up, and one suggestion. Past weeks live in Chronicle → Weeks.
- **Vacation mode** (Settings): no penalties, no check-ins and frozen streaks while you're away, optionally until a return date. Deeds still earn XP, and the camp sits empty until you return.
- **Feedback:** completing anything sends XP orbs flying to your XP bar, which shimmers when they land. Your hero leaps in a burst of sparks, the campfire swells with your combo, and the sky warms as the day fills up. Small notices (achievements, stat-ups, chests) merge into a single ticker line per action. Big moments (level up, new rank, new gear, perfect day) play as one stepped sequence.
- **Sound & feel:** synthesized sword chime, level-up arpeggio, perfect-day fanfare, ambient fire/water/wind/crickets that follow your hero's activity, and vibration on Android. Each can be toggled in Settings.
- **Regions** unlock as you level: Ashen Hamlet (1), Gloomwood (5), Drowned Marsh (10), Bone Cathedral (20), Obsidian Peaks (35).

All data stays on your device (IndexedDB). **Back it up** with Settings → Backup → "Save backup to iCloud / Files". On iPhone, pick *Save to Files → iCloud Drive*. Today shows a reminder if your last backup is a week old. To restore, or to move your hero to another device, use "Restore from a backup file" in Settings, or "Have a backup? Restore your hero" on the title screen of a fresh install.

## Code map

| Path | What |
| --- | --- |
| `src/game/` | Pure game engine: XP, penalties, streaks, daily reset, wardrobe. Fully unit-tested. |
| `src/data/` | Classes, gear catalog, achievements, regions, default stats |
| `src/art/` | Procedural pixel art: layered hero sprite and parallax landscapes |
| `src/store/useGame.ts` | Zustand store persisted to IndexedDB |
| `src/components/`, `src/pages/` | UI |

All art is generated in code. To swap in hand-drawn pixel art, replace `renderHeroGrid` in `src/art/sprite.ts` or the layer functions in `src/art/landscape.ts`.
