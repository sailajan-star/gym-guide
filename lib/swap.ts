import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadCustomPlan, PlanExercise, PlanMode, saveCustomPlan } from './customPlan';
import { allowedFor, GuidedPlan, Profile } from './program';
import { supabase } from './supabase';

export type SwapOption = {
  name: string;
  muscle_group: string;
  equipment: string;
  timed: boolean;
  suggested: boolean;
};

type Row = {
  name: string;
  muscle_group: string;
  equipment: string;
  movement_pattern: string | null;
  difficulty: string | null;
  is_timed: boolean | null;
  alternatives: string[] | null;
};

// Like-for-like replacements for an exercise
export async function loadSwapOptions(
  current: string,
  inWorkout: string[],
  profile: Profile | null,
  freeWeightsOnly: boolean
): Promise<{ options: SwapOption[]; error?: string }> {
  const { data, error } = await supabase
    .from('exercises')
    .select('name, muscle_group, equipment, movement_pattern, difficulty, is_timed, alternatives');
  if (error) return { options: [], error: error.message };

  const rows = (data ?? []) as Row[];
  const cur = rows.find((r) => r.name === current);
  if (!cur || !cur.movement_pattern) {
    return { options: [], error: 'No like-for-like swaps are set up for this exercise yet.' };
  }

  const allowed = profile ? allowedFor(profile) : null;
  const suggestedNames = cur.alternatives ?? [];

  const options = rows
    .filter((r) => r.name !== current && !inWorkout.includes(r.name))
    .filter((r) => r.movement_pattern === cur.movement_pattern || suggestedNames.includes(r.name))
    .filter((r) => !freeWeightsOnly || (r.equipment !== 'machine' && r.equipment !== 'cable'))
    .filter(
      (r) =>
        !allowed ||
        (allowed.equipment.includes(r.equipment) &&
          allowed.levels.includes(r.difficulty ?? 'beginner') &&
          !allowed.avoid.has(r.name))
    )
    .map((r) => ({
      name: r.name,
      muscle_group: r.muscle_group,
      equipment: r.equipment,
      timed: !!r.is_timed,
      suggested: suggestedNames.includes(r.name),
    }))
    .sort((a, b) => Number(b.suggested) - Number(a.suggested) || a.name.localeCompare(b.name));

  return { options };
}

// Sets and reps for the exercise that replaces another
export function repsFor(old: PlanExercise, next: { timed: boolean; equipment: string }): string {
  if (next.timed) return old.timed ? old.reps : '30 sec';
  if (old.timed) return '10';
  if (next.equipment === 'bodyweight') {
    const m = old.reps.match(/^(\d+)/);
    if (m && parseInt(m[1], 10) < 8) return '10-15';
  }
  return old.reps;
}

// Saves a swap into the stored plan, for every remaining workout that contains the old exercise
export async function applySwap(args: {
  mode: PlanMode;
  week: number;
  day: number;
  oldName: string;
  next: PlanExercise;
  equipment: string;
}) {
  const { mode, week, day, oldName, next, equipment } = args;

  const swapIn = (e: PlanExercise): PlanExercise => ({
    name: next.name,
    sets: e.sets,
    reps: repsFor(e, { timed: !!next.timed, equipment }),
    timed: next.timed || undefined,
  });

  if (mode === 'guided') {
    const raw = await AsyncStorage.getItem('guidedPlan');
    if (!raw) return;
    const plan: GuidedPlan = JSON.parse(raw);
    plan.weeks.forEach((w, wi) =>
      w.days.forEach((d, di) => {
        if (wi < week || (wi === week && di < day)) return; // leave earlier workouts alone
        d.exercises = d.exercises.map((e) => (e.name === oldName ? swapIn(e) : e));
      })
    );
    await AsyncStorage.setItem('guidedPlan', JSON.stringify(plan));
  } else {
    const plan = await loadCustomPlan();
    if (!plan) return;
    plan.days.forEach((d) => {
      d.exercises = d.exercises.map((e) => (e.name === oldName ? swapIn(e) : e));
    });
    await saveCustomPlan(plan);
  }
}