import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadCustomExercises } from './customPlan';
import { supabase } from './supabase';

export type MuscleInfo = Record<string, { primary: string[]; secondary: string[] }>;
export type MuscleStat = { sets: number; last: Date; exercises: string[] };
type LogLike = { date: string; sets: { exercise: string }[] };

// Our stored muscle names -> the names the body diagram uses
const TO_BODY: Record<string, string> = {
  'front-deltoids': 'deltoids',
  'back-deltoids': 'deltoids',
  adductor: 'adductors',
  abductors: 'gluteal',
};

export function bodySlug(slug: string) {
  return TO_BODY[slug] ?? slug;
}

// Custom exercises only store a broad muscle group
const GROUP_TO_MUSCLES: Record<string, string[]> = {
  legs: ['quadriceps', 'gluteal'],
  glutes: ['gluteal'],
  hamstrings: ['hamstring'],
  calves: ['calves'],
  chest: ['chest'],
  back: ['upper-back'],
  shoulders: ['deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  core: ['abs'],
  cardio: [],
};

// Muscles that are only visible from one side of the diagram
const FRONT_ONLY = ['chest', 'abs', 'obliques', 'biceps', 'quadriceps', 'adductors'];
const BACK_ONLY = ['upper-back', 'lower-back', 'trapezius', 'gluteal', 'hamstring'];

export function autoSide(slugs: string[]): 'front' | 'back' {
  const front = slugs.filter((s) => FRONT_ONLY.includes(s)).length;
  const back = slugs.filter((s) => BACK_ONLY.includes(s)).length;
  return back > front ? 'back' : 'front';
}

// Areas we gently point out when they have not been trained this week
export const TRACKED = [
  'chest', 'upper-back', 'deltoids', 'biceps', 'triceps', 'abs', 'quadriceps', 'hamstring', 'gluteal', 'calves',
];

// Roughly the amount of weekly work that fills a muscle's colour. More is not better.
export const WEEKLY_TARGET = 10;

export function intensityFor(sets: number, target = WEEKLY_TARGET): number {
  if (sets <= 0) return 0;
  const f = sets / target;
  if (f >= 1) return 4;
  if (f >= 0.6) return 3;
  if (f >= 0.3) return 2;
  return 1;
}

const unique = (list: string[]) => Array.from(new Set(list));

let libraryCache: MuscleInfo | null = null;

export async function loadMuscleInfo(): Promise<MuscleInfo> {
  let base = libraryCache;
  if (!base) {
    base = {};
    const { data, error } = await supabase.from('exercises').select('name, primary_muscles, secondary_muscles');
    if (!error && data) {
      for (const d of data) {
        const primary = unique((d.primary_muscles ?? []).map(bodySlug));
        const secondary = unique((d.secondary_muscles ?? []).map(bodySlug)).filter((s) => !primary.includes(s));
        base[d.name] = { primary, secondary };
      }
      libraryCache = base;
      await AsyncStorage.setItem('muscleInfoCache', JSON.stringify(base));
    } else {
      const saved = await AsyncStorage.getItem('muscleInfoCache');
      if (saved) base = JSON.parse(saved);
    }
  }

  const info: MuscleInfo = { ...base };
  const customs = await loadCustomExercises();
  for (const c of customs) {
    info[c.name] = { primary: GROUP_TO_MUSCLES[c.muscle_group] ?? [], secondary: [] };
  }
  return info;
}

// Primary muscles count a full set, helping muscles count half
export function computeStats(logs: LogLike[], info: MuscleInfo, since: number): Record<string, MuscleStat> {
  const stats: Record<string, MuscleStat> = {};
  for (const log of logs) {
    const t = new Date(log.date).getTime();
    if (t < since) continue;
    for (const s of log.sets) {
      const m = info[s.exercise];
      if (!m) continue;
      const add = (slug: string, weight: number) => {
        if (!stats[slug]) stats[slug] = { sets: 0, last: new Date(t), exercises: [] };
        const st = stats[slug];
        st.sets += weight;
        if (t > st.last.getTime()) st.last = new Date(t);
        if (!st.exercises.includes(s.exercise)) st.exercises.push(s.exercise);
      };
      m.primary.forEach((p) => add(p, 1));
      m.secondary.forEach((p) => add(p, 0.5));
    }
  }
  return stats;
}

export function toMapData(stats: Record<string, MuscleStat>, target = WEEKLY_TARGET) {
  return Object.entries(stats)
    .map(([slug, st]) => ({ slug, intensity: intensityFor(st.sets, target) }))
    .filter((d) => d.intensity > 0);
}

// Muscles worked in a single workout, most-worked first
export function workoutMuscles(sets: { exercise: string }[], info: MuscleInfo) {
  const stats = computeStats([{ date: new Date().toISOString(), sets }], info, 0);
  return Object.entries(stats)
    .map(([slug, st]) => ({ slug, sets: st.sets }))
    .sort((a, b) => b.sets - a.sets);
}

// Main muscles bright, helping muscles lighter
export function exerciseMapData(primary: string[], secondary: string[]) {
  const map = new Map<string, number>();
  secondary.forEach((s) => map.set(bodySlug(s), 2));
  primary.forEach((s) => map.set(bodySlug(s), 4));
  return Array.from(map, ([slug, intensity]) => ({ slug, intensity }));
}