import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { labelStyle, useTheme } from '@/constants/app-theme';
import { guidedLogs, loadPlanState, PlanState } from '../../lib/activePlan';
import { setPlanMode } from '../../lib/customPlan';
import { createGuidedPlan, PlanOptions } from '../../lib/program';
import { buildSeries, unitFor, WorkoutLog } from '../../lib/progress';

type Feel = 'easy' | 'right' | 'hard';
type Improvement = { name: string; delta: number; unit: string };

const LEVELS = ['Complete beginner', 'Tried a few times', 'A few months'];

const FEELS: { key: Feel; title: string; desc: string }[] = [
  { key: 'easy', title: 'Too easy', desc: 'I could have done more.' },
  { key: 'right', title: 'Just right', desc: 'Challenging, but I could handle it.' },
  { key: 'hard', title: 'Too hard', desc: 'I struggled to recover between sessions.' },
];

export default function ReviewScreen() {
  const { palette } = useTheme();
  const label = labelStyle(palette);
  const router = useRouter();

  const [state, setState] = useState<PlanState | null>(null);
  const [feel, setFeel] = useState<Feel | null>(null);
  const [fewerDays, setFewerDays] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadPlanState().then(setState);
    }, [])
  );

  if (!state) return <View style={{ flex: 1, backgroundColor: palette.background }} />;

  const g = state.guided;
  if (!g) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background, padding: 24, justifyContent: 'center' }}>
        <Text style={{ color: palette.text, fontSize: 22, fontWeight: '800', marginBottom: 8 }}>
          No guided plan yet
        </Text>
        <Text style={{ color: palette.muted, lineHeight: 22, marginBottom: 20 }}>
          Build a guided plan first, and you can review it here when the block is done.
        </Text>
        <Pressable
          onPress={() => router.dismissTo('/')}
          style={{ backgroundColor: palette.accent, padding: 16, borderRadius: 16 }}
        >
          <Text style={{ color: palette.accentText, textAlign: 'center', fontSize: 17, fontWeight: '800' }}>
            Back to home
          </Text>
        </Pressable>
      </View>
    );
  }

  // ----- stats for this block -----
  const days = g.weeks[0].days.length;
  const planned = days * 4;
  const logs = guidedLogs(state);
  const pct = Math.min(100, Math.round((logs.length / planned) * 100));
  const setsLogged = logs.reduce((n, l) => n + l.sets.length, 0);

  const names = Array.from(new Set(logs.flatMap((l) => l.sets.map((s) => s.exercise))));
  const improvements: Improvement[] = [];
  for (const name of names) {
    const { points, kind } = buildSeries(logs as unknown as WorkoutLog[], name, 'top');
    if (points.length < 2) continue;
    const delta = Math.round((points[points.length - 1].value - points[0].value) * 10) / 10;
    if (delta > 0) improvements.push({ name, delta, unit: unitFor(kind) });
  }
  improvements.sort((a, b) => b.delta - a.delta);
  const top = improvements.slice(0, 3);

  const message =
    pct >= 80
      ? 'Great consistency. That is what builds real progress.'
      : pct >= 50
      ? 'A solid block. Showing up most weeks beats being perfect.'
      : 'Life gets busy, and that is okay. What matters is that you are here and ready for the next one.';

  // ----- what the next block will do -----
  const expIdx = LEVELS.indexOf(g.profile.experience);
  const canLevelUp = expIdx >= 0 && expIdx < LEVELS.length - 1;

  let plan = '';
  if (feel === 'easy') {
    plan = canLevelUp
      ? `You will move up to "${LEVELS[expIdx + 1]}": a bit more volume, and fresh variations of your main lifts.`
      : 'You get one extra set per exercise, and fresh variations of your main lifts.';
  } else if (feel === 'right') {
    plan = 'Your main lifts stay the same so your progress carries on. The extra exercises rotate to keep things fresh.';
  } else if (feel === 'hard') {
    plan = 'One fewer set per exercise (never below 2), with the same main lifts so you can focus on form.';
  }
  if (fewerDays) plan += ` You will train ${Math.max(2, days - 1)} days a week.`;

  async function buildNext() {
    if (!feel || !g) return;
    setBuilding(true);
    setError(null);
    try {
      const profile = { ...g.profile };
      const opts: PlanOptions = { block: g.block + 1 };

      if (feel === 'easy') {
        if (canLevelUp) profile.experience = LEVELS[expIdx + 1];
        else opts.setsBonus = 1;
        opts.anchorShift = true;
      }
      if (feel === 'hard') opts.setsBonus = -1;
      if (fewerDays) profile.days = String(Math.max(2, days - 1));

      // Keep a short record of this block
      const stored = await AsyncStorage.getItem('blockReviews');
      const reviews = stored ? JSON.parse(stored) : [];
      reviews.push({
        block: g.block,
        finishedAt: new Date().toISOString(),
        workouts: logs.length,
        planned,
        feel,
      });
      await AsyncStorage.setItem('blockReviews', JSON.stringify(reviews));

      await createGuidedPlan(profile, opts);
      await setPlanMode('guided');
      router.dismissTo('/');
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong.');
      setBuilding(false);
    }
  }

  if (building) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: palette.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <ActivityIndicator color={palette.accent} size="large" />
        <Text style={{ color: palette.text, fontSize: 20, fontWeight: '700', marginTop: 20 }}>
          Building your next block…
        </Text>
      </View>
    );
  }

  const card = {
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: palette.border,
  } as const;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: 56 }}
    >
      <Text style={{ ...label, color: palette.accent }}>BLOCK {g.block} REVIEW</Text>
      <Text style={{ color: palette.text, fontSize: 32, fontWeight: '800', marginTop: 6, marginBottom: 8 }}>
        Nice work.
      </Text>
      <Text style={{ color: palette.muted, lineHeight: 22, marginBottom: 24 }}>{message}</Text>

      {/* Stat tiles */}
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        <View style={{ ...card, flex: 1, marginRight: 8, marginBottom: 0, padding: 18 }}>
          <Text style={{ color: palette.text, fontSize: 36, fontWeight: '800' }}>
            {logs.length}
            <Text style={{ color: palette.muted, fontSize: 18 }}> / {planned}</Text>
          </Text>
          <Text style={label}>WORKOUTS</Text>
        </View>
        <View style={{ ...card, flex: 1, marginLeft: 8, marginBottom: 0, padding: 18 }}>
          <Text style={{ color: palette.text, fontSize: 36, fontWeight: '800' }}>{setsLogged}</Text>
          <Text style={label}>SETS LOGGED</Text>
        </View>
      </View>

      {/* Completion bar */}
      <View style={card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ color: palette.text, fontSize: 17, fontWeight: '700' }}>Completed</Text>
          <Text style={{ color: palette.accent, fontWeight: '700' }}>{pct}%</Text>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: palette.border }}>
          <View
            style={{ width: `${pct}%`, height: 8, borderRadius: 4, backgroundColor: palette.accent }}
          />
        </View>
      </View>

      {/* Improvements */}
      <View style={card}>
        <Text style={{ ...label, marginBottom: 10 }}>BIGGEST IMPROVEMENTS</Text>
        {top.length === 0 ? (
          <Text style={{ color: palette.muted, lineHeight: 22 }}>
            Not enough repeated sessions to compare yet. Log the same exercises a few times and your gains will
            show up here.
          </Text>
        ) : (
          top.map((t, i) => (
            <View
              key={t.name}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: palette.border,
              }}
            >
              <Text style={{ color: palette.text, fontSize: 16, flex: 1 }}>{t.name}</Text>
              <Text style={{ color: '#2FBF84', fontWeight: '800' }}>
                ▲ +{t.delta} {t.unit}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* How did it feel */}
      <Text style={{ color: palette.text, fontSize: 22, fontWeight: '800', marginTop: 8, marginBottom: 12 }}>
        How did this block feel?
      </Text>
      {FEELS.map((f) => {
        const selected = feel === f.key;
        return (
          <Pressable
            key={f.key}
            onPress={() => setFeel(f.key)}
            style={{
              backgroundColor: selected ? palette.accentSoft : palette.surface,
              borderRadius: 20,
              padding: 18,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: selected ? palette.accent : palette.border,
            }}
          >
            <Text style={{ color: palette.text, fontSize: 18, fontWeight: '700' }}>{f.title}</Text>
            <Text style={{ color: palette.muted, marginTop: 2 }}>{f.desc}</Text>
          </Pressable>
        );
      })}

      {pct < 60 && days > 2 ? (
        <Pressable
          onPress={() => setFewerDays(!fewerDays)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: palette.surface,
            borderRadius: 20,
            padding: 16,
            marginTop: 6,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: fewerDays ? palette.accent : palette.border,
          }}
        >
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: fewerDays ? palette.accent : palette.border,
              backgroundColor: fewerDays ? palette.accent : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}
          >
            {fewerDays ? <Text style={{ color: palette.accentText, fontWeight: '800' }}>✓</Text> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700' }}>
              Train one fewer day a week
            </Text>
            <Text style={{ color: palette.muted, marginTop: 2, lineHeight: 20 }}>
              A lighter schedule is easier to stick to. You can build back up later.
            </Text>
          </View>
        </Pressable>
      ) : null}

      {plan ? (
        <Text style={{ color: palette.muted, lineHeight: 22, marginTop: 8, marginBottom: 16 }}>
          <Text style={{ color: palette.accent, fontWeight: '700' }}>Next block: </Text>
          {plan}
        </Text>
      ) : null}

      {error ? <Text style={{ color: palette.danger, marginBottom: 12 }}>{error}</Text> : null}

      <Pressable
        onPress={buildNext}
        disabled={!feel}
        style={{ backgroundColor: feel ? palette.accent : palette.border, padding: 16, borderRadius: 16 }}
      >
        <Text
          style={{
            color: feel ? palette.accentText : palette.muted,
            textAlign: 'center',
            fontSize: 17,
            fontWeight: '800',
          }}
        >
          Build my next block
        </Text>
      </Pressable>

      <Pressable onPress={() => router.push('/onboarding' as any)} style={{ padding: 14, marginTop: 4 }}>
        <Text style={{ color: palette.muted, textAlign: 'center', fontSize: 15 }}>
          Or retake the quiz with new answers
        </Text>
      </Pressable>
    </ScrollView>
  );
}