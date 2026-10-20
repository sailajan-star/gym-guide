import AsyncStorage from '@react-native-async-storage/async-storage';

import { PlanExercise } from './customPlan';
import { supabase } from './supabase';

export type Profile = Record<string, string>;
export type GuidedDay = { label: string; exercises: PlanExercise[] };
export type GuidedWeek = { note: string; days: GuidedDay[] };
export type GuidedPlan = {
  block: number;
  createdAt: string;
  profile: Profile;
  notes: string[];
  weeks: GuidedWeek[];
};

export type PlanOptions = {
  block?: number; // 1 for the first plan
  anchorShift?: boolean; // true = try new variations of the main lifts
  setsBonus?: number; // extra sets, used by the block review
};

type PoolExercise = {
  name: string;
  muscle_group: string;
  equipment: string;
  movement_pattern: string | null;
  difficulty: string | null;
  is_timed: boolean | null;
};

// ---------- Settings ----------

const ACCESS: Record<string, string[]> = {
  'Home, no equipment': ['bodyweight'],
  'Home with dumbbells and bands': ['bodyweight', 'dumbbell', 'resistance band', 'household'],
  'Full gym': ['bodyweight', 'dumbbell', 'machine', 'cable'],
  // answers saved by the old quiz
  'Dumbbells only': ['bodyweight', 'dumbbell'],
  'Bodyweight only': ['bodyweight'],
};
const HOME_TIERS = ['Home, no equipment', 'Home with dumbbells and bands', 'Dumbbells only', 'Bodyweight only'];
const HOME_AVOID = ['Dumbbell Bench Press']; // needs a bench

// Exercises left out when the user picks a limitation
const AVOID_BY_LIMITATION: Record<string, string[]> = {
  Knees: [
    'Reverse Lunge', 'Split Squat', 'Step-Up', 'Dumbbell Step-Up', 'Dumbbell Reverse Lunge',
    'Wall Sit', 'Leg Extension', 'Mountain Climber', 'Bodyweight Squat', 'Goblet Squat', 'Backpack Squat',
  ],
  'Lower back': ['Dumbbell Romanian Deadlift', 'Backpack Romanian Deadlift', 'Bodyweight Hip Hinge', 'Superman'],
  Shoulders: [
    'Dumbbell Shoulder Press', 'Machine Shoulder Press', 'Band Overhead Press', 'Dumbbell Lateral Raise',
    'Overhead Dumbbell Triceps Extension', 'Assisted Pull-Up Machine', 'Push-Up',
  ],
  Wrists: ['Push-Up', 'Knee Push-Up', 'Incline Push-Up', 'Plank', 'Side Plank', 'Bird Dog', 'Mountain Climber'],
};

const REPS_BY_GOAL: Record<string, { compound: string; accessory: string }> = {
  'Get stronger': { compound: '5-8', accessory: '8-10' },
  'Build muscle': { compound: '8-12', accessory: '10-15' },
  'Lose fat': { compound: '10-15', accessory: '12-15' },
  'Just get healthier': { compound: '8-12', accessory: '10-12' },
};

const REST_BY_GOAL: Record<string, string> = {
  'Get stronger': '2-3 minutes',
  'Build muscle': '90 seconds to 2 minutes',
  'Lose fat': '45-75 seconds',
  'Just get healthier': '60-90 seconds',
};

const SETS_BY_EXPERIENCE: Record<string, number[]> = {
  'Complete beginner': [2, 2, 3, 3],
  'Tried a few times': [2, 3, 3, 3],
  'A few months': [3, 3, 3, 4],
};
const HOLD_BY_EXPERIENCE: Record<string, string> = {
  'Complete beginner': '20-30 sec',
  'Tried a few times': '30-40 sec',
  'A few months': '40-60 sec',
};
const EXTRA_COUNT: Record<string, number> = {
  'Complete beginner': 0,
  'Tried a few times': 1,
  'A few months': 2,
};

