import CoachOrb from '@/components/CoachOrb';
import MuscleMap from '@/components/MuscleMap';
import ThemeToggle from '@/components/ThemeToggle';
import { labelStyle, useTheme } from '@/constants/app-theme';
import { useTabBarClearance } from '@/constants/tab-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { getHomeSummary, loadPlanState, PlanState, totalSets, WorkoutExercise } from '../../../lib/activePlan';
import { loadMuscleInfo, MuscleInfo } from '../../../lib/muscleData';
import { muscleLabel } from '../../../lib/muscles';

const HERO = ['#6b1e1e', '#2a0f0f', '#0b0d10'] as const;
const COACH = ['#130707', '#842727', '#571414', '#f85959', '#390d0d'] as const;

function timeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

// Fades and slides a card in
function Reveal({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 520,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View
      style={{
        opacity: v,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

function TopRow() {
  const { palette } = useTheme();
  const label = labelStyle(palette);
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <View>
        <Text style={label}>
          <Text style={{ color: palette.text }}>GOOD </Text>
          <Text style={{ color: palette.accent }}>{timeOfDay().toUpperCase()}</Text>
        </Text>
        <Text style={{ color: palette.text, fontSize: 13, marginTop: 3 }}>{date}</Text>
      </View>
      <ThemeToggle />
    </View>
  );
}

// Animated ring showing sessions done
function ProgressRing({ done, total, size = 112 }: { done: number; total: number; size?: number }) {
  const { palette } = useTheme();
  const [p, setP] = useState(0);
  const target = total > 0 ? Math.min(1, done / total) : 0;

  useEffect(() => {
    const v = new Animated.Value(0);
    const id = v.addListener(({ value }) => setP(value));
    Animated.timing(v, {
      toValue: target,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => {
      v.removeListener(id);
      v.stopAnimation();
    };
  }, [target]);

  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={palette.border} strokeWidth={stroke} fill="none" />
        {p > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={palette.accent}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${c * p} ${c}`}
          />
        ) : null}
      </Svg>
      <Text style={{ color: palette.text, fontSize: 30, fontWeight: '800' }}>
        {done}
        <Text style={{ color: palette.muted, fontSize: 16 }}>/{total}</Text>
      </Text>
    </View>
  );
}

// Muscles a workout will train: main muscles bright, helping muscles lighter
function targetMuscles(exs: WorkoutExercise[], info: MuscleInfo) {
  const map = new Map<string, number>();
  const primary: string[] = [];
  for (const e of exs) {
    const m = info[e.name];
    if (!m) continue;
    m.secondary.forEach((s) => {
      if (!map.has(s)) map.set(s, 2);
    });
    m.primary.forEach((s) => {
      map.set(s, 4);
      if (!primary.includes(s)) primary.push(s);
    });
  }
  return { data: Array.from(map, ([slug, intensity]) => ({ slug, intensity })), primary };
}

export default function HomeScreen() {
  const { palette } = useTheme();
  const label = labelStyle(palette);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  const [state, setState] = useState<PlanState | null>(null);
  const [muscles, setMuscles] = useState<{ data: { slug: string; intensity: number }[]; primary: string[] }>({
    data: [],
    primary: [],
  });

  async function load() {
    const s = await loadPlanState();
    setState(s);
    const sum = getHomeSummary(s);
    if (sum?.next) {
      try {
        const info = await loadMuscleInfo();
        setMuscles(targetMuscles(sum.next.exercises, info));
      } catch {
        // the card still works without the body map
      }
    } else {
      setMuscles({ data: [], primary: [] });
    }
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  if (!state) return <View style={{ flex: 1, backgroundColor: palette.background }} />;

  const summary = getHomeSummary(state);
  const containerStyle = { padding: 24, paddingTop: insets.top + 20, paddingBottom: clearance };
  const shadow = {
    shadowColor: palette.shadowCol,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  } as const;

  const glow = (
    <LinearGradient
      pointerEvents="none"
      colors={[palette.heroGradient[0], palette.background]}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 420, opacity: 0.5 }}
    />
  );

  // ---------- FIRST-TIME ----------
  if (!summary) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        {glow}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={containerStyle}
          showsVerticalScrollIndicator={false}
        >
          <TopRow />
          <Text style={{ color: palette.text, fontSize: 38, fontWeight: '800', marginTop: 10, marginBottom: 28 }}>
            Let's get you <Text style={{ color: palette.accent }}>started.</Text>
          </Text>

          <Reveal delay={80}>
            <LinearGradient
              colors={HERO}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 28, padding: 24, marginBottom: 16, borderWidth: 0, borderColor: '#5e1f1f' }}
            >
              <Text style={{ color: palette.cardText, fontSize: 24, fontWeight: '800', marginBottom: 8 }}>
                Build your plan
              </Text>
              <Text style={{ color: palette.muted, fontSize: 16, lineHeight: 22, marginBottom: 24 }}>
                Five quick questions, then a simple 4-week plan. No guesswork.
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
          </Reveal>

          <Reveal delay={180}>
            <View
              style={{
                backgroundColor: palette.surface,
                borderRadius: 24,
                padding: 20,
                borderWidth: 0,
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
                style={{ borderWidth: 0, borderColor: palette.accent, padding: 14, borderRadius: 16 }}
              >
                <Text style={{ color: palette.accent, textAlign: 'center', fontSize: 16, fontWeight: '800' }}>
                  Build my own plan
                </Text>
              </Pressable>
            </View>
          </Reveal>
        </ScrollView>
      </View>
    );
  }

  // ---------- MAIN ----------
  const next = summary.next;
  const minutes = next ? Math.max(5, Math.round((totalSets(next) * 3) / 5) * 5) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      {glow}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={containerStyle} showsVerticalScrollIndicator={false}>
        <Reveal>
          <TopRow />
          <Text style={{ color: palette.text, fontSize: 25, fontWeight: '800', marginTop: 10 }}>
          </Text>
        </Reveal>

        {/* HERO */}
        <Reveal delay={80}>
          {next ? (
            <LinearGradient
              colors={HERO}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 28, padding: 24, marginBottom: 16, overflow: 'hidden' }}
            >
              <View style={{ minHeight: 190 }}>
                {/* Body map: lights up the muscles in today's workout */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    right: -6,
                    top: -6,
                    width: 120,
                    height: 210,
                    overflow: 'hidden',
                    alignItems: 'center',
                    shadowColor: '#000000',
                    shadowOpacity: 1,
                    shadowRadius: 9,
                    shadowOffset: { width: 0, height: 4 },
                  }}
                >
                  {muscles.data.length > 0 ? <MuscleMap data={muscles.data} showToggle={false} scale={0.53} /> : null}
                </View>

                <View style={{ paddingRight: 112 }}>
                  <Text style={{ ...label, color: palette.accent }}>{summary.kicker}</Text>
                  <Text style={{ color: palette.cardText, fontSize: 30, fontWeight: '800', marginTop: 8 }}>
                    {next.title}
                  </Text>
                  
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {muscles.primary.slice(0, 4).map((m) => (
                      <View
                        key={m}
                        style={{
                          borderWidth: 0,
                          borderColor: 'rgba(255,255,255,0.2)',
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          borderRadius: 12,
                          marginTop: 12,
                          paddingVertical: 4,
                          paddingHorizontal: 10,
                          marginRight: 6,
                          marginBottom: 6,
                        }}
                      >
                        <Text style={{ color: palette.cardText, fontSize: 12, fontWeight: '700' }}>
                          {muscleLabel(m)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <View style={{ marginTop: 6 }}>
                {next.exercises.map((ex, i) => (
                  <View
                    key={`${ex.name}-${i}`}
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
              </View>

              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/workout',
                    params: { mode: next.mode, week: String(next.week), day: String(next.day) },
                  } as any)
                }
                style={{
                  backgroundColor: palette.accent,
                  padding: 16,
                  borderRadius: 16,
                  marginTop: 18,
                  shadowColor: palette.accent,
                  shadowOpacity: 0.5,
                  shadowRadius: 18,
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
                borderWidth: 0,
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
        </Reveal>

        {/* RING + STATS */}
        <Reveal delay={180}>
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            <View
              style={{
                flex: 1,
                marginRight: 8,
                backgroundColor: palette.surface,
                borderRadius: 24,
                padding: 18,
                alignItems: 'center',
                borderWidth: 0,
                borderColor: palette.border,
                ...shadow,
              }}
            >
              <ProgressRing done={summary.periodDone} total={summary.periodTotal} />
              <Text style={{ color: palette.text, fontSize: 15, fontWeight: '700', marginTop: 12 }}>
                {summary.periodLabel}
              </Text>
              <Text style={{ color: palette.muted, fontSize: 12, marginTop: 2 }}>sessions done</Text>
            </View>

            <View style={{ flex: 1, marginLeft: 8 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: palette.surface,
                  borderRadius: 22,
                  padding: 18,
                  marginBottom: 8,
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: palette.border,
                  ...shadow,
                }}
              >
                <Text style={{ color: palette.text, fontSize: 34, fontWeight: '800' }}>{summary.completed}</Text>
                <Text style={label}>WORKOUTS DONE</Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: palette.surface,
                  borderRadius: 22,
                  padding: 18,
                  marginTop: 8,
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: palette.border,
                  ...shadow,
                }}
              >
                <Text style={{ color: palette.text, fontSize: 34, fontWeight: '800' }}>
                  {summary.statValue}
                  {summary.statSuffix ? (
                    <Text style={{ color: palette.muted, fontSize: 18 }}> {summary.statSuffix}</Text>
                  ) : null}
                </Text>
                <Text style={label}>{summary.statLabel}</Text>
              </View>
            </View>
          </View>
        </Reveal>

        {/* FOCUS */}
        <Reveal delay={260}>
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: palette.surface,
              borderRadius: 22,
              marginBottom: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: palette.border,
              ...shadow,
            }}
          >
            <View style={{ width: 4, backgroundColor: palette.accent }} />
            <View style={{ flex: 1, padding: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="sparkles" size={14} color={palette.accent} />
                <Text style={{ ...label, color: palette.accent, marginLeft: 6 }}>{summary.noteLabel}</Text>
              </View>
              <Text style={{ color: palette.muted, lineHeight: 22 }}>{summary.note}</Text>
            </View>
          </View>
        </Reveal>

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
    </View>
  );
}