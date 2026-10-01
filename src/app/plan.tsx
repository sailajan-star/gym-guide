import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { palette } from '@/constants/palette';
import { buildWeek, PlannedDay, PlannedExercise, SETS_BY_WEEK, WEEK_NOTES } from '../../lib/program';

export default function PlanScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Record<string, string> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [week, setWeek] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem('profile').then((value) => {
      if (value) setProfile(JSON.parse(value));
      setLoaded(true);
    });
  }, []);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: palette.background }} />;

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background, padding: 24 }}>
        <Text style={{ color: palette.text, fontSize: 20, fontWeight: '700', marginBottom: 16 }}>
          You haven't set up your plan yet.
        </Text>
        <Pressable
          onPress={() => router.push('/onboarding' as any)}
          style={{ backgroundColor: palette.accent, padding: 16, borderRadius: 16 }}
        >
          <Text style={{ color: palette.accentText, textAlign: 'center', fontSize: 17, fontWeight: '800' }}>
            Set up my plan
          </Text>
        </Pressable>
      </View>
    );
  }

  const days = buildWeek(profile.equipment, parseInt(profile.days, 10), week);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: 56 }}
    >
      <Text style={{ color: palette.text, fontSize: 32, fontWeight: '800' }}>Your 4-week plan</Text>
      <Text style={{ color: palette.muted, marginTop: 4, marginBottom: 20 }}>
        {profile.days} days a week · {profile.equipment}
      </Text>

      {/* Week pills */}
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

      {/* Focus */}
      <View
        style={{
          backgroundColor: palette.accentSoft,
          borderRadius: 20,
          padding: 18,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: '#1F5E48',
        }}
      >
        <Text style={{ color: palette.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 }}>
          THIS WEEK'S FOCUS
        </Text>
        <Text style={{ color: palette.text, lineHeight: 22 }}>{WEEK_NOTES[week]}</Text>
      </View>

      {days.map((day: PlannedDay, index: number) => (
        <Pressable
          key={day.label}
          onPress={() =>
            router.push({
              pathname: '/workout',
              params: { week: String(week), day: String(index) },
            } as any)
          }
          style={{
            backgroundColor: palette.surface,
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: palette.border,
          }}
        >
          <Text style={{ color: palette.text, fontSize: 20, fontWeight: '800', marginBottom: 12 }}>{day.label}</Text>
          {day.exercises.map((ex: PlannedExercise, i: number) => (
            <View
              key={ex.name}
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
                {SETS_BY_WEEK[week]} × {ex.reps}
              </Text>
            </View>
          ))}
          <Text style={{ color: palette.accent, fontWeight: '700', marginTop: 12 }}>Start workout →</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}