const WEEK_NOTES = [
  'Learn the movements. Use light weights and stop with 2-3 reps left in the tank.',
  'Same exercises, steady effort. Add a little weight if the last session felt easy.',
  'Some exercises change this week, but your main lifts stay the same. Keep building.',
  'Last week of the block. Aim for your best form, then we will review how it went.',
];

const COMPOUND_PATTERNS = [
  'squat', 'hinge', 'lunge', 'horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull',
];
const PER_SIDE = [
  'Dead Bug', 'Bird Dog', 'Reverse Lunge', 'Split Squat', 'Step-Up', 'Dumbbell Step-Up',
  'Dumbbell Reverse Lunge', 'Single-Leg Glute Bridge',
];

// ---------- Slots ----------

type SlotDef = { patterns: string[]; prefer: string[] };

// "prefer" is the order we try exercises in. Any other exercise in the library
// with a matching movement pattern is added after, so new exercises join automatically.
const SLOTS: Record<string, SlotDef> = {
  squat: {
    patterns: ['squat'],
    prefer: ['Goblet Squat', 'Leg Press', 'Bodyweight Squat', 'Chair Squat', 'Backpack Squat', 'Wall Sit'],
  },
  hinge: {
    patterns: ['hinge'],
    prefer: [
      'Dumbbell Romanian Deadlift', 'Backpack Romanian Deadlift', 'Dumbbell Hip Thrust',
      'Dumbbell Glute Bridge', 'Glute Bridge', 'Bodyweight Hip Hinge', 'Single-Leg Glute Bridge',
    ],
  },
  hpush: {
    patterns: ['horizontal_push'],
    prefer: [
      'Dumbbell Bench Press', 'Chest Press Machine', 'Dumbbell Floor Press', 'Band Chest Press',
      'Incline Push-Up', 'Knee Push-Up', 'Wall Push-Up', 'Push-Up',
    ],
  },
  hpull: {
    patterns: ['horizontal_pull'],
    prefer: ['Seated Cable Row', 'Dumbbell Row', 'Band Row', 'Band Pull-Apart', 'Cable Face Pull'],
  },
  vpush: {
    patterns: ['vertical_push'],
    prefer: ['Dumbbell Shoulder Press', 'Machine Shoulder Press', 'Band Overhead Press'],
  },
  vpull: { patterns: ['vertical_pull'], prefer: ['Lat Pulldown', 'Assisted Pull-Up Machine'] },
  back: { patterns: ['back_extension'], prefer: ['Superman'] },
  coreA: {
    patterns: ['core'],
    prefer: ['Plank', 'Bicycle Crunch', 'Reverse Crunch', 'Side Plank', 'Mountain Climber'],
  },
  coreB: {
    patterns: ['core'],
    prefer: ['Dead Bug', 'Bird Dog', 'Pallof Press', 'Reverse Crunch'],
  },
  lunge: {
    patterns: ['lunge'],
    prefer: ['Reverse Lunge', 'Split Squat', 'Step-Up', 'Dumbbell Reverse Lunge', 'Dumbbell Step-Up'],
  },
  calves: { patterns: ['calves'], prefer: ['Standing Calf Raise', 'Dumbbell Calf Raise'] },
  biceps: { patterns: [], prefer: ['Dumbbell Curl', 'Hammer Curl', 'Band Curl', 'Cable Biceps Curl'] },
  triceps: {
    patterns: [],
    prefer: ['Triceps Pushdown', 'Overhead Dumbbell Triceps Extension', 'Band Triceps Pushdown'],
  },
  shoulders: { patterns: ['shoulders'], prefer: ['Dumbbell Lateral Raise'] },
};

// If a slot has nothing available (e.g. no vertical pull at home), try these instead
const FALLBACK: Record<string, string[]> = {
  vpush: ['hpush'],
  vpull: ['hpull', 'back'],
  hpull: ['back'],
};

// Main lifts stay the same within a block
const ANCHORS = ['squat', 'hinge', 'hpush', 'hpull', 'vpush', 'vpull'];

