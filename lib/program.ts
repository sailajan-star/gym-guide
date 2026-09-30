export type PlannedExercise = { name: string; reps: string };
export type PlannedDay = { label: string; exercises: PlannedExercise[] };

const WORKOUTS: Record<string, { A: PlannedExercise[]; B: PlannedExercise[] }> = {
  'Full gym': {
    A: [
      { name: 'Leg Press', reps: '8-12' },
      { name: 'Dumbbell Bench Press', reps: '8-12' },
      { name: 'Seated Cable Row', reps: '8-12' },
      { name: 'Plank', reps: '20-30 sec' },
    ],
    B: [
      { name: 'Goblet Squat', reps: '8-12' },
      { name: 'Dumbbell Shoulder Press', reps: '8-12' },
      { name: 'Lat Pulldown', reps: '8-12' },
      { name: 'Dead Bug', reps: '8 per side' },
    ],
  },
  'Dumbbells only': {
    A: [
      { name: 'Goblet Squat', reps: '8-12' },
      { name: 'Dumbbell Bench Press', reps: '8-12' },
      { name: 'Dumbbell Row', reps: '8-12' },
      { name: 'Plank', reps: '20-30 sec' },
    ],
    B: [
      { name: 'Dumbbell Romanian Deadlift', reps: '8-12' },
      { name: 'Dumbbell Shoulder Press', reps: '8-12' },
      { name: 'Dumbbell Curl', reps: '10-12' },
      { name: 'Dead Bug', reps: '8 per side' },
    ],
  },
  'Bodyweight only': {
    A: [
      { name: 'Glute Bridge', reps: '10-15' },
      { name: 'Incline Push-Up', reps: '6-10' },
      { name: 'Plank', reps: '20-30 sec' },
    ],
    B: [
      { name: 'Glute Bridge', reps: '10-15' },
      { name: 'Incline Push-Up', reps: '6-10' },
      { name: 'Dead Bug', reps: '8 per side' },
    ],
  },
};

// Start gently, then build up
export const SETS_BY_WEEK = [2, 3, 3, 3];
export const WEEK_NOTES = [
  'Learn the movements. Use light weights and stop with 2-3 reps left in the tank.',
  'Same exercises, one extra set. Add a little weight if the last session felt easy.',
  'Keep building. If you hit all your reps with good form, go up slightly.',
  'Last week of the block. Aim for your best form, then we will review how it went.',
];

export function buildWeek(equipment: string, daysPerWeek: number, week: number): PlannedDay[] {
  const set = WORKOUTS[equipment] ?? WORKOUTS['Full gym'];
  const days: PlannedDay[] = [];
  for (let i = 0; i < daysPerWeek; i++) {
    // Alternate A/B, shifting each week so A and B get equal attention
    const isA = (i + week) % 2 === 0;
    days.push({
      label: `Day ${i + 1} · Workout ${isA ? 'A' : 'B'}`,
      exercises: isA ? set.A : set.B,
    });
  }
  return days;
}