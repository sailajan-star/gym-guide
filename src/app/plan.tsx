import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { buildWeek, PlannedDay, PlannedExercise, SETS_BY_WEEK, WEEK_NOTES } from '../../lib/program';

export default function PlanScreen() {
  const [profile, setProfile] = useState<Record<string, string> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [week, setWeek] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem('profile').then((value) => {
      if (value) setProfile(JSON.parse(value));
      setLoaded(true);
    });
  }, []);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: 'white' }} />;

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 24, paddingTop: 80 }}>
        <Text style={{ color: 'black', fontSize: 18, marginBottom: 16 }}>
          You haven't set up your plan yet.
        </Text>
        <Link href={'/onboarding' as any} style={{ color: 'blue', fontSize: 18 }}>
          Set up my plan →
        </Link>
      </View>
    );
  }

  const days = buildWeek(profile.equipment, parseInt(profile.days, 10), week);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 24, paddingTop: 70 }}>
      <Text style={{ color: 'black', fontSize: 28, fontWeight: '700' }}>Your 4-week plan</Text>
      <Text style={{ color: 'gray', marginBottom: 16 }}>
        {profile.days} days a week · {profile.equipment}
      </Text>

      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        {[0, 1, 2, 3].map((w) => (
          <Pressable
            key={w}
            onPress={() => setWeek(w)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 20,
              marginRight: 8,
              backgroundColor: week === w ? 'black' : '#eee',
            }}
          >
            <Text style={{ color: week === w ? 'white' : 'black' }}>Week {w + 1}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ color: 'black', marginBottom: 20 }}>{WEEK_NOTES[week]}</Text>

      {days.map((day: PlannedDay) => (
        <View key={day.label} style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <Text style={{ color: 'black', fontSize: 18, fontWeight: '600', marginBottom: 8 }}>{day.label}</Text>
          {day.exercises.map((ex: PlannedExercise) => (
            <Text key={ex.name} style={{ color: 'black', paddingVertical: 3 }}>
              {ex.name}: {SETS_BY_WEEK[week]} sets × {ex.reps}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}