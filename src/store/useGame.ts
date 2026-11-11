import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { del, get, set } from 'idb-keyval';
import * as E from '../game/engine';
import type { Ctx, GameEvent, GameState, Goal, Habit, Settings, Slot, StatDef, Todo, Hero } from '../game/types';

const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: (name, value) => set(name, value),
  removeItem: (name) => del(name),
};

const ctx = (): Ctx => ({ now: new Date(), rng: Math.random });

type ItemKind = 'habit' | 'todo' | 'goal';

interface Store extends GameState {
  events: GameEvent[];
  hydrated: boolean;
  run: (fn: (s: GameState, c: Ctx) => E.Result) => void;
  dismissEvent: (id: string) => void;

  createHero: (input: E.NewHeroInput) => void;
  updateHero: (patch: Partial<Pick<Hero, 'name' | 'title' | 'backstory' | 'appearance'>>) => void;

  saveHabit: (h: Habit) => void;
  saveTodo: (t: Todo) => void;
  saveGoal: (g: Goal) => void;
  deleteItem: (kind: ItemKind, id: string) => void;

  completeHabit: (id: string) => void;
  uncompleteHabit: (id: string) => void;
  slipHabit: (id: string) => void;
  undoSlip: (id: string) => void;
  completeTodo: (id: string) => void;
  uncompleteTodo: (id: string) => void;
  toggleMilestone: (goalId: string, msId: string) => void;
  toggleGoal: (goalId: string) => void;
  clearDoneTodos: () => void;

  processDay: () => void;
  resolveReview: (done: string[]) => void;

  buy: (itemId: string) => void;
  equip: (itemId: string) => void;
  unequip: (slot: Slot) => void;
  openChest: () => void;

  addStat: (def: Omit<StatDef, 'id'>) => void;
  updateStat: (id: string, patch: Partial<Omit<StatDef, 'id'>>) => void;
  removeStat: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;

  exportData: () => string;
  importData: (json: string) => boolean;
  resetAll: () => void;
}

const pickState = (s: Store): GameState => ({
  version: s.version, hero: s.hero, statDefs: s.statDefs, habits: s.habits, todos: s.todos, goals: s.goals,
  log: s.log, achievements: s.achievements, settings: s.settings, lastProcessedDay: s.lastProcessedDay, pendingReview: s.pendingReview ?? null,
  pendingChests: s.pendingChests, dayActivity: s.dayActivity, counters: s.counters,
});

const upsert = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

export const useGame = create<Store>()(
  persist(
    (setState, getState) => ({
      ...E.initialState(),
      events: [],
      hydrated: false,

      run: (fn) => {
        const { state, events } = fn(pickState(getState()), ctx());
        setState((prev) => ({ ...state, events: events.length ? [...prev.events, ...events] : prev.events }));
      },
      dismissEvent: (id) => setState((s) => ({ events: s.events.filter((e) => e.id !== id) })),

      createHero: (input) => getState().run((s, c) => E.createHero(s, input, c)),
      updateHero: (patch) => getState().run((s, c) => E.updateHero(s, patch, c)),

      saveHabit: (h) => setState((s) => ({ habits: upsert(s.habits, h) })),
      saveTodo: (t) => setState((s) => ({ todos: upsert(s.todos, t) })),
      saveGoal: (g) => setState((s) => ({ goals: upsert(s.goals, g) })),
      deleteItem: (kind, id) =>
        setState((s) =>
          kind === 'habit' ? { habits: s.habits.filter((x) => x.id !== id) }
            : kind === 'todo' ? { todos: s.todos.filter((x) => x.id !== id) }
              : { goals: s.goals.filter((x) => x.id !== id) },
        ),

      completeHabit: (id) => getState().run((s, c) => E.completeHabit(s, id, c)),
      uncompleteHabit: (id) => getState().run((s, c) => E.uncompleteHabit(s, id, c)),
      slipHabit: (id) => getState().run((s, c) => E.slipHabit(s, id, c)),
      undoSlip: (id) => getState().run((s, c) => E.undoSlip(s, id, c)),
      completeTodo: (id) => getState().run((s, c) => E.completeTodo(s, id, c)),
      uncompleteTodo: (id) => getState().run((s, c) => E.uncompleteTodo(s, id, c)),
      toggleMilestone: (g, m) => getState().run((s, c) => E.toggleMilestone(s, g, m, c)),
      toggleGoal: (g) => getState().run((s, c) => E.toggleGoal(s, g, c)),
      clearDoneTodos: () => setState((s) => ({ todos: s.todos.filter((t) => !t.done) })),

      processDay: () => getState().run((s, c) => E.processDay(s, c)),
      resolveReview: (done) => getState().run((s, c) => E.resolveReview(s, done, c)),

      buy: (id) => getState().run((s, c) => E.buyItem(s, id, c)),
      equip: (id) => getState().run((s, c) => E.equip(s, id, c)),
      unequip: (slot) => getState().run((s, c) => E.unequip(s, slot, c)),
      openChest: () => getState().run((s, c) => E.openChest(s, c)),

      addStat: (def) => getState().run((s, c) => E.addStat(s, def, c)),
      updateStat: (id, patch) => getState().run((s, c) => E.updateStat(s, id, patch, c)),
      removeStat: (id) => getState().run((s, c) => E.removeStat(s, id, c)),
      updateSettings: (patch) => setState((s) => ({ settings: { ...s.settings, ...patch } })),

      exportData: () => JSON.stringify(pickState(getState()), null, 2),
      importData: (json) => {
        try {
          const data = JSON.parse(json);
          if (!E.validateImport(data)) return false;
          setState({ ...E.initialState(), ...data, events: [] });
          return true;
        } catch {
          return false;
        }
      },
      resetAll: () => setState({ ...E.initialState(), events: [] }),
    }),
    {
      name: 'ashen-oath',
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => pickState(s),
      onRehydrateStorage: () => () => {
        useGame.setState({ hydrated: true });
      },
    },
  ),
);

/** Dev/testing hook: lets the browser console (and Playwright) poke at the store. */
if (typeof window !== 'undefined') (window as unknown as { __game: typeof useGame }).__game = useGame;
