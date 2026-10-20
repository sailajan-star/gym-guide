import PlanControls from '@/components/PlanControls';
import { labelStyle, useTheme } from '@/constants/app-theme';
import { useTabBarClearance } from '@/constants/tab-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { getHomeSummary, loadPlanState, PlanState } from '../../lib/activePlan';

export default function PlanScreen() {
  const { palette } = useTheme();
  const label = labelStyle(palette);
  const router = useRouter();
  const clearance = useTabBarClearance();
  const [state, setState] = useState<PlanState | null>(null);
  const [week, setWeek] = useState(0);

  const reload = () => loadPlanState().then(setState);

  useFocusEffect(
    useCallback(() => {
      loadPlanState().then(setState);
    }, [])
  );

  if (!state) return <View style={{ flex: 1, backgroundColor: palette.background }} />;

  const cardStyle = {
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: palette.border,
  } as const;

  // Nothing set up yet
  if (!state.mode) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background, padding: 24 }}>
        <Text style={{ color: palette.text, fontSize: 20, fontWeight: '700', marginBottom: 16 }}>
          You haven't set up a plan yet.
        </Text>
        <Pressable
          onPress={() => router.push('/onboarding' as any)}
          style={{ backgroundColor: palette.accent, padding: 16, borderRadius: 16, marginBottom: 12 }}
        >
          <Text style={{ color: palette.accentText, textAlign: 'center', fontSize: 17, fontWeight: '800' }}>
            Build me a plan
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/build-plan' as any)}
          style={{ borderWidth: 1, borderColor: palette.accent, padding: 16, borderRadius: 16 }}
        >
          <Text style={{ color: palette.accent, textAlign: 'center', fontSize: 17, fontWeight: '800' }}>
            I have my own plan
          </Text>
        </Pressable>
      </View>
    );
  }

  // ---------- CUSTOM PLAN ----------
  if (state.mode === 'custom' && state.custom) {
    const plan = state.custom;
    const nextDay = getHomeSummary(state)?.next?.day;

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{ padding: 24, paddingBottom: clearance }}
      >
        <PlanControls state={state} onSwitched={reload} />

        <Text style={{ color: palette.text, fontSize: 32, fontWeight: '800' }}>{plan.name}</Text>
        <Text style={{ color: palette.muted, marginTop: 4, marginBottom: 24 }}>
          {plan.days.length} days · repeats as a cycle
        </Text>

        {plan.days.map((d, index) => (
          <Pressable
            key={index}
            onPress={() =>
              router.push({ pathname: '/workout', params: { mode: 'custom', week: '0', day: String(index) } } as any)
            }
            style={cardStyle}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: palette.text, fontSize: 20, fontWeight: '800', flex: 1 }}>{d.name}</Text>
              {nextDay === index ? (
                <View
                  style={{
                    backgroundColor: palette.accentSoft,
                    borderRadius: 10,
                    paddingVertical: 3,
                    paddingHorizontal: 10,
                  }}
                >
                  <Text style={{ color: palette.accent, fontSize: 11, fontWeight: '800' }}>UP NEXT</Text>
                </View>
              ) : null}
            </View>

            {d.exercises.map((ex, i) => (
              <View
                key={`${ex.name}-${i}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderTopWidth: 1,
                  borderTopColor: palette.border,
                }}
              >
                <Text style={{ color: palette.accent, fontWeight: '800', width: 34 }}>
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <Text style={{ color: palette.text, fontSize: 16, flex: 1 }}>{ex.name}</Text>
                {ex.custom ? (
                  <Text style={{ color: palette.accent, fontSize: 11, fontWeight: '800', marginRight: 10 }}>CUSTOM</Text>
                ) : null}
                <Text style={{ color: palette.muted }}>
                  {ex.sets} × {ex.reps}
                </Text>
              </View>
            ))}
            <Text style={{ color: palette.accent, fontWeight: '700', marginTop: 12 }}>Start workout →</Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  // ---------- GUIDED PLAN ----------
  const guided = state.guided;
  if (!guided) return <View style={{ flex: 1, backgroundColor: palette.background }} />;

  const weekData = guided.weeks[week] ?? guided.weeks[0];
  const perWeek = guided.weeks[0].days.length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: clearance }}
    >
      <PlanControls state={state} onSwitched={reload} />

      <Text style={{ color: palette.text, fontSize: 32, fontWeight: '800' }}>Your 4-week plan</Text>
      <Text style={{ color: palette.muted, marginTop: 4, marginBottom: 20 }}>
        {perWeek} days a week · {guided.profile.equipment}
        {guided.block > 1 ? ` · Block ${guided.block}` : ''}
      </Text>

      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        {[0, 1, 2, 3].map((w) => (
          <Pressable
            key={w}
            onPress={() => setWeek(w)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 20,
              marginRight: 8,
              backgroundColor: week === w ? palette.accent : palette.surface,
              borderWidth: 1,
              borderColor: week === w ? palette.accent : palette.border,
            }}
          >
            <Text style={{ color: week === w ? palette.accentText : palette.text, fontWeight: '700' }}>
              Week {w + 1}
            </Text>
          </Pressable>
        ))}
      </View>

      <View
        style={{
          backgroundColor: palette.accentSoft,
          borderRadius: 20,
          padding: 18,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: palette.heroBorder,
        }}
      >
        <Text style={{ ...label, color: palette.accent, marginBottom: 6 }}>THIS WEEK'S FOCUS</Text>
        <Text style={{ color: palette.text, lineHeight: 22 }}>{weekData.note}</Text>
      </View>

      {guided.notes.map((n, i) => (
        <Text key={i} style={{ color: palette.muted, lineHeight: 20, fontSize: 13, marginBottom: 12 }}>
          {n}
        </Text>
      ))}

      {weekData.days.map((day, index) => (
        <Pressable
          key={day.label}
          onPress={() =>
            router.push({
              pathname: '/workout',
              params: { mode: 'guided', week: String(week), day: String(index) },
            } as any)
          }
          style={cardStyle}
        >
          <Text style={{ color: palette.text, fontSize: 20, fontWeight: '800', marginBottom: 12 }}>{day.label}</Text>
          {day.exercises.map((ex, i) => (
            <View
              key={`${ex.name}-${i}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                borderTopWidth: 1,
                borderTopColor: palette.border,
              }}
            >
              <Text style={{ color: palette.accent, fontWeight: '800', width: 34 }}>
                {String(i + 1).padStart(2, '0')}
              </Text>
              <Text style={{ color: palette.text, fontSize: 16, flex: 1 }}>{ex.name}</Text>
              <Text style={{ color: palette.muted }}>
                {ex.sets} × {ex.reps}
              </Text>
            </View>
          ))}
          <Text style={{ color: palette.accent, fontWeight: '700', marginTop: 12 }}>Start workout →</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}