const EXTRAS: Record<string, { A: string[]; B: string[] }> = {
  'Build muscle': { A: ['biceps', 'lunge'], B: ['triceps', 'shoulders'] },
  default: { A: ['lunge', 'biceps'], B: ['calves', 'triceps'] },
};

// ---------- Picking exercises ----------

type Ctx = { pool: PoolExercise[]; equipment: string[]; levels: string[]; avoid: Set<string> };

function candidatesFor(slot: string, ctx: Ctx): PoolExercise[] {
  const def = SLOTS[slot];
  const ok = (e: PoolExercise) =>
    ctx.equipment.includes(e.equipment) &&
    ctx.levels.includes(e.difficulty ?? 'beginner') &&
    !ctx.avoid.has(e.name);

  const byName = new Map(ctx.pool.map((e) => [e.name, e]));
  const ordered: PoolExercise[] = [];
  for (const n of def.prefer) {
    const e = byName.get(n);
    if (e && ok(e)) ordered.push(e);
  }
  const extra = ctx.pool
    .filter(
      (e) =>
        e.movement_pattern !== null &&
        def.patterns.includes(e.movement_pattern) &&
        ok(e) &&
        !def.prefer.includes(e.name)
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...ordered, ...extra];
}

function pick(slot: string, offset: number, used: Set<string>, ctx: Ctx): PoolExercise | null {
  const list = candidatesFor(slot, ctx).filter((e) => !used.has(e.name));
  if (list.length > 0) return list[offset % list.length];
  for (const f of FALLBACK[slot] ?? []) {
    const e = pick(f, offset + 1, used, ctx);
    if (e) return e;
  }
  return null;
}

// ---------- Building the plan ----------

export function buildGuidedPlan(pool: PoolExercise[], profile: Profile, opts: PlanOptions = {}): GuidedPlan {
  const block = opts.block ?? 1;
  const bonus = opts.setsBonus ?? 0;

  const experience = SETS_BY_EXPERIENCE[profile.experience] ? profile.experience : 'Complete beginner';
  const goal = REPS_BY_GOAL[profile.goal] ? profile.goal : 'Just get healthier';
  const equipmentKey = ACCESS[profile.equipment] ? profile.equipment : 'Full gym';
  const daysPerWeek = Math.min(4, Math.max(2, parseInt(profile.days, 10) || 3));
  const limits = (profile.limitations ?? 'None')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== 'None');

  const avoid = new Set<string>();
  limits.forEach((l) => (AVOID_BY_LIMITATION[l] ?? []).forEach((n) => avoid.add(n)));
  if (HOME_TIERS.includes(equipmentKey)) HOME_AVOID.forEach((n) => avoid.add(n));

  const ctx: Ctx = {
    pool,
    equipment: ACCESS[equipmentKey],
    levels: experience === 'A few months' ? ['beginner', 'intermediate'] : ['beginner'],
    avoid,
  };

  const reps = REPS_BY_GOAL[goal];
  const compoundReps = goal === 'Get stronger' && experience === 'Complete beginner' ? '6-10' : reps.compound;
  const extrasMap = EXTRAS[goal] ?? EXTRAS.default;
  const extraCount = EXTRA_COUNT[experience];
  const hold = HOLD_BY_EXPERIENCE[experience];
  const perSide = experience === 'A few months' ? '10 per side' : '8 per side';
  const rest = REST_BY_GOAL[goal];

  const weeks: GuidedWeek[] = [];
  for (let w = 0; w < 4; w++) {
    const sets = Math.max(2, Math.min(4, SETS_BY_EXPERIENCE[experience][w] + bonus));
    const accessorySets = sets > 2 ? sets - 1 : sets;
    const anchorOffset = opts.anchorShift ? block - 1 : 0;
    const rotateOffset = block - 1 + (w >= 2 ? 1 : 0);

    const days: GuidedDay[] = [];
    for (let i = 0; i < daysPerWeek; i++) {
      const kind: 'A' | 'B' = (i + w) % 2 === 0 ? 'A' : 'B';
      const compounds = kind === 'A' ? ['squat', 'hpush', 'hpull'] : ['hinge', 'vpush', 'vpull'];
      const core = kind === 'A' ? 'coreA' : 'coreB';
      const slots = [...compounds, ...extrasMap[kind].slice(0, extraCount), core];

      const used = new Set<string>();
      const exercises: PlanExercise[] = [];
      for (const slot of slots) {
        const offset = ANCHORS.includes(slot) ? anchorOffset : rotateOffset;
        const e = pick(slot, offset, used, ctx);
        if (!e) continue;
        used.add(e.name);

        const compound = COMPOUND_PATTERNS.includes(e.movement_pattern ?? '');
        let r: string;
        if (e.is_timed) r = hold;
        else if (PER_SIDE.includes(e.name)) r = perSide;
        else if (e.equipment === 'bodyweight') r = '10-15';
        else if (e.equipment === 'resistance band') r = '12-15';
        else r = compound ? compoundReps : reps.accessory;

        exercises.push({
          name: e.name,
          sets: compound ? sets : accessorySets,
          reps: r,
          timed: e.is_timed ? true : undefined,
        });
      }

      if (exercises.length === 0) {
        throw new Error("We couldn't build a plan from those options. Try different answers.");
      }
      days.push({ label: `Day ${i + 1} · Workout ${kind}`, exercises });
    }
    weeks.push({ note: `${WEEK_NOTES[w]} Rest about ${rest} between sets.`, days });
  }

  const notes: string[] = [];
  const named = limits.filter((l) => l !== 'Something else');
  if (named.length > 0) {
    notes.push(
      `Built around: ${named.join(', ')}. We leave out exercises that often aggravate these. This is general guidance, not medical advice. If anything hurts, stop and see a doctor or physio.`
    );
  }
  if (limits.includes('Something else')) {
    notes.push(
      "You mentioned something else to work around. We can't tailor for that automatically, so please check with a doctor or physio before starting."
    );
  }
  if (equipmentKey === 'Home, no equipment' || equipmentKey === 'Bodyweight only') {
    notes.push('With no equipment, pulling exercises are limited. A resistance band opens up many more options.');
  }

  return { block, createdAt: new Date().toISOString(), profile, notes, weeks };
}

// ---------- Storage ----------

export async function loadPool(): Promise<PoolExercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('name, muscle_group, equipment, movement_pattern, difficulty, is_timed');
  if (error) throw new Error(error.message);
  return (data ?? []) as PoolExercise[];
}

export async function loadGuidedPlan(): Promise<GuidedPlan | null> {
  const v = await AsyncStorage.getItem('guidedPlan');
  return v ? JSON.parse(v) : null;
}

export async function createGuidedPlan(profile: Profile, opts: PlanOptions = {}): Promise<GuidedPlan> {
  const pool = await loadPool();
  if (!pool.some((e) => e.movement_pattern)) {
    throw new Error("The exercise library isn't tagged yet. Run the SQL script that adds movement patterns, then try again.");
  }
  const plan = buildGuidedPlan(pool, profile, opts);
  await AsyncStorage.setItem('guidedPlan', JSON.stringify(plan));
  await AsyncStorage.setItem('profile', JSON.stringify(profile));
  return plan;
}

// Used by exercise swaps: what this user's plan is allowed to contain
export function allowedFor(profile: Profile) {
  const equipmentKey = ACCESS[profile.equipment] ? profile.equipment : 'Full gym';
  const experience = SETS_BY_EXPERIENCE[profile.experience] ? profile.experience : 'Complete beginner';
  const avoid = new Set<string>();
  (profile.limitations ?? 'None')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== 'None')
    .forEach((l) => (AVOID_BY_LIMITATION[l] ?? []).forEach((n) => avoid.add(n)));
  if (HOME_TIERS.includes(equipmentKey)) HOME_AVOID.forEach((n) => avoid.add(n));
  return {
    equipment: ACCESS[equipmentKey],
    levels: experience === 'A few months' ? ['beginner', 'intermediate'] : ['beginner'],
    avoid,
  };
}