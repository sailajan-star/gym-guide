import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadPlanState, StoredLog } from './activePlan';

const DAY = 24 * 60 * 60 * 1000;

// Testing only: logs fake workouts for the whole current guided block
export async function fillGuidedBlock() {
  const s = await loadPlanState();
  if (!s.guided) throw new Error('Build a guided plan first.');

  // Move the plan's start date back so the fake logs fall inside this block
  const g = { ...s.guided, createdAt: new Date(Date.now() - 35 * DAY).toISOString() };
  const start = new Date(g.createdAt).getTime();
  const perWeek = g.weeks[0].days.length;
  const logs: StoredLog[] = [...s.logs];

  let n = 0;
  for (let w = 0; w < 4; w++) {
    for (let d = 0; d < perWeek; d++) {
      const day = g.weeks[w].days[d];
      const sets: StoredLog['sets'] = [];
      day.exercises.forEach((e) => {
        for (let k = 1; k <= e.sets; k++) {
          if (e.timed) {
            sets.push({ exercise: e.name, set: k, weight: '0', reps: String(20 + w * 4 + k), timed: true });
          } else {
            sets.push({ exercise: e.name, set: k, weight: String(10 + w * 2.5), reps: '10' });
          }
        }
      });
      logs.push({
        date: new Date(start + (n + 1) * 2 * DAY).toISOString(),
        week: w + 1,
        workout: day.label,
        mode: 'guided',
        sets,
      });
      n++;
    }
  }

  await AsyncStorage.setItem('guidedPlan', JSON.stringify(g));
  await AsyncStorage.setItem('workoutLogs', JSON.stringify(logs));
}