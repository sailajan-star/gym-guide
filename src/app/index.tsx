import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

type Exercise = {
  id: number;
  name: string;
  muscle_group: string;
  equipment: string;
};

export default function HomeScreen() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadExercises() {
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name, muscle_group, equipment');

      if (error) setError(error.message);
      else setExercises(data ?? []);
      setLoading(false);
    }
    loadExercises();
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (error) return <Text style={{ padding: 40, color: 'red', backgroundColor: 'white' }}>Error: {error}</Text>;

  return (
  <View style={{ flex: 1, backgroundColor: 'white', paddingTop: 60 }}>
    <Link href="/onboarding" style={{ color: 'blue', fontSize: 18, padding: 16 }}>
      Set up my plan →
    </Link>
    <Link href={'/plan' as any} style={{ color: 'blue', fontSize: 18, padding: 16 }}>
      View my plan →
    </Link>
    <Text style={{ color: 'black', fontSize: 22, padding: 16 }}>
      Exercises loaded: {exercises.length}
    </Text>
    <FlatList
      data={exercises}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#ddd' }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: 'black' }}>{item.name}</Text>
          <Text style={{ color: 'black' }}>{item.muscle_group} · {item.equipment}</Text>
        </View>
      )}
    />
  </View>
  );
}