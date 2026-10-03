import AsyncStorage from '@react-native-async-storage/async-storage';

export type PlanExercise = {
  name: string;
  sets: number;
  reps: string; // "10", "8-12" or "30 sec"
  custom?: boolean;
  timed?: boolean;
};
export type PlanDay = { name: string; exercises: PlanExercise[] };
export type CustomPlan = { name: string; days: PlanDay[] };

export type CustomExercise = {
  name: string;
  muscle_group: string;
  equipment: string;
  instructions: string;
  cues: string;
  is_timed: boolean;
};

export type PlanMode = 'guided' | 'custom';

export async function loadCustomExercises(): Promise<CustomExercise[]> {
  const v = await AsyncStorage.getItem('customExercises');
  return v ? JSON.parse(v) : [];
}

export async function saveCustomExercise(ex: CustomExercise) {
  const all = await loadCustomExercises();
  const next = [...all.filter((e) => e.name.toLowerCase() !== ex.name.toLowerCase()), ex];
  await AsyncStorage.setItem('customExercises', JSON.stringify(next));
}

export async function loadCustomPlan(): Promise<CustomPlan | null> {
  const v = await AsyncStorage.getItem('customPlan');
  return v ? JSON.parse(v) : null;
}

export async function saveCustomPlan(plan: CustomPlan) {
  await AsyncStorage.setItem('customPlan', JSON.stringify(plan));
}

export async function getPlanMode(): Promise<PlanMode> {
  const v = await AsyncStorage.getItem('planMode');
  return v === 'custom' ? 'custom' : 'guided';
}

export async function setPlanMode(mode: PlanMode) {
  await AsyncStorage.setItem('planMode', mode);
}