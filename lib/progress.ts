import AsyncStorage from '@react-native-async-storage/async-storage';

export type LoggedSet = { exercise: string; set: number; weight: string; reps: string };
export type WorkoutLog = { date: string; week: number; workout: string; sets: LoggedSet[] };
export type Metric = 'top' | 'est';
export type Kind = 'weight' | 'reps' | 'time';
export type Point = { date: Date; value: number };

// Exercises where the number logged is seconds, not reps
const TIMED_EXERCISES = ['Plank'];

const round1 = (n: number) => Math.round(n * 10) / 10;

export function unitFor(kind: Kind) {
  return kind === 'weight' ? 'kg' : kind === 'time' ? 'sec' : 'reps';
}

export function formatDate(d: Date) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatShort(d: Date) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export async function loadLogs(): Promise<WorkoutLog[]> {
  const real = await AsyncStorage.getItem('workoutLogs');
  const demo = await AsyncStorage.getItem('demoLogs');
  const logs: WorkoutLog[] = [...(real ? JSON.parse(real) : []), ...(demo ? JSON.parse(demo) : [])];
  return logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// One point per day per exercise
export function buildSeries(
  logs: WorkoutLog[],
  name: string,
  metric: Metric
): { points: Point[]; kind: Kind } {
  const relevant = logs.filter((l) => l.sets.some((s) => s.exercise === name));
  const allSets = relevant.flatMap((l) => l.sets.filter((s) => s.exercise === name));

  const kind: Kind = TIMED_EXERCISES.includes(name)
    ? 'time'
    : allSets.some((s) => (parseFloat(s.weight) || 0) > 0)
    ? 'weight'
    : 'reps';

  const byDay = new Map<string, Point>();
  for (const log of relevant) {
    const date = new Date(log.date);
    let best = 0;
    for (const s of log.sets) {
      if (s.exercise !== name) continue;
      const w = parseFloat(s.weight) || 0;
      const r = parseFloat(s.reps) || 0;
      // Estimated strength: weight x (1 + reps / 30)
      const v = kind === 'weight' ? (metric === 'est' ? w * (1 + r / 30) : w) : r;
      if (v > best) best = v;
    }
    if (best <= 0) continue;

    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const existing = byDay.get(key);
    if (!existing || best > existing.value) {
      byDay.set(key, { date: existing?.date ?? date, value: round1(best) });
    }
  }

  const points = Array.from(byDay.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  return { points, kind };
}

// ---------- Demo data (kept separate from real logs) ----------

const DEMO = [
  { name: 'Goblet Squat', base: 8, per: 0.45, kind: 'weight' },
  { name: 'Dumbbell Bench Press', base: 6, per: 0.4, kind: 'weight' },
  { name: 'Leg Press', base: 30, per: 1.6, kind: 'weight' },
  { name: 'Dumbbell Row', base: 8, per: 0.4, kind: 'weight' },
  { name: 'Glute Bridge', base: 10, per: 0.45, kind: 'reps' },
  { name: 'Plank', base: 20, per: 1.5, kind: 'time' },
];

function makeDemoLogs(): WorkoutLog[] {
  const sessions = 18;
  const logs: WorkoutLog[] = [];
  for (let n = 0; n < sessions; n++) {
    const date = new Date();
    date.setDate(date.getDate() - (sessions - 1 - n) * 3);
    date.setHours(18, 0, 0, 0);

    const sets: LoggedSet[] = [];
    DEMO.forEach((d, idx) => {
      for (let s = 1; s <= 3; s++) {
        if (d.kind === 'weight') {
          const weight = Math.round((d.base + d.per * n) * 2) / 2;
          const reps = 8 + ((n * 7 + idx * 3 + s) % 5); // 8 to 12
          sets.push({ exercise: d.name, set: s, weight: String(weight), reps: String(reps) });
        } else {
          const value = Math.round(d.base + d.per * n) - (s - 1);
          sets.push({ exercise: d.name, set: s, weight: '0', reps: String(value) });
        }
      }
    });
    logs.push({ date: date.toISOString(), week: Math.floor(n / 3) + 1, workout: 'Demo workout', sets });
  }
  return logs;
}

export async function hasDemo() {
  return (await AsyncStorage.getItem('demoLogs')) !== null;
}
export async function createDemo() {
  await AsyncStorage.setItem('demoLogs', JSON.stringify(makeDemoLogs()));
}
export async function clearDemo() {
  await AsyncStorage.removeItem('demoLogs');
}