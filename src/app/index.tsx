import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '@/constants/palette';
import { buildWeek, WEEK_NOTES } from '../../lib/program';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const card = {
  backgroundColor: palette.card,
  borderRadius: 20,
  padding: 20,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: palette.border,
} as const;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Record<string, string> | null>(null);
  const [completed, setCompleted] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Reload every time the screen comes back into view (e.g. after a workout)
  useFocusEffect(
    useCallback(() => {
      async function load() {
        const p = await AsyncStorage.getItem('profile');
        const l = await AsyncStorage.getItem('workoutLogs');
        setProfile(p ? JSON.parse(p) : null);
        setCompleted(l ? JSON.parse(l).length : 0);
        setLoaded(true);
      }
      load();
    }, [])
  );

  if (!loaded) return <View style={{ flex: 1, backgroundColor: palette.background }} />;

  const containerStyle = { padding: 24, paddingTop: insets.top + 24, paddingBottom: 48 };

  // First-time user
  if (!profile) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={containerStyle}>
        <Text style={{ color: palette.muted, fontSize: 16 }}>{greeting()}</Text>
        <Text style={{ color: palette.text, fontSize: 32, fontWeight: '800', marginBottom: 24 }}>
          Let's get you started
        </Text>
        <View style={{ ...card, backgroundColor: palette.primary, borderColor: palette.primary }}>
          <Text style={{ color: palette.primaryText, fontSize: 22, fontWeight: '700', marginBottom: 8 }}>
            Build your plan
          </Text>
          <Text style={{ color: palette.primaryText, opacity: 0.9, marginBottom: 20 }}>
            Four quick questions, and we'll set up a simple 4-week plan. No guesswork.
          </Text>
          <Pressable
            onPress={() => router.push('/onboarding' as any)}
            style={{ backgroundColor: 'white', padding: 14, borderRadius: 12 }}
          >
            <Text style={{ color: palette.primary, textAlign: 'center', fontSize: 17, fontWeight: '700' }}>
              Get started
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // Which workout is next?
  const days = parseInt(profile.days, 10);
  const totalWorkouts = days * 4;
  const finished = completed >= totalWorkouts;
  const weekIdx = Math.min(Math.floor(completed / days), 3);
  const dayIdx = completed % days;
  const workout = finished ? null : buildWeek(profile.equipment, days, weekIdx)[dayIdx];
  const doneThisWeek = finished ? days : dayIdx;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={containerStyle}>
      <Text style={{ color: palette.muted, fontSize: 16 }}>{greeting()}</Text>
      <Text style={{ color: palette.text, fontSize: 32, fontWeight: '800', marginBottom: 4 }}>
        Ready to train?
      </Text>
      <Text style={{ color: palette.muted, marginBottom: 24 }}>Goal: {profile.goal}</Text>

      {/* Up next */}
      {workout ? (
        <View style={{ ...card, backgroundColor: palette.primary, borderColor: palette.primary }}>
          <Text style={{ color: palette.primaryText, opacity: 0.8, fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>
            UP NEXT · WEEK {weekIdx + 1} OF 4
          </Text>
          <Text style={{ color: palette.primaryText, fontSize: 24, fontWeight: '800', marginTop: 6 }}>
            {workout.label}
          </Text>
          <Text style={{ color: palette.primaryText, opacity: 0.9, marginTop: 4, marginBottom: 16 }}>
            {workout.exercises.length} exercises · about {workout.exercises.length * 8} min
          </Text>
          {workout.exercises.map((ex) => (
            <Text key={ex.name} style={{ color: palette.primaryText, opacity: 0.9, paddingVertical: 2 }}>
              • {ex.name}
            </Text>
          ))}
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/workout',
                params: { week: String(weekIdx), day: String(dayIdx) },
              } as any)
            }
            style={{ backgroundColor: 'white', padding: 14, borderRadius: 12, marginTop: 20 }}
          >
            <Text style={{ color: palette.primary, textAlign: 'center', fontSize: 17, fontWeight: '700' }}>
              Start workout
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={card}>
          <Text style={{ color: palette.text, fontSize: 22, fontWeight: '800', marginBottom: 6 }}>
            4 weeks complete 🎉
          </Text>
          <Text style={{ color: palette.muted }}>
            You finished the whole block. Next up, we'll add a review and a fresh plan.
          </Text>
        </View>
      )}

      {/* This week */}
      <View style={card}>
        <Text style={{ color: palette.text, fontSize: 17, fontWeight: '700', marginBottom: 12 }}>This week</Text>
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          {Array.from({ length: days }).map((_, i) => (
            <View
              key={i}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                marginRight: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: i < doneThisWeek ? palette.primary : palette.primarySoft,
              }}
            >
              <Text style={{ color: i < doneThisWeek ? palette.primaryText : palette.primary, fontWeight: '700' }}>
                {i < doneThisWeek ? '✓' : i + 1}
              </Text>
            </View>
          ))}
        </View>
        <Text style={{ color: palette.muted }}>{WEEK_NOTES[weekIdx]}</Text>
      </View>

      {/* Coach placeholder */}
      <View style={{ ...card, opacity: 0.7 }}>
        <Text style={{ color: palette.text, fontSize: 17, fontWeight: '700', marginBottom: 4 }}>
          Ask your coach
        </Text>
        <Text style={{ color: palette.muted }}>
          Questions about form, swaps, or soreness? Coming soon.
        </Text>
      </View>

      <Pressable onPress={() => router.push('/plan' as any)} style={{ padding: 8 }}>
        <Text style={{ color: palette.primary, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
          See my full plan →
        </Text>
      </Pressable>

      <Pressable onPress={() => router.push('/onboarding' as any)} style={{ padding: 8 }}>
        <Text style={{ color: palette.muted, fontSize: 15, textAlign: 'center' }}>
          Change my answers
        </Text>
      </Pressable>

      {/* Testing helper: remove later */}
      <Pressable
        onPress={async () => {
          await AsyncStorage.removeItem('workoutLogs');
          setCompleted(0);
        }}
        style={{ padding: 16, marginTop: 16 }}
      >
        <Text style={{ color: palette.muted, fontSize: 13, textAlign: 'center' }}>
          Reset progress (testing only)
        </Text>
      </Pressable>
    </ScrollView>
  );
}