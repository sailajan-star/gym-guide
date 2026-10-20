export const MUSCLE_LABELS: Record<string, string> = {
  trapezius: 'Upper traps',
  'upper-back': 'Upper back and lats',
  'lower-back': 'Lower back',
  deltoids: 'Shoulders',
  adductors: 'Inner thighs',
  chest: 'Chest',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearm: 'Forearms',
  'back-deltoids': 'Rear shoulders',
  'front-deltoids': 'Front shoulders',
  abs: 'Abs',
  obliques: 'Obliques',
  adductor: 'Inner thighs',
  hamstring: 'Hamstrings',
  quadriceps: 'Quads',
  abductors: 'Outer hips',
  calves: 'Calves',
  gluteal: 'Glutes',

};

export function muscleLabel(slug: string) {
  return MUSCLE_LABELS[slug] ?? slug;
}

export const PATTERN_WHY: Record<string, string> = {
  squat:
    'Squatting builds leg strength and teaches you to sit down and stand up with control, which helps in everyday life too.',
  hinge:
    'Hinging trains your glutes and hamstrings, the muscles that protect your back when you bend over and lift.',
  lunge:
    'Single-leg work builds balance and strength one side at a time, so neither leg falls behind.',
  horizontal_push: 'Pushing away from your chest builds your chest, front shoulders, and triceps.',
  vertical_push: 'Pressing overhead builds shoulder strength and teaches your core to stay steady.',
  horizontal_pull: 'Rowing balances out all the pushing and supports good posture.',
  vertical_pull: 'Pulling down builds your back and arms, and prepares you for pull-ups.',
  back_extension: 'Strengthening the muscles along your spine supports good posture.',
  core: 'A strong core keeps your spine steady during every other exercise.',
  arms: 'Direct arm work adds strength to your biceps and triceps.',
  shoulders: 'Shoulder work builds the rounded look and stability of your shoulders.',
  calves: 'Strong calves help with walking, running, and balance.',
  isolation: 'This move targets one muscle at a time, without needing much balance or technique.',
  cardio: 'Gentle cardio builds heart and lung fitness and helps your recovery.',
};