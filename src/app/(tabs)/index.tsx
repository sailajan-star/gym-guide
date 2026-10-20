import ThemeToggle from '@/components/ThemeToggle';
import { labelStyle, useTheme } from '@/constants/app-theme';
import { useTabBarClearance } from '@/constants/tab-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getHomeSummary, loadPlanState, PlanState, totalSets } from '../../../lib/activePlan'; // CHANGED (replaces the program import)

function timeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function Greeting() {
  const { palette } = useTheme();
  const label = labelStyle(palette);
  return (
    <Text style={label}>
      <Text style={{ color: palette.text }}>GOOD </Text>
      <Text style={{ color: palette.accent }}>{timeOfDay().toUpperCase()}</Text>
    </Text>
  );
}

export default function HomeScreen() {
  const { palette } = useTheme();
  const label = labelStyle(palette);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  const [state, setState] = useState<PlanState | null>(null); // CHANGED (replaces profile / completed / loaded)

  // CHANGED: load is now a normal function so the buttons can call it too
  async function load() {
    setState(await loadPlanState());
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  if (!state) return <View style={{ flex: 1, backgroundColor: palette.background }} />;

  const summary = getHomeSummary(state); // NEW
  const containerStyle = { padding: 24, paddingTop: insets.top + 20, paddingBottom: clearance };

  // First-time user
  if (!summary) { // CHANGED (was: if (!profile))
    return (
      <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={containerStyle}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Greeting />
          <ThemeToggle />
        </View>
        <Text style={{ color: palette.text, fontSize: 36, fontWeight: '800', marginTop: 6, marginBottom: 28 }}>
          Let's get you started.
        </Text>
        <LinearGradient
          //colors={['#1E6B50', '#0F2A22', '#0B0D10']}
          colors={['#6b1e1e', '#2a0f0f', '#0B0D10']}

          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          //style={{ borderRadius: 28, padding: 24, borderWidth: 1, borderColor: '#1F5E48' }}
          style={{ borderRadius: 28, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: '#5e1f1f' }} // CHANGED: added marginBottom
        >
          <Text style={{ color: palette.text, fontSize: 24, fontWeight: '800', marginBottom: 8 }}>
            Build your plan
          </Text>
          <Text style={{ color: palette.muted, fontSize: 16, lineHeight: 22, marginBottom: 24 }}>
            Four quick questions, then a simple 4-week plan. No guesswork.
          </Text>
          <Pressable
            onPress={() => router.push('/onboarding' as any)}
            style={{ backgroundColor: palette.accent, padding: 16, borderRadius: 16 }}
          >
            <Text style={{ color: palette.accentText, textAlign: 'center', fontSize: 17, fontWeight: '800' }}>
              Get started
            </Text>
          </Pressable>
        </LinearGradient>

        {/* NEW: second route for people who already have a plan */}
        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: 24,
            padding: 20,
            borderWidth: 1,
            borderColor: palette.border,
          }}
        >
          <Text style={{ color: palette.text, fontSize: 20, fontWeight: '800', marginBottom: 6 }}>
            I already have a plan
          </Text>
          <Text style={{ color: palette.muted, lineHeight: 22, marginBottom: 16 }}>
            Enter your own workouts. You can add your own exercises too.
          </Text>
          <Pressable
            onPress={() => router.push('/build-plan' as any)}
            style={{ borderWidth: 1, borderColor: palette.accent, padding: 14, borderRadius: 16 }}
          >
            <Text style={{ color: palette.accent, textAlign: 'center', fontSize: 16, fontWeight: '800' }}>
              Build my own plan
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // CHANGED: this block replaces the old days / totalWorkouts / finished / weekIdx / dayIdx / workout / doneThisWeek lines
  const next = summary.next;
  const minutes = next ? Math.max(5, Math.round((totalSets(next) * 3) / 5) * 5) : 0;


  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={containerStyle}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Greeting />
        <ThemeToggle />
      </View>
      <Text style={{ color: palette.text, fontSize: 36, fontWeight: '800', marginTop: 6 }}>
        Ready to train?
      </Text>
      <Text style={{ color: palette.muted, fontSize: 16, marginTop: 4, marginBottom: 28 }}>
        {summary.subtitle}
      </Text>

      {/* HERO: up next */}
      {next ? ( // CHANGED (was: workout ?)
        <LinearGradient
          //colors={['#1E6B50', '#0F2A22', '#0B0D10']}
          colors={['#6b1e1e', '#2a0f0f', '#0b0d10']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 28, padding: 24, marginBottom: 16 }}
        >
          <Text style={{ ...label, color: palette.accent }}>{summary.kicker}</Text>
          <Text style={{ color: palette.cardText, fontSize: 28, fontWeight: '800', marginTop: 8 }}>
            {next.title}
          </Text>
          <Text style={{ color: palette.muted, marginTop: 4, marginBottom: 16 }}>
            {next.exercises.length} exercises · about {minutes} min
          </Text>

          {next.exercises.map((ex, i) => (
            <View
              key={`${ex.name}-${i}`} // CHANGED: custom plans could repeat a name
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 11,
                borderTopWidth: 1,
                borderTopColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <Text style={{ color: palette.accent, fontWeight: '800', width: 34 }}>
                {String(i + 1).padStart(2, '0')}
              </Text>
              <Text style={{ color: palette.cardText, fontSize: 16, flex: 1 }}>{ex.name}</Text>
              <Text style={{ color: palette.muted }}>
                {ex.sets} × {ex.reps}
              </Text>
            </View>
          ))}

          <Pressable
            onPress={() =>
              router.push({
                pathname: '/workout',
                params: { mode: next.mode, week: String(next.week), day: String(next.day) }, // CHANGED: now includes the plan type
              } as any)
            }
            style={{
              backgroundColor: palette.accent,
              padding: 16,
              borderRadius: 16,
              marginTop: 20,
              shadowColor: palette.accent,
              shadowOpacity: 0.45,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            <Text style={{ color: palette.accentText, textAlign: 'center', fontSize: 17, fontWeight: '800' }}>
              Start workout
            </Text>
          </Pressable>
        </LinearGradient>
      ) : (

        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: 28,
            padding: 24,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: palette.border,
            
          }}
        >
          <Text style={{ color: palette.text, fontSize: 24, fontWeight: '800', marginBottom: 6 }}>
            4 weeks complete 🎉
          </Text>
          <Text style={{ color: palette.muted, lineHeight: 22 }}>
            You finished the whole block. Review how it went and build your next one.
          </Text>
          <Pressable
            onPress={() => router.push('/review' as any)}
            style={{ backgroundColor: palette.accent, padding: 16, borderRadius: 16, marginTop: 16 }}
          >
            <Text style={{ color: palette.accentText, textAlign: 'center', fontSize: 17, fontWeight: '800' }}>
              Review my block
            </Text>
          </Pressable>
        </View>
      )}

      {/* STAT TILES */}
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: palette.surface,
            borderRadius: 22,
            padding: 18,
            marginRight: 8,
            shadowColor: palette.shadowCol,
            shadowOpacity: 0.45,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <Text style={{ color: palette.text, fontSize: 40, fontWeight: '800' }}>{summary.completed}</Text>
          <Text style={label}>WORKOUTS DONE</Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: palette.surface,
            borderRadius: 22,
            padding: 18,
            marginLeft: 8,
            shadowColor: palette.shadowCol,
            shadowOpacity: 0.45,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <Text style={{ color: palette.text, fontSize: 40, fontWeight: '800' }}>
            {summary.statValue}
            {summary.statSuffix ? (
              <Text style={{ color: palette.muted, fontSize: 20 }}> {summary.statSuffix}</Text>
            ) : null}
          </Text>
          <Text style={label}>{summary.statLabel}</Text>
        </View>
      </View>

      {/* PERIOD PROGRESS (was "This week"): segmented progress */}
      <View
        style={{
          backgroundColor: palette.surface,
          borderRadius: 24,
          padding: 20,
          marginBottom: 16,
          shadowColor: palette.shadowCol,
          shadowOpacity: 0.45,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
          <Text style={{ color: palette.text, fontSize: 17, fontWeight: '700' }}>{summary.periodLabel}</Text>
          <Text style={{ color: palette.accent, fontWeight: '700' }}>
            {summary.periodDone} of {summary.periodTotal} sessions
          </Text>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          {Array.from({ length: summary.periodTotal }).map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                marginRight: i < summary.periodTotal - 1 ? 6 : 0,
                backgroundColor: i < summary.periodDone ? palette.accent : palette.border,
              }}
            />
          ))}
        </View>
        <Text style={{ ...label, color: palette.accent, marginBottom: 6 }}>{summary.noteLabel}</Text>
        <Text style={{ color: palette.muted, lineHeight: 22 }}>{summary.note}</Text>
      </View>

      {/* COACH: chat-bubble shape (unchanged) */}
      <LinearGradient
          colors={['#130707', '#842727', '#571414','#f85959','#390d0d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 28, padding: 24, marginBottom: 16 }}
        >
        <Pressable onPress={() => router.push('/coach' as any)}>
        <View
          style={{
            //backgroundColor: palette.surfaceAlt,
            borderTopLeftRadius: 25,
            borderTopRightRadius: 25,
            borderBottomLeftRadius: 25,
            borderBottomRightRadius: 25,
            //padding: 20,
            marginBottom: 20,
            shadowColor: palette.shadowCol,
            shadowOpacity: 0.45,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: palette.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}
            >
              <Text style={{ color: palette.accent, fontSize: 16 }}>✦</Text>
            </View>
            <Text style={{ color: palette.cardText, fontSize: 17, fontWeight: '700', flex: 1 }}>Personal Coach</Text>
            <Text style={{ ...label, color: palette.cardText }}>ASK ME</Text>
          </View>
          <Text style={{ color: palette.muted, lineHeight: 22, marginBottom: 14 }}>
            Questions about form, swaps, or soreness? Ask anytime.
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: palette.background,
              borderRadius: 22,
              paddingVertical: 10,
              paddingHorizontal: 16,
              shadowColor: palette.shadowCol,
              shadowOpacity: 0.45,
              shadowRadius: 5,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            <Text style={{ color: palette.muted, flex: 1 }}>Type here...</Text>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: palette.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: palette.accentText, fontWeight: '800' }}>↑</Text>
            </View>
          </View>
        </View>
        </Pressable>
      </LinearGradient>
    </ScrollView>
  );
}