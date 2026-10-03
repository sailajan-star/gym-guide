import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { labelStyle, useTheme } from '@/constants/app-theme';
import {
    buildSeries,
    clearDemo,
    createDemo,
    hasDemo,
    loadLogs,
    unitFor,
    WorkoutLog,
} from '../../lib/progress';
import { supabase } from '../../lib/supabase';

type Exercise = { name: string; muscle_group: string };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const GOOD = '#2FBF84';

export default function ProgressScreen() {
  const { palette } = useTheme();
  const label = labelStyle(palette);
  const router = useRouter();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [demoOn, setDemoOn] = useState(false);
  const [filter, setFilter] = useState('All');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [{ data, error: dbError }, l, d] = await Promise.all([
      supabase.from('exercises').select('name, muscle_group').order('name'),
      loadLogs(),
      hasDemo(),
    ]);
    if (dbError) setError(dbError.message);
    else setExercises(data ?? []);
    setLogs(l);
    setDemoOn(d);
    setLoaded(true);
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function toggleDemo() {
    if (demoOn) await clearDemo();
    else await createDemo();
    load();
  }

  if (!loaded) return <View style={{ flex: 1, backgroundColor: palette.background }} />;

  const groups = ['All', ...Array.from(new Set(exercises.map((e) => e.muscle_group))).sort()];

  const rows = exercises
    .filter((e) => filter === 'All' || e.muscle_group === filter)
    .map((e) => {
      const { points, kind } = buildSeries(logs, e.name, 'top');
      return { ...e, points, unit: unitFor(kind) };
    })
    .sort((a, b) => Number(b.points.length > 0) - Number(a.points.length > 0) || a.name.localeCompare(b.name));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: 56 }}
    >
      <Text style={{ color: palette.text, fontSize: 32, fontWeight: '800', marginBottom: 4 }}>My Progress</Text>
      <Text style={{ color: palette.muted, marginBottom: 20 }}>Tap an exercise to see how you're improving!</Text>

      {/* Muscle group filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, flexGrow: 0 }}>
        {groups.map((g) => (
          <Pressable
            key={g}
            onPress={() => setFilter(g)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 18,
              marginRight: 8,
              backgroundColor: filter === g ? palette.accent : palette.surface,
              borderWidth: 1,
              borderColor: filter === g ? palette.accent : palette.border,
            }}
          >
            <Text style={{ color: filter === g ? palette.accentText : palette.text, fontWeight: '700' }}>
              {cap(g)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {error ? <Text style={{ color: palette.danger, marginBottom: 12 }}>{error}</Text> : null}

      {rows.map((r) => {
        const has = r.points.length > 0;
        const first = r.points[0]?.value ?? 0;
        const last = r.points[r.points.length - 1]?.value ?? 0;
        const delta = Math.round((last - first) * 10) / 10;
        return (
          <Pressable
            key={r.name}
            onPress={() => router.push({ pathname: '/exercise', params: { name: r.name } } as any)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: palette.surface,
              borderRadius: 20,
              padding: 18,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: palette.border,
              opacity: has ? 1 : 0.5,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.text, fontSize: 17, fontWeight: '700' }}>{r.name}</Text>
              <Text style={{ color: palette.muted, marginTop: 2 }}>
                {cap(r.muscle_group)} · {has ? `${r.points.length} session${r.points.length === 1 ? '' : 's'}` : 'No data yet'}
              </Text>
            </View>
            {has ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: palette.text, fontSize: 17, fontWeight: '800' }}>
                  {last} {r.unit}
                </Text>
                {r.points.length > 1 ? (
                  <Text style={{ color: delta >= 0 ? GOOD : palette.danger, fontWeight: '700', marginTop: 2 }}>
                    {delta >= 0 ? '▲ +' : '▼ '}
                    {delta}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Pressable>
        );
      })}

      <Pressable onPress={toggleDemo} style={{ padding: 16, marginTop: 12 }}>
        <Text style={{ ...label, textAlign: 'center' }}>
          {demoOn ? 'REMOVE DEMO DATA' : 'LOAD DEMO DATA (TESTING)'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}