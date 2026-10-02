import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { labelStyle, useTheme } from '@/constants/app-theme';
type LoggedSet = { exercise: string; set: number; weight: string; reps: string };
type WorkoutLog = { date: string; week: number; workout: string; sets: LoggedSet[] };


function groupByExercise(sets: LoggedSet[]) {
  const groups: Record<string, LoggedSet[]> = {};
  sets.forEach((s) => {
    if (!groups[s.exercise]) groups[s.exercise] = [];
    groups[s.exercise].push(s);
  });
  return Object.entries(groups);
}

export default function HistoryScreen() {
    const { palette } = useTheme();
    const label = labelStyle(palette);
  const router = useRouter();
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('workoutLogs').then((value) => {
        const parsed: WorkoutLog[] = value ? JSON.parse(value) : [];
        setLogs(parsed.reverse()); // newest first
        setLoaded(true);
      });
    }, [])
  );

  if (!loaded) return <View style={{ flex: 1, backgroundColor: palette.background }} />;

  const totalSets = logs.reduce((sum, l) => sum + l.sets.length, 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: 56 }}
    >
      <Text style={{ color: palette.text, fontSize: 32, fontWeight: '800', marginBottom: 20 }}>My Progress</Text>

      {/* Summary tiles */}
      <View style={{ flexDirection: 'row', marginBottom: 24 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: palette.surface,
            borderRadius: 22,
            padding: 18,
            marginRight: 8,
            borderWidth: 1,
            borderColor: palette.border,
          }}
        >
          <Text style={{ color: palette.text, fontSize: 40, fontWeight: '800' }}>{logs.length}</Text>
          <Text style={label}>WORKOUTS</Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: palette.surface,
            borderRadius: 22,
            padding: 18,
            marginLeft: 8,
            borderWidth: 1,
            borderColor: palette.border,
          }}
        >
          <Text style={{ color: palette.text, fontSize: 40, fontWeight: '800' }}>{totalSets}</Text>
          <Text style={label}>SETS LOGGED</Text>
        </View>
      </View>

      {logs.length === 0 ? (
        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: 24,
            padding: 24,
            borderWidth: 1,
            borderColor: palette.border,
          }}
        >
          <Text style={{ color: palette.text, fontSize: 18, fontWeight: '700', marginBottom: 6 }}>
            Nothing here yet
          </Text>
          <Text style={{ color: palette.muted, lineHeight: 22, marginBottom: 16 }}>
            Finish your first workout and it will show up here.
          </Text>
          <Pressable
            onPress={() => router.replace('/')}
            style={{ backgroundColor: palette.accent, padding: 14, borderRadius: 14 }}
          >
            <Text style={{ color: palette.accentText, textAlign: 'center', fontWeight: '800', fontSize: 16 }}>
              Back to home
            </Text>
          </Pressable>
        </View>
      ) : (
        logs.map((log, i) => (
          <View
            key={log.date + i}
            style={{
              backgroundColor: palette.surface,
              borderRadius: 24,
              padding: 20,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <Text style={{ ...label, color: palette.accent }}>
              {new Date(log.date).toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              }).toUpperCase()}{' '}
              · WEEK {log.week}
            </Text>
            <Text style={{ color: palette.text, fontSize: 20, fontWeight: '800', marginTop: 6, marginBottom: 12 }}>
              {log.workout}
            </Text>

            {groupByExercise(log.sets).map(([exercise, sets]) => (
              <View
                key={exercise}
                style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: palette.border }}
              >
                <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
                  {exercise}
                </Text>
                <Text style={{ color: palette.muted, lineHeight: 20 }}>
                  {sets.map((s) => `${s.weight || 0}kg × ${s.reps}`).join('   ·   ')}
                </Text>
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}