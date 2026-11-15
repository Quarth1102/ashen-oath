/**
 * All sounds are synthesised with Web Audio: no files, works offline.
 * Browsers only allow audio after a user gesture, so nothing plays until the first tap.
 */
import type { Activity } from '../game/activity';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let unlocked = false;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  return ctx;
}

/** Call from any user gesture; resumes the audio context (required on iOS). */
export function unlockAudio() {
  const a = audio();
  if (!a) return;
  if (a.state === 'suspended') a.resume().catch(() => {});
  if (!unlocked) {
    // a silent blip fully unlocks iOS
    const o = a.createOscillator();
    const g = a.createGain();
    g.gain.value = 0;
    o.connect(g).connect(master!);
    o.start();
    o.stop(a.currentTime + 0.01);
    unlocked = true;
  }
  listeners.forEach((l) => l());
}
const listeners = new Set<() => void>();
export const onUnlock = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export const isUnlocked = () => unlocked;

let noiseBuf: AudioBuffer | null = null;
function noise(a: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(a: AudioContext, out: AudioNode, freq: number, t: number, peak: number, decay: number, type: OscillatorType = 'sine', attack = 0.004) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  env(g, t, peak, attack, decay);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + attack + decay + 0.05);
}

/** Soft sword "shing": a short scrape, then a ringing blade. `step` raises the pitch (combos). */
export function playChime(step = 0) {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + 0.01;
  const base = 1046.5 * Math.pow(2, Math.min(step, 8) / 12); // C6, up a semitone per combo step
  // scrape: bright filtered noise sweeping up
  const n = a.createBufferSource();
  n.buffer = noise(a);
  const bp = a.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 6;
  bp.frequency.setValueAtTime(2500, t);
  bp.frequency.exponentialRampToValueAtTime(7000, t + 0.12);
  const ng = a.createGain();
  env(ng, t, 0.16, 0.01, 0.13);
  n.connect(bp).connect(ng).connect(master);
  n.start(t);
  n.stop(t + 0.2);
  // blade ring: inharmonic partials, like struck steel
  const ring = a.createGain();
  ring.gain.value = 0.5;
  ring.connect(master);
  [
    [1, 0.22, 1.4],
    [2.76, 0.08, 0.9],
    [5.4, 0.04, 0.5],
    [1.005, 0.12, 1.6], // slight detune shimmer
  ].forEach(([mul, peak, dec]) => tone(a, ring, base * mul, t + 0.05, peak, dec));
}

/** Level up: a rising harp-like arpeggio (D minor, climbing) with a soft shimmer pad. */
export function playLevelUp() {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + 0.02;
  const notes = [293.66, 349.23, 440, 587.33, 698.46, 880, 1174.66]; // D4 F4 A4 D5 F5 A5 D6
  notes.forEach((f, i) => {
    const at = t + i * 0.085;
    tone(a, master!, f, at, 0.16, 1.1, 'triangle', 0.003);
    tone(a, master!, f * 2, at, 0.04, 0.6, 'sine', 0.003);
  });
  // shimmer pad on the final chord
  const pad = a.createGain();
  env(pad, t + 0.55, 0.07, 0.25, 2.2);
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  pad.connect(lp).connect(master);
  [587.33, 698.46, 880].forEach((f) =>
    [-6, 6].forEach((cents) => {
      const o = a.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = cents;
      o.connect(pad);
      o.start(t + 0.55);
      o.stop(t + 3.1);
    }),
  );
}

/** Perfect day: a warm swelling chord with chimes on top. */
export function playPerfectDay() {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + 0.02;
  const pad = a.createGain();
  env(pad, t, 0.09, 0.6, 2.8);
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(600, t);
  lp.frequency.linearRampToValueAtTime(2600, t + 1.2);
  pad.connect(lp).connect(master);
  [220, 277.18, 329.63, 440].forEach((f) =>
    [-8, 8].forEach((c) => {
      const o = a.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = c;
      o.connect(pad);
      o.start(t);
      o.stop(t + 3.6);
    }),
  );
  [1318.5, 1661.2, 1975.5, 2637].forEach((f, i) => tone(a, master!, f, t + 0.4 + i * 0.16, 0.05, 1.4));
}

/* ───────────────────────────── haptics ───────────────────────────── */

export function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported (e.g. iOS) */
  }
}

/* ───────────────────────────── ambience ───────────────────────────── */

type Stop = () => void;

function loopNoise(a: AudioContext, out: AudioNode): AudioBufferSourceNode {
  const n = a.createBufferSource();
  n.buffer = noise(a);
  n.loop = true;
  n.connect(out);
  n.start();
  return n;
}

function crackle(a: AudioContext, out: GainNode, soft: boolean): Stop {
  // low roar of the flames
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = soft ? 260 : 420;
  const roar = a.createGain();
  roar.gain.value = soft ? 0.05 : 0.11;
  lp.connect(roar).connect(out);
  const src = loopNoise(a, lp);
  // pops and snaps at random
  let alive = true;
  const pop = () => {
    if (!alive) return;
    const t = a.currentTime;
    const n = a.createBufferSource();
    n.buffer = noise(a);
    const hp = a.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1200 + Math.random() * 3000;
    const g = a.createGain();
    env(g, t, (soft ? 0.05 : 0.14) * (0.4 + Math.random()), 0.001, 0.02 + Math.random() * 0.05);
    n.connect(hp).connect(g).connect(out);
    n.start(t, Math.random());
    n.stop(t + 0.1);
    setTimeout(pop, (soft ? 260 : 70) + Math.random() * (soft ? 900 : 380));
  };
  pop();
  return () => {
    alive = false;
    src.stop();
  };
}

function water(a: AudioContext, out: GainNode): Stop {
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 700;
  const g = a.createGain();
  g.gain.value = 0.09;
  // slow swell, like lapping water
  const lfo = a.createOscillator();
  const depth = a.createGain();
  lfo.frequency.value = 0.18;
  depth.gain.value = 0.05;
  lfo.connect(depth).connect(g.gain);
  lfo.start();
  lp.connect(g).connect(out);
  const src = loopNoise(a, lp);
  let alive = true;
  const plip = () => {
    if (!alive) return;
    const t = a.currentTime;
    const o = a.createOscillator();
    const pg = a.createGain();
    o.type = 'sine';
    const f = 500 + Math.random() * 700;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 2.2, t + 0.07);
    env(pg, t, 0.035, 0.005, 0.09);
    o.connect(pg).connect(out);
    o.start(t);
    o.stop(t + 0.15);
    setTimeout(plip, 1200 + Math.random() * 3200);
  };
  setTimeout(plip, 800);
  return () => {
    alive = false;
    src.stop();
    lfo.stop();
  };
}

function wind(a: AudioContext, out: GainNode): Stop {
  const bp = a.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.8;
  bp.frequency.value = 500;
  const lfo = a.createOscillator();
  const depth = a.createGain();
  lfo.frequency.value = 0.07;
  depth.gain.value = 260;
  lfo.connect(depth).connect(bp.frequency);
  lfo.start();
  const g = a.createGain();
  g.gain.value = 0.06;
  bp.connect(g).connect(out);
  const src = loopNoise(a, bp);
  return () => {
    src.stop();
    lfo.stop();
  };
}

function crickets(a: AudioContext, out: GainNode): Stop {
  let alive = true;
  const chirp = () => {
    if (!alive) return;
    const t = a.currentTime;
    const f = 4200 + Math.random() * 600;
    for (let i = 0; i < 3; i++) tone(a, out, f, t + i * 0.05, 0.012, 0.03);
    setTimeout(chirp, 700 + Math.random() * 1600);
  };
  chirp();
  return () => {
    alive = false;
  };
}

let ambientStop: Stop | null = null;
let ambientGain: GainNode | null = null;
let ambientKey = '';

/** Start (or switch) the ambient bed for an activity. Pass null to stop. */
export function setAmbient(activity: Activity | 'away' | null, volume = 0.6) {
  const a = audio();
  if (!a || !master) return;
  const key = activity ?? '';
  if (ambientGain) ambientGain.gain.setTargetAtTime(Math.max(0.0001, volume), a.currentTime, 0.3);
  if (key === ambientKey) return;
  // fade out the old bed
  if (ambientStop && ambientGain) {
    const stop = ambientStop;
    const g = ambientGain;
    g.gain.setTargetAtTime(0.0001, a.currentTime, 0.4);
    setTimeout(() => {
      stop();
      g.disconnect();
    }, 1600);
  }
  ambientStop = null;
  ambientGain = null;
  ambientKey = key;
  if (!activity) return;
  const g = a.createGain();
  g.gain.value = 0.0001;
  g.connect(master);
  g.gain.setTargetAtTime(Math.max(0.0001, volume), a.currentTime, 0.8);
  const stops: Stop[] = [];
  switch (activity) {
    case 'camp':
    case 'watch':
      stops.push(crackle(a, g, false));
      break;
    case 'sleep':
      stops.push(crackle(a, g, true), crickets(a, g));
      break;
    case 'fish':
      stops.push(water(a, g));
      break;
    case 'wander':
    case 'away':
      stops.push(wind(a, g));
      break;
  }
  ambientStop = () => stops.forEach((s) => s());
  ambientGain = g;
}
