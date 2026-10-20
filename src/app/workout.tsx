import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';

import ExerciseInfo, { ExerciseDetail } from '@/components/ExerciseInfo';
import MuscleMap from '@/components/MuscleMap';
import SwapModal, { SwapScope } from '@/components/SwapModal';
import { labelStyle, useTheme } from '@/constants/app-theme';
import {
  customWorkout,
  guidedWorkout,
  loadPlanState,
  Profile,
  StoredLog,
  Workout,
  WorkoutExercise,
} from '../../lib/activePlan';
import { loadCustomExercises } from '../../lib/customPlan';
import { autoSide, intensityFor, loadMuscleInfo, workoutMuscles } from '../../lib/muscleData';
import { muscleLabel } from '../../lib/muscles';
import { formatShort } from '../../lib/progress';
import { supabase } from '../../lib/supabase';
import { applySwap, repsFor, SwapOption } from '../../lib/swap';

type Detail = ExerciseDetail;
type LoggedSet = StoredLog['sets'][number];
type LastTime = { sets: LoggedSet[]; date: string };
type Suggestion = { text: string; weight?: string };

const DETAIL_COLUMNS =
  'name, instructions, cues, mistakes, breathing, primary_muscles, secondary_muscles, alternatives, movement_pattern, difficulty, equipment';

function toDetail(d: any): Detail {
  return {
    instructions: d.instructions,
    cues: d.cues,
    mistakes: d.mistakes,
    breathing: d.breathing,
    primary: d.primary_muscles ?? [],
    secondary: d.secondary_muscles ?? [],
    alternatives: d.alternatives ?? [],
    pattern: d.movement_pattern,
    difficulty: d.difficulty,
    equipment: d.equipment,
  };
}

// Rest between sets, in seconds, by goal (guided plans). Custom plans use 90.
const REST_BY_GOAL: Record<string, number> = {
  'Get stronger': 150,
  'Build muscle': 105,
  'Lose fat': 60,
  'Just get healthier': 75,
};

function clock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Works out which exercise and set we are on from the number of sets logged
function locate(exs: WorkoutExercise[], count: number) {
  let remaining = count;
  for (let i = 0; i < exs.length; i++) {
    if (remaining < exs[i].sets) return { exIndex: i, setIndex: remaining, done: false };
    remaining -= exs[i].sets;
  }
  return { exIndex: exs.length - 1, setIndex: exs[exs.length - 1].sets, done: true };
}

function parseTarget(reps: string): { min: number; max: number } | null {
  const range = reps.match(/(\d+)\s*-\s*(\d+)/);
  if (range) return { min: parseInt(range[1], 10), max: parseInt(range[2], 10) };
  const single = reps.match(/(\d+)/);
  if (single) {
    const n = parseInt(single[1], 10);
    return { min: n, max: n };
  }
  return null;
}

// Double progression: reach the top of the rep range on every set, then add a little weight
function suggest(last: LoggedSet[], target: string, timed?: boolean): Suggestion | null {
  const t = parseTarget(target);
  if (!t || last.length === 0) return null;

  const allTop = last.every((s) => (parseFloat(s.reps) || 0) >= t.max);
  const lastWeight = Math.max(...last.map((s) => parseFloat(s.weight) || 0));

  if (timed) {
    return allTop
      ? { text: `You reached ${t.max} sec on every set. If it felt controlled, try ${t.max + 5} sec.` }
      : { text: `Aim for ${t.max} sec on every set.` };
  }

  if (lastWeight > 0) {
    if (allTop) {
      const step = lastWeight < 10 ? 1 : lastWeight < 40 ? 2.5 : 5;
      const next = Math.round((lastWeight + step) * 2) / 2;
      return {
        text: `You hit ${t.max} reps on every set at ${lastWeight}kg. If your form stayed solid, try ${next}kg.`,
        weight: String(next),
      };
    }
    return {
      text: `Stay at ${lastWeight}kg and aim for ${t.max} reps on every set before going heavier.`,
      weight: String(lastWeight),
    };
  }

  return allTop
    ? { text: `You hit ${t.max} reps on every set. Try an extra rep or two, or a harder variation, if your form stays good.` }
    : { text: `Aim for ${t.max} reps on every set.` };
}

// What the weight and reps boxes should start as for the next set
function prefill(
  exs: WorkoutExercise[],
  arr: LoggedSet[],
  last: Record<string, LastTime>
): { weight: string; reps: string } {
  const loc = locate(exs, arr.length);
  if (loc.done) return { weight: '', reps: '' };
  const ex = exs[loc.exIndex];
  const mine = arr.filter((x) => x.exercise === ex.name);
  if (mine.length > 0) {
    const l = mine[mine.length - 1];
    return { weight: ex.timed ? '' : l.weight, reps: l.reps };
  }
  const l = last[ex.name];
  if (l) return { weight: ex.timed ? '' : l.sets[l.sets.length - 1].weight, reps: '' };
  return { weight: '', reps: '' };
}

export default function WorkoutScreen() {
  const { palette, mode: themeMode } = useTheme();
  const label = labelStyle(palette);
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; week?: string; day?: string }>();
  const planMode = params.mode === 'custom' ? 'custom' : 'guided';
  const weekIndex = parseInt(params.week ?? '0', 10) || 0;
  const dayIndex = parseInt(params.day ?? '0', 10) || 0;
  const storageKey = `${planMode}-${weekIndex}-${dayIndex}`;

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [lastTime, setLastTime] = useState<Record<string, LastTime>>({});
  const [restDefault, setRestDefault] = useState(90);
  const [guidedProfile, setGuidedProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [logged, setLogged] = useState<LoggedSet[]>([]);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [resumed, setResumed] = useState(false);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const [summary, setSummary] = useState({ sets: 0, minutes: 0 });
  const [worked, setWorked] = useState<{ slug: string; sets: number }[]>([]);
  const [reveal, setReveal] = useState(0);

  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(0);
  const [now, setNow] = useState(Date.now());

  const inputStyle = {
    color: palette.text,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    padding: 16,
    fontSize: 20,
    marginBottom: 14,
  } as const;

  // One-second clock, used for the rest timer and the workout duration
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Rest finished
  useEffect(() => {
    if (restEnd && now >= restEnd) {
      Vibration.vibrate(500);
      setRestEnd(null);
    }
  }, [now, restEnd]);

  // Light up the muscles one by one on the finish screen
  useEffect(() => {
    if (!finished) return;
    setReveal(0);
    const id = setInterval(() => {
      setReveal((r) => {
        if (r >= worked.length) {
          clearInterval(id);
          return r;
        }
        return r + 1;
      });
    }, 450);
    return () => clearInterval(id);
  }, [finished, worked.length]);

  // Load the workout, form guides, history and any saved progress
  useEffect(() => {
    async function load() {
      const s = await loadPlanState();
      const w =
        planMode === 'custom'
          ? s.custom
            ? customWorkout(s.custom, dayIndex)
            : null
          : s.guided
          ? guidedWorkout(s.guided, weekIndex, dayIndex)
          : null;

      if (!w || w.exercises.length === 0) {
        setError('Could not find that workout. Check your plan and try again.');
        setLoading(false);
        return;
      }

      setGuidedProfile(planMode === 'guided' ? s.guided?.profile ?? null : null);
      setRestDefault(planMode === 'guided' ? REST_BY_GOAL[s.guided?.profile.goal ?? ''] ?? 90 : 90);

      // Saved progress from an interrupted workout (including any exercises swapped for today)
      let restored: LoggedSet[] = [];
      let started = Date.now();
      const saved = await AsyncStorage.getItem('activeWorkout');
      if (saved) {
        const a = JSON.parse(saved);
        if (a.key === storageKey && Array.isArray(a.logged)) {
          restored = a.logged;
          if (Array.isArray(a.exercises) && a.exercises.length === w.exercises.length) {
            w.exercises = a.exercises;
          }
          if (Date.now() - a.startedAt < 6 * 60 * 60 * 1000) started = a.startedAt;
        }
      }
      const total = w.exercises.reduce((n, e) => n + e.sets, 0);
      if (restored.length >= total) {
        restored = [];
        await AsyncStorage.removeItem('activeWorkout');
      }

      // Form guides: library exercises from Supabase, custom ones from the phone
      const lookup: Record<string, Detail> = {};
      const libraryNames = w.exercises.filter((e) => !e.custom).map((e) => e.name);
      if (libraryNames.length > 0) {
        const { data, error: dbError } = await supabase
          .from('exercises')
          .select(DETAIL_COLUMNS)
          .in('name', libraryNames);
        if (dbError) {
          setError(dbError.message);
          setLoading(false);
          return;
        }
        (data ?? []).forEach((d) => {
          lookup[d.name] = toDetail(d);
        });
      }
      const customs = await loadCustomExercises();
      customs.forEach((c) => {
        if (w.exercises.some((e) => e.custom && e.name === c.name)) {
          lookup[c.name] = { instructions: c.instructions, cues: c.cues };
        }
      });

      // "Last time" for each exercise
      const last: Record<string, LastTime> = {};
      for (const log of s.logs) {
        for (const ex of w.exercises) {
          const sets = log.sets.filter((x) => x.exercise === ex.name);
          if (sets.length > 0) last[ex.name] = { sets, date: log.date };
        }
      }

      const start = prefill(w.exercises, restored, last);
      setWeight(start.weight);
      setReps(start.reps);
      setDetails(lookup);
      setLastTime(last);
      setLogged(restored);
      setStartedAt(started);
      setResumed(restored.length > 0);
      setWorkout(w);
      setLoading(false);
    }
    load();
  }, [planMode, weekIndex, dayIndex]);

  // Save progress as sets are logged, so an interrupted workout can be resumed
  useEffect(() => {
    if (!workout || finished || logged.length === 0) return;
    AsyncStorage.setItem(
      'activeWorkout',
      JSON.stringify({ key: storageKey, startedAt, logged, exercises: workout.exercises })
    );
  }, [logged, workout, finished]);

  // Make sure every exercise in the workout has its form guide loaded (needed after a swap)
  useEffect(() => {
    if (!workout) return;
    workout.exercises.forEach((e) => {
      if (!e.custom && !details[e.name]) fetchExtras(e.name);
    });
  }, [workout]);

  // Form guide and "last time" for an exercise, and the weight you used last
  async function fetchExtras(name: string): Promise<string> {
    const { data } = await supabase.from('exercises').select(DETAIL_COLUMNS).eq('name', name).maybeSingle();
    if (data) setDetails((d) => ({ ...d, [name]: toDetail(data) }));

    const stored = await AsyncStorage.getItem('workoutLogs');
    const history: StoredLog[] = stored ? JSON.parse(stored) : [];
    for (let i = history.length - 1; i >= 0; i--) {
      const sets = history[i].sets.filter((x) => x.exercise === name);
      if (sets.length > 0) {
        const date = history[i].date;
        setLastTime((l) => ({ ...l, [name]: { sets, date } }));
        return sets[sets.length - 1].weight;
      }
    }
    return '';
  }

  async function doSwap(option: SwapOption, scope: SwapScope) {
    if (!workout) return;
    const idx = locate(workout.exercises, logged.length).exIndex;
    const old = workout.exercises[idx];
    const next: WorkoutExercise = {
      name: option.name,
      sets: old.sets,
      reps: repsFor(old, { timed: option.timed, equipment: option.equipment }),
      timed: option.timed || undefined,
    };

    setWorkout({ ...workout, exercises: workout.exercises.map((e, i) => (i === idx ? next : e)) });
    setSwapOpen(false);
    setEditIndex(null);

    if (scope === 'plan') {
      await applySwap({
        mode: workout.mode,
        week: weekIndex,
        day: dayIndex,
        oldName: old.name,
        next,
        equipment: option.equipment,
      });
    }

    const lastWeight = await fetchExtras(option.name);
    setWeight(next.timed ? '' : lastWeight);
    setReps('');
  }

  function startRest(seconds: number) {
    setRestTotal(seconds);
    setRestEnd(Date.now() + seconds * 1000);
  }

  async function finishWorkout(arr: LoggedSet[], partial: boolean) {
    if (!workout) return;
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    const existing = await AsyncStorage.getItem('workoutLogs');
    const logs = existing ? JSON.parse(existing) : [];
    logs.push({
      date: new Date().toISOString(),
      week: workout.mode === 'guided' ? weekIndex + 1 : 0,
      workout: workout.title,
      mode: workout.mode,
      durationSec: seconds,
      partial: partial || undefined,
      sets: arr,
    });
    await AsyncStorage.setItem('workoutLogs', JSON.stringify(logs));
    await AsyncStorage.removeItem('activeWorkout');
    setRestEnd(null);
    setSummary({ sets: arr.length, minutes: Math.max(1, Math.round(seconds / 60)) });
    try {
      const info = await loadMuscleInfo();
      setWorked(workoutMuscles(arr, info));
    } catch {}
    setFinished(true);
  }

  async function submit() {
    if (!workout || reps === '') return;
    setResumed(false);

    // Editing an earlier set
    if (editIndex !== null) {
      const old = logged[editIndex];
      const arr = logged.map((s, i) =>
        i === editIndex ? { ...old, weight: old.timed ? '0' : weight, reps } : s
      );
      setLogged(arr);
      setEditIndex(null);
      const next = prefill(workout.exercises, arr, lastTime);
      setWeight(next.weight);
      setReps(next.reps);
      return;
    }

    // Logging a new set
    const loc = locate(workout.exercises, logged.length);
    const ex = workout.exercises[loc.exIndex];
    const entry: LoggedSet = {
      exercise: ex.name,
      set: loc.setIndex + 1,
      weight: ex.timed ? '0' : weight,
      reps,
      timed: ex.timed || undefined,
    };
    const arr = [...logged, entry];
    setLogged(arr);

    const total = workout.exercises.reduce((n, e) => n + e.sets, 0);
    if (arr.length >= total) {
      await finishWorkout(arr, false);
      return;
    }
    startRest(restDefault);
    const next = prefill(workout.exercises, arr, lastTime);
    setWeight(next.weight);
    setReps(next.reps);
  }

  function startEdit(i: number) {
    const s = logged[i];
    setEditIndex(i);
    setWeight(s.timed ? '' : s.weight);
    setReps(s.reps);
  }

  function cancelEdit() {
    if (!workout) return;
    setEditIndex(null);
    const next = prefill(workout.exercises, logged, lastTime);
    setWeight(next.weight);
    setReps(next.reps);
  }

  function undoLast() {
    if (logged.length === 0) return;
    const last = logged[logged.length - 1];
    const arr = logged.slice(0, -1);
    setLogged(arr);
    setEditIndex(null);
    setRestEnd(null);
    setWeight(last.timed ? '' : last.weight);
    setReps(last.reps);
    if (arr.length === 0) AsyncStorage.removeItem('activeWorkout');
  }

  function finishEarly() {
    if (logged.length === 0) return;
    Alert.alert(
      'Finish early?',
      `This saves the ${logged.length} set${logged.length === 1 ? '' : 's'} you have logged and counts the workout as done.`,
      [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Finish', onPress: () => finishWorkout(logged, true) },
      ]
    );
  }

  function discard() {
    Alert.alert('Discard this workout?', 'Anything you have logged in it will be deleted.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('activeWorkout');
          setRestEnd(null);
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background, justifyContent: 'center' }}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  if (error || !workout) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background, padding: 24 }}>
        <Text style={{ color: palette.danger }}>{error ?? 'Something went wrong.'}</Text>
      </View>
    );
  }

  if (finished) {
    const shown = worked.slice(0, reveal);
    const mapData = shown.map((w) => ({ slug: w.slug, intensity: intensityFor(w.sets, 6) }));

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{ padding: 24, paddingTop: 40, paddingBottom: 56, alignItems: 'center' }}
      >
        <Text style={{ ...label, color: palette.accent }}>WORKOUT COMPLETE</Text>
        <Text style={{ color: palette.text, fontSize: 36, fontWeight: '800', marginTop: 6, marginBottom: 12 }}>
          Nice work.
        </Text>

        {worked.length > 0 ? (
          <>
            <MuscleMap data={mapData} initialSide={autoSide(worked.map((w) => w.slug))} scale={1.3} />
            <View
              style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 12, minHeight: 40 }}
            >
              {shown.map((w) => (
                <View
                  key={w.slug}
                  style={{
                    backgroundColor: palette.accentSoft,
                    borderRadius: 14,
                    paddingVertical: 5,
                    paddingHorizontal: 12,
                    margin: 4,
                  }}
                >
                  <Text style={{ color: palette.accent, fontWeight: '700', fontSize: 13 }}>{muscleLabel(w.slug)}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              backgroundColor: palette.accentSoft,
              borderWidth: 1,
              borderColor: palette.accent,
              alignItems: 'center',
              justifyContent: 'center',
              marginVertical: 16,
            }}
          >
            <Text style={{ color: palette.accent, fontSize: 40, fontWeight: '800' }}>✓</Text>
          </View>
        )}

        <Text style={{ color: palette.muted, fontSize: 17, lineHeight: 25, textAlign: 'center', marginVertical: 20 }}>
          You logged {summary.sets} sets in about {summary.minutes} min. Showing up is the hardest part, and you did
          it.
        </Text>
        <Pressable
          onPress={() => router.dismissTo('/')}
          style={{ backgroundColor: palette.accent, padding: 16, borderRadius: 16, alignSelf: 'stretch' }}
        >
          <Text style={{ color: palette.accentText, textAlign: 'center', fontSize: 17, fontWeight: '800' }}>
            Back to home
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ---------- current position ----------
  const exs = workout.exercises;
  const loc = locate(exs, logged.length);
  const ex = exs[loc.exIndex];
  const detail = details[ex.name];
  const last = lastTime[ex.name];
  const sug = last ? suggest(last.sets, ex.reps, ex.timed) : null;
  const sessionSets = logged.map((s, i) => ({ s, i })).filter((x) => x.s.exercise === ex.name);
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const remaining = restEnd ? Math.max(0, Math.ceil((restEnd - now) / 1000)) : 0;
  const editing = editIndex !== null;
  const setNumber = editing ? logged[editIndex!].set : loc.setIndex + 1;
  const canSwap = !ex.custom && loc.setIndex === 0 && !editing;

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      {/* Rest timer (stays visible while you scroll) */}
      {restEnd ? (
        <View
          style={{
            backgroundColor: palette.surface,
            borderBottomWidth: 1,
            borderBottomColor: palette.accent,
            paddingHorizontal: 24,
            paddingVertical: 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ ...label, color: palette.accent }}>REST</Text>
              <Text style={{ color: palette.text, fontSize: 30, fontWeight: '800' }}>{clock(remaining)}</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Pressable
                onPress={() => {
                  setRestEnd((restEnd ?? Date.now()) + 30000);
                  setRestTotal(restTotal + 30);
                }}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: palette.border,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: palette.text, fontWeight: '700' }}>+30s</Text>
              </Pressable>
              <Pressable
                onPress={() => setRestEnd(null)}
                style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, backgroundColor: palette.accent }}
              >
                <Text style={{ color: palette.accentText, fontWeight: '800' }}>Skip</Text>
              </Pressable>
            </View>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: palette.border, marginTop: 12 }}>
            <View
              style={{
                width: `${Math.min(100, (remaining / Math.max(1, restTotal)) * 100)}%`,
                height: 6,
                borderRadius: 3,
                backgroundColor: palette.accent,
              }}
            />
          </View>
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingBottom: 56 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Exercise progress */}
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          {exs.map((e, i) => (
            <View
              key={`${e.name}-${i}`}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                marginRight: i < exs.length - 1 ? 6 : 0,
                backgroundColor: i <= loc.exIndex ? palette.accent : palette.border,
              }}
            />
          ))}
        </View>

        <Text style={{ ...label, color: palette.accent }}>
          EXERCISE {loc.exIndex + 1} OF {exs.length}
          {ex.custom ? '  ·  CUSTOM' : ''}  ·  {clock(elapsed)}
        </Text>
        <Text style={{ color: palette.text, fontSize: 32, fontWeight: '800', marginTop: 4, marginBottom: 4 }}>
          {ex.name}
        </Text>
        <Text style={{ color: palette.muted, fontSize: 16, marginBottom: canSwap ? 8 : 20 }}>
          Target: {ex.sets} sets × {ex.reps}
        </Text>

        {canSwap ? (
          <Pressable onPress={() => setSwapOpen(true)} style={{ alignSelf: 'flex-start', marginBottom: 16 }}>
            <Text style={{ color: palette.accent, fontWeight: '700', fontSize: 15 }}>⇄ Swap this exercise</Text>
          </Pressable>
        ) : null}

        {resumed ? (
          <Text style={{ color: palette.accent, marginBottom: 16, fontWeight: '600' }}>
            Welcome back. We saved your {logged.length} logged set{logged.length === 1 ? '' : 's'}.
          </Text>
        ) : null}

        <ExerciseInfo key={ex.name} name={ex.name} detail={detail} />

        {/* Last time and progression suggestion */}
        {last ? (
          <View style={{ backgroundColor: palette.accentSoft, borderRadius: 18, padding: 16, marginBottom: 20 }}>
            <Text style={{ ...label, color: palette.accent, marginBottom: 4 }}>
              LAST TIME · {formatShort(new Date(last.date)).toUpperCase()}
            </Text>
            <Text style={{ color: palette.text, lineHeight: 22 }}>
              {last.sets.map((s) => (ex.timed ? `${s.reps} sec` : `${s.weight || 0}kg × ${s.reps}`)).join('   ·   ')}
            </Text>
            {sug ? (
              <>
                <Text style={{ color: palette.text, lineHeight: 22, marginTop: 10 }}>{sug.text}</Text>
                {sug.weight && !ex.timed && weight !== sug.weight && !editing ? (
                  <Pressable
                    onPress={() => setWeight(sug.weight!)}
                    style={{
                      alignSelf: 'flex-start',
                      marginTop: 10,
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 14,
                      backgroundColor: palette.accent,
                    }}
                  >
                    <Text style={{ color: palette.accentText, fontWeight: '800' }}>Use {sug.weight}kg</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}

        {/* Set progress */}
        <Text style={{ color: palette.text, fontSize: 20, fontWeight: '800', marginBottom: 10 }}>
          {editing ? `Editing set ${setNumber}` : `Set ${Math.min(setNumber, ex.sets)} of ${ex.sets}`}
        </Text>
        <View style={{ flexDirection: 'row', marginBottom: 14 }}>
          {Array.from({ length: ex.sets }).map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                marginRight: i < ex.sets - 1 ? 6 : 0,
                backgroundColor:
                  i < sessionSets.length ? palette.accent : i === sessionSets.length ? palette.accentMid : palette.border,
              }}
            />
          ))}
        </View>

        {sessionSets.length > 0 ? (
          <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {sessionSets.map(({ s, i }) => (
                <Pressable
                  key={i}
                  onPress={() => startEdit(i)}
                  style={{
                    backgroundColor: editIndex === i ? palette.accent : palette.accentSoft,
                    borderRadius: 14,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: editIndex === i ? palette.accentText : palette.accent, fontWeight: '700' }}>
                    Set {s.set}: {s.timed ? `${s.reps} sec` : `${s.weight || 0}kg × ${s.reps}`}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ color: palette.muted, fontSize: 12 }}>Tap a set to edit it</Text>
          </View>
        ) : null}

        {!ex.timed ? (
          <>
            <Text style={{ ...label, marginBottom: 6 }}>WEIGHT (KG), OR 0 FOR BODYWEIGHT</Text>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              keyboardAppearance={themeMode}
              placeholder="e.g. 10"
              placeholderTextColor={palette.muted}
              style={inputStyle}
            />
          </>
        ) : null}

        <Text style={{ ...label, marginBottom: 6 }}>{ex.timed ? 'SECONDS HELD' : 'REPS COMPLETED'}</Text>
        <TextInput
          value={reps}
          onChangeText={setReps}
          keyboardType="number-pad"
          keyboardAppearance={themeMode}
          placeholder="e.g. 10"
          placeholderTextColor={palette.muted}
          style={{ ...inputStyle, marginBottom: 20 }}
        />

        <Pressable
          onPress={submit}
          disabled={reps === ''}
          style={{ backgroundColor: reps === '' ? palette.border : palette.accent, padding: 16, borderRadius: 16 }}
        >
          <Text
            style={{
              color: reps === '' ? palette.muted : palette.accentText,
              textAlign: 'center',
              fontSize: 17,
              fontWeight: '800',
            }}
          >
            {editing ? `Update set ${setNumber}` : 'Log set'}
          </Text>
        </Pressable>

        {editing ? (
          <Pressable onPress={cancelEdit} style={{ padding: 14 }}>
            <Text style={{ color: palette.muted, textAlign: 'center', fontSize: 15 }}>Cancel edit</Text>
          </Pressable>
        ) : logged.length > 0 ? (
          <Pressable onPress={undoLast} style={{ padding: 14 }}>
            <Text style={{ color: palette.muted, textAlign: 'center', fontSize: 15 }}>Undo last set</Text>
          </Pressable>
        ) : null}

        {logged.length > 0 ? (
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
            <Pressable onPress={finishEarly} style={{ padding: 10 }}>
              <Text style={{ color: palette.muted, fontSize: 14 }}>Finish early</Text>
            </Pressable>
            <Pressable onPress={discard} style={{ padding: 10 }}>
              <Text style={{ color: palette.danger, fontSize: 14 }}>Discard workout</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <SwapModal
        visible={swapOpen}
        onClose={() => setSwapOpen(false)}
        currentName={ex.name}
        inWorkout={exs.map((e) => e.name)}
        profile={guidedProfile}
        mode={workout.mode}
        onConfirm={doSwap}
      />
    </View>
  );
}