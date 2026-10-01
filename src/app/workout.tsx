import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { palette } from '@/constants/palette';
import { buildWeek, PlannedDay, SETS_BY_WEEK } from '../../lib/program';
import { supabase } from '../../lib/supabase';

type Detail = { name: string; instructions: string; cues: string };
type LoggedSet = { exercise: string; set: number; weight: string; reps: string };


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

const label = {
  color: palette.muted,
  fontSize: 12,
  fontWeight: '700',
  letterSpacing: 1.5,
  marginBottom: 6,
} as const;

export default function WorkoutScreen() {
  const router = useRouter();
  const { week, day } = useLocalSearchParams<{ week: string; day: string }>();
  const weekIndex = parseInt(week ?? '0', 10);
  const dayIndex = parseInt(day ?? '0', 10);

  const [plannedDay, setPlannedDay] = useState<PlannedDay | null>(null);
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [exIndex, setExIndex] = useState(0);
  const [setsDone, setSetsDone] = useState(0);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [logged, setLogged] = useState<LoggedSet[]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    async function load() {
      const stored = await AsyncStorage.getItem('profile');
      if (!stored) {
        setError('No plan found. Set up your plan first.');
        setLoading(false);
        return;
      }
      const profile = JSON.parse(stored);
      const days = buildWeek(profile.equipment, parseInt(profile.days, 10), weekIndex);
      const chosen = days[dayIndex];
      if (!chosen) {
        setError('Could not find that workout.');
        setLoading(false);
        return;
      }

      const names = chosen.exercises.map((e) => e.name);
      const { data, error: dbError } = await supabase
        .from('exercises')
        .select('name, instructions, cues')
        .in('name', names);

      if (dbError) {
        setError(dbError.message);
      } else {
        const lookup: Record<string, Detail> = {};
        (data ?? []).forEach((d) => (lookup[d.name] = d));
        setDetails(lookup);
        setPlannedDay(chosen);
      }
      setLoading(false);
    }
    load();
  }, [weekIndex, dayIndex]);

  async function saveWorkout(sets: LoggedSet[]) {
    const existing = await AsyncStorage.getItem('workoutLogs');
    const logs = existing ? JSON.parse(existing) : [];
    logs.push({
      date: new Date().toISOString(),
      week: weekIndex + 1,
      workout: plannedDay?.label,
      sets,
    });
    await AsyncStorage.setItem('workoutLogs', JSON.stringify(logs));
  }

  async function logSet() {
    if (!plannedDay) return;
    const exercise = plannedDay.exercises[exIndex];
    const totalSets = SETS_BY_WEEK[weekIndex];
    const newLogged = [...logged, { exercise: exercise.name, set: setsDone + 1, weight, reps }];
    setLogged(newLogged);

    if (setsDone + 1 < totalSets) {
      setSetsDone(setsDone + 1);
    } else if (exIndex + 1 < plannedDay.exercises.length) {
      setExIndex(exIndex + 1);
      setSetsDone(0);
      setWeight('');
      setReps('');
    } else {
      await saveWorkout(newLogged);
      setFinished(true);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background, justifyContent: 'center' }}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  if (error || !plannedDay) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background, padding: 24 }}>
        <Text style={{ color: '#FF6B6B' }}>{error ?? 'Something went wrong.'}</Text>
      </View>
    );
  }

  if (finished) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background, padding: 24, justifyContent: 'center' }}>
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
            marginBottom: 24,
          }}
        >
          <Text style={{ color: palette.accent, fontSize: 40, fontWeight: '800' }}>✓</Text>
        </View>
        <Text style={{ color: palette.text, fontSize: 36, fontWeight: '800', marginBottom: 10 }}>
          Workout complete
        </Text>
        <Text style={{ color: palette.muted, fontSize: 18, lineHeight: 26, marginBottom: 32 }}>
          You logged {logged.length} sets. Showing up is the hardest part, and you did it.
        </Text>
        <Pressable
          onPress={() => router.replace('/')}
          style={{ backgroundColor: palette.accent, padding: 16, borderRadius: 16 }}
        >
          <Text style={{ color: palette.accentText, textAlign: 'center', fontSize: 17, fontWeight: '800' }}>
            Back to home
          </Text>
        </Pressable>
      </View>
    );
  }

  const exercise = plannedDay.exercises[exIndex];
  const detail = details[exercise.name];
  const totalSets = SETS_BY_WEEK[weekIndex];
  const doneForExercise = logged.filter((l) => l.exercise === exercise.name);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: 56 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Exercise progress */}
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        {plannedDay.exercises.map((e, i) => (
          <View
            key={e.name}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              marginRight: i < plannedDay.exercises.length - 1 ? 6 : 0,
              backgroundColor: i <= exIndex ? palette.accent : palette.border,
            }}
          />
        ))}
      </View>

      <Text style={{ ...label, color: palette.accent }}>
        EXERCISE {exIndex + 1} OF {plannedDay.exercises.length}
      </Text>
      <Text style={{ color: palette.text, fontSize: 32, fontWeight: '800', marginBottom: 4 }}>{exercise.name}</Text>
      <Text style={{ color: palette.muted, fontSize: 16, marginBottom: 20 }}>
        Target: {totalSets} sets × {exercise.reps}
      </Text>

    
      {detail ? (
        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: 24,
            padding: 20,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: palette.border,
          }}
        >
          <Text style={label}>HOW TO DO IT</Text>
          <Text style={{ color: palette.text, lineHeight: 22, marginBottom: 16 }}>{detail.instructions}</Text>
          <Text style={{ ...label, color: palette.accent }}>FORM CUES</Text>
          <Text style={{ color: palette.text, lineHeight: 22 }}>{detail.cues}</Text>
        </View>
      ) : (
        <Text style={{ color: palette.muted, marginBottom: 24 }}>
          No form guide found for this exercise in the database.
        </Text>
      )}

      {/* Set progress */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ color: palette.text, fontSize: 20, fontWeight: '800' }}>
          Set {setsDone + 1} of {totalSets}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 14 }}>
        {Array.from({ length: totalSets }).map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              marginRight: i < totalSets - 1 ? 6 : 0,
              backgroundColor: i < setsDone ? palette.accent : i === setsDone ? '#2E8F69' : palette.border,
            }}
          />
        ))}
      </View>

      {doneForExercise.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 }}>
          {doneForExercise.map((s) => (
            <View
              key={s.set}
              style={{
                backgroundColor: palette.accentSoft,
                borderRadius: 14,
                paddingVertical: 6,
                paddingHorizontal: 12,
                marginRight: 8,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: palette.accent, fontWeight: '700' }}>
                Set {s.set}: {s.weight || 0}kg × {s.reps}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={label}>WEIGHT (KG), OR 0 FOR BODYWEIGHT</Text>
      <TextInput
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
        keyboardAppearance="dark"
        placeholder="e.g. 10"
        placeholderTextColor={palette.muted}
        style={inputStyle}
      />

      <Text style={label}>REPS COMPLETED</Text>
      <TextInput
        value={reps}
        onChangeText={setReps}
        keyboardType="number-pad"
        keyboardAppearance="dark"
        placeholder="e.g. 10"
        placeholderTextColor={palette.muted}
        style={{ ...inputStyle, marginBottom: 20 }}
      />

      <Pressable
        onPress={logSet}
        disabled={reps === ''}
        style={{
          backgroundColor: reps === '' ? palette.border : palette.accent,
          padding: 16,
          borderRadius: 16,
        }}
      >
        <Text
          style={{
            color: reps === '' ? palette.muted : palette.accentText,
            textAlign: 'center',
            fontSize: 17,
            fontWeight: '800',
          }}
        >
          Log set
        </Text>
      </Pressable>
    </ScrollView>
  );
}