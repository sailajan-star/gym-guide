import AsyncStorage from '@react-native-async-storage/async-storage';

import { CustomPlan, loadCustomPlan, PlanExercise, PlanMode } from './customPlan';
import { GuidedPlan, loadGuidedPlan, Profile } from './program';

export type { Profile } from './program';

export type StoredLog = {
  date: string;
  week: number;
  workout: string;
  mode?: PlanMode; // old logs have no mode and count as guided
  sets: { exercise: string; set: number; weight: string; reps: string; timed?: boolean }[];
};

export type WorkoutExercise = PlanExercise;

export type Workout = {
  mode: PlanMode;
  week: number; // guided only
  day: number;
  title: string;
  exercises: WorkoutExercise[];
};

export type PlanState = {
  mode: PlanMode | null; // the active plan, or null if nothing is set up
  profile: Profile | null;
  guided: GuidedPlan | null;
  custom: CustomPlan | null;
  logs: StoredLog[];
};

export async function loadPlanState(): Promise<PlanState> {
  const [p, m, l, guided, custom] = await Promise.all([
    AsyncStorage.getItem('profile'),
    AsyncStorage.getItem('planMode'),
    AsyncStorage.getItem('workoutLogs'),
    loadGuidedPlan(),
    loadCustomPlan(),
  ]);
  const profile: Profile | null = p ? JSON.parse(p) : null;
  const logs: StoredLog[] = l ? JSON.parse(l) : [];

  let mode: PlanMode | null = null;
  if (m === 'custom' && custom) mode = 'custom';
  else if (m !== 'custom' && guided) mode = 'guided';
  else if (custom) mode = 'custom';
  else if (guided) mode = 'guided';

  return { mode, profile, guided, custom, logs };
}

// Logs that belong to the current guided block
export function guidedLogs(state: PlanState): StoredLog[] {
  if (!state.guided) return [];
  const start = new Date(state.guided.createdAt).getTime();
  return state.logs.filter(
    (l) => (l.mode ?? 'guided') === 'guided' && new Date(l.date).getTime() >= start
  );
}

export function guidedWorkout(plan: GuidedPlan, week: number, day: number): Workout | null {
  const d = plan.weeks[week]?.days[day];
  if (!d) return null;
  return { mode: 'guided', week, day, title: d.label, exercises: d.exercises };
}

export function customWorkout(plan: CustomPlan, day: number): Workout | null {
  const d = plan.days[day];
  if (!d) return null;
  return { mode: 'custom', week: 0, day, title: d.name, exercises: d.exercises };
}

export async function getWorkout(mode: PlanMode, week: number, day: number): Promise<Workout | null> {
  const s = await loadPlanState();
  if (mode === 'custom') return s.custom ? customWorkout(s.custom, day) : null;
  return s.guided ? guidedWorkout(s.guided, week, day) : null;
}

export function totalSets(w: Workout) {
  return w.exercises.reduce((n, e) => n + e.sets, 0);
}

export type HomeSummary = {
  mode: PlanMode;
  planName: string;
  subtitle: string;
  completed: number;
  finished: boolean;
  next: Workout | null;
  kicker: string;
  periodLabel: string;
  periodDone: number;
  periodTotal: number;
  noteLabel: string;
  note: string;
  statLabel: string;
  statValue: string;
  statSuffix: string;
};

export function getHomeSummary(state: PlanState): HomeSummary | null {
  if (state.mode === 'custom' && state.custom) {
    const plan = state.custom;
    const n = plan.days.length;
    const completed = state.logs.filter((l) => l.mode === 'custom').length;
    const dayIdx = completed % n;
    const cycle = Math.floor(completed / n) + 1;
    return {
      mode: 'custom',
      planName: plan.name,
      subtitle: plan.name,
      completed,
      finished: false,
      next: customWorkout(plan, dayIdx),
      kicker: `UP NEXT · DAY ${dayIdx + 1} OF ${n}`,
      periodLabel: 'This cycle',
      periodDone: dayIdx,
      periodTotal: n,
      noteLabel: 'YOUR PLAN',
      note: `You're following ${plan.name}. When you finish the last day, it starts again from Day 1.`,
      statLabel: 'CURRENT CYCLE',
      statValue: String(cycle),
      statSuffix: '',
    };
  }

  if (state.mode === 'guided' && state.guided) {
    const g = state.guided;
    const days = g.weeks[0].days.length;
    const completed = guidedLogs(state).length;
    const finished = completed >= days * 4;
    const weekIdx = Math.min(Math.floor(completed / days), 3);
    const dayIdx = completed % days;
    return {
      mode: 'guided',
      planName: g.block > 1 ? `Guided plan · Block ${g.block}` : 'Guided plan',
      subtitle: `${g.block > 1 ? `Block ${g.block} · ` : ''}Goal: ${g.profile.goal}`,
      completed,
      finished,
      next: finished ? null : guidedWorkout(g, weekIdx, dayIdx),
      kicker: `UP NEXT · WEEK ${weekIdx + 1} OF 4`,
      periodLabel: 'This week',
      periodDone: finished ? days : dayIdx,
      periodTotal: days,
      noteLabel: "THIS WEEK'S FOCUS",
      note: g.weeks[weekIdx].note,
      statLabel: 'CURRENT WEEK',
      statValue: String(weekIdx + 1),
      statSuffix: '/ 4',
    };
  }

  return null;
}

// Everything the coach needs to know about the user's plan
export async function getCoachContext() {
  const s = await loadPlanState();
  const summary = getHomeSummary(s);
  if (!s.mode || !summary) return { note: 'The user has not set up a plan yet.' };

  const modeLogs = s.mode === 'guided' ? guidedLogs(s) : s.logs.filter((l) => l.mode === 'custom');
  const last = modeLogs[modeLogs.length - 1];

  const base = {
    planType: s.mode,
    planName: summary.planName,
    workoutsCompleted: summary.completed,
    nextWorkout: summary.next
      ? {
          title: summary.next.title,
          exercises: summary.next.exercises.map((e) => ({
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            userAddedExercise: !!e.custom,
          })),
        }
      : null,
    lastWorkout: last ? { workout: last.workout, sets: last.sets } : null,
  };

  if (s.mode === 'guided' && s.guided) {
    return {
      ...base,
      // limitations are deliberately left out of what the coach sees
      profile: { ...s.guided.profile, limitations: undefined },
      block: s.guided.block,
      programWeek: summary.next ? summary.next.week + 1 : 4,
      weekFocus: summary.note,
    };
  }
  return { ...base, daysInCycle: s.custom?.days.length };
}