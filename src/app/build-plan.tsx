import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import ExercisePickerModal, { Picked } from '@/components/ExercisePickerModal';
import { labelStyle, useTheme } from '@/constants/app-theme';
import { CustomPlan, loadCustomPlan, PlanDay, PlanExercise, saveCustomPlan, setPlanMode } from '../../lib/customPlan';

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { palette } = useTheme();
  const btn = {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  } as const;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable onPress={() => onChange(Math.max(1, value - 1))} style={btn}>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: '700' }}>−</Text>
      </Pressable>
      <Text style={{ color: palette.text, fontSize: 17, fontWeight: '800', minWidth: 30, textAlign: 'center' }}>
        {value}
      </Text>
      <Pressable onPress={() => onChange(Math.min(10, value + 1))} style={btn}>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: '700' }}>+</Text>
      </Pressable>
    </View>
  );
}

export default function BuildPlanScreen() {
  const { palette, mode } = useTheme();
  const label = labelStyle(palette);
  const router = useRouter();

  const [planName, setPlanName] = useState('My plan');
  const [days, setDays] = useState<PlanDay[]>([
    { name: 'Day 1', exercises: [] },
    { name: 'Day 2', exercises: [] },
    { name: 'Day 3', exercises: [] },
  ]);
  const [active, setActive] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  // If a plan already exists, load it for editing
  useEffect(() => {
    loadCustomPlan().then((p) => {
      if (p) {
        setPlanName(p.name);
        setDays(p.days);
      }
    });
  }, []);

  const day = days[active];

  const input = {
    color: palette.text,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    padding: 14,
    fontSize: 17,
    marginBottom: 20,
  } as const;

  function updateExercises(fn: (ex: PlanExercise[]) => PlanExercise[]) {
    setDays((prev) => prev.map((d, i) => (i === active ? { ...d, exercises: fn(d.exercises) } : d)));
  }

  function addExercise(p: Picked) {
    setPickerOpen(false);
    if (day.exercises.some((e) => e.name === p.name)) {
      Alert.alert('Already added', `${p.name} is already in this day.`);
      return;
    }
    updateExercises((ex) => [
      ...ex,
      { name: p.name, sets: 3, reps: p.timed ? '30 sec' : '10', custom: p.custom || undefined, timed: p.timed || undefined },
    ]);
  }

  function patch(index: number, change: Partial<PlanExercise>) {
    updateExercises((ex) => ex.map((e, i) => (i === index ? { ...e, ...change } : e)));
  }

  function remove(index: number) {
    updateExercises((ex) => ex.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    updateExercises((ex) => {
      const target = index + dir;
      if (target < 0 || target >= ex.length) return ex;
      const copy = [...ex];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  function addDay() {
    if (days.length >= 7) return;
    setDays([...days, { name: `Day ${days.length + 1}`, exercises: [] }]);
    setActive(days.length);
  }

  function removeDay() {
    if (days.length <= 1) return;
    const doRemove = () => {
      setDays((prev) => prev.filter((_, i) => i !== active));
      setActive((a) => Math.max(0, a - 1));
    };
    if (day.exercises.length > 0) {
      Alert.alert('Remove this day?', 'Its exercises will be deleted.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doRemove },
      ]);
    } else {
      doRemove();
    }
  }

  async function save() {
    const name = planName.trim();
    if (!name) {
      Alert.alert('Name your plan', 'Give your plan a name first.');
      return;
    }
    const empty = days.findIndex((d) => d.exercises.length === 0);
    if (empty >= 0) {
      setActive(empty);
      Alert.alert('Add exercises', `${days[empty].name.trim() || `Day ${empty + 1}`} has no exercises yet.`);
      return;
    }
    const plan: CustomPlan = {
      name,
      days: days.map((d, i) => ({
        name: d.name.trim() || `Day ${i + 1}`,
        exercises: d.exercises.map((e) => ({ ...e, reps: e.reps.trim() || '10' })),
      })),
    };
    await saveCustomPlan(plan);
    await setPlanMode('custom');
    router.replace('/');
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: 56 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ color: palette.text, fontSize: 32, fontWeight: '800', marginBottom: 4 }}>Build your plan</Text>
      <Text style={{ color: palette.muted, lineHeight: 22, marginBottom: 24 }}>
        Add the days and exercises from your own program. Your plan repeats as a cycle.
      </Text>

      <Text style={{ ...label, marginBottom: 6 }}>PLAN NAME</Text>
      <TextInput
        value={planName}
        onChangeText={setPlanName}
        placeholder="e.g. Push Pull Legs"
        placeholderTextColor={palette.muted}
        keyboardAppearance={mode}
        style={input}
      />

      {/* Day tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 16 }}>
        {days.map((d, i) => (
          <Pressable
            key={i}
            onPress={() => setActive(i)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 20,
              marginRight: 8,
              backgroundColor: active === i ? palette.accent : palette.surface,
              borderWidth: 1,
              borderColor: active === i ? palette.accent : palette.border,
            }}
          >
            <Text style={{ color: active === i ? palette.accentText : palette.text, fontWeight: '700' }}>
              Day {i + 1}
            </Text>
          </Pressable>
        ))}
        {days.length < 7 ? (
          <Pressable
            onPress={addDay}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: palette.accent,
              borderStyle: 'dashed',
            }}
          >
            <Text style={{ color: palette.accent, fontWeight: '700' }}>+ Add day</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Active day */}
      <View
        style={{
          backgroundColor: palette.surface,
          borderRadius: 24,
          padding: 20,
          borderWidth: 1,
          borderColor: palette.border,
          marginBottom: 20,
        }}
      >
        <Text style={{ ...label, marginBottom: 6 }}>DAY NAME</Text>
        <TextInput
          value={day.name}
          onChangeText={(t) => setDays((prev) => prev.map((d, i) => (i === active ? { ...d, name: t } : d)))}
          placeholder="e.g. Push, Legs, Upper body"
          placeholderTextColor={palette.muted}
          keyboardAppearance={mode}
          style={{ ...input, backgroundColor: palette.surfaceAlt, marginBottom: 16 }}
        />

        <Text style={{ ...label, marginBottom: 10 }}>EXERCISES</Text>

        {day.exercises.length === 0 ? (
          <Text style={{ color: palette.muted, marginBottom: 14, lineHeight: 22 }}>
            Nothing here yet. Add your first exercise below.
          </Text>
        ) : null}

        {day.exercises.map((ex, i) => (
          <View
            key={`${ex.name}-${i}`}
            style={{
              backgroundColor: palette.surfaceAlt,
              borderRadius: 18,
              padding: 14,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700', flex: 1 }}>{ex.name}</Text>
              {ex.custom ? (
                <View
                  style={{
                    backgroundColor: palette.accentSoft,
                    borderRadius: 10,
                    paddingVertical: 2,
                    paddingHorizontal: 8,
                    marginRight: 12,
                  }}
                >
                  <Text style={{ color: palette.accent, fontSize: 11, fontWeight: '800' }}>CUSTOM</Text>
                </View>
              ) : null}
              <Pressable onPress={() => remove(i)} hitSlop={10}>
                <Text style={{ color: palette.muted, fontSize: 18 }}>✕</Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <Stepper value={ex.sets} onChange={(n) => patch(i, { sets: n })} />
              <Text style={{ color: palette.muted, marginHorizontal: 10, fontSize: 16 }}>×</Text>
              <TextInput
                value={ex.reps}
                onChangeText={(t) => patch(i, { reps: t })}
                placeholder="10"
                placeholderTextColor={palette.muted}
                keyboardAppearance={mode}
                maxLength={12}
                style={{
                  color: palette.text,
                  backgroundColor: palette.surface,
                  borderWidth: 1,
                  borderColor: palette.border,
                  borderRadius: 12,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  width: 92,
                  textAlign: 'center',
                  fontSize: 16,
                }}
              />
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => move(i, -1)} hitSlop={8} style={{ padding: 8 }}>
                <Text style={{ color: i === 0 ? palette.border : palette.text, fontSize: 18 }}>↑</Text>
              </Pressable>
              <Pressable onPress={() => move(i, 1)} hitSlop={8} style={{ padding: 8 }}>
                <Text style={{ color: i === day.exercises.length - 1 ? palette.border : palette.text, fontSize: 18 }}>
                  ↓
                </Text>
              </Pressable>
            </View>
          </View>
        ))}

        {day.exercises.length > 0 ? (
          <Text style={{ color: palette.muted, fontSize: 12, marginBottom: 12 }}>
            Reps can be a number (10), a range (8-12), or a time (30 sec).
          </Text>
        ) : null}

        <Pressable
          onPress={() => setPickerOpen(true)}
          style={{ backgroundColor: palette.accentSoft, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: palette.accent }}
        >
          <Text style={{ color: palette.accent, textAlign: 'center', fontWeight: '800', fontSize: 16 }}>
            + Add exercise
          </Text>
        </Pressable>

        {days.length > 1 ? (
          <Pressable onPress={removeDay} style={{ padding: 12, marginTop: 8 }}>
            <Text style={{ color: palette.muted, textAlign: 'center' }}>Remove this day</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable onPress={save} style={{ backgroundColor: palette.accent, padding: 16, borderRadius: 16 }}>
        <Text style={{ color: palette.accentText, textAlign: 'center', fontSize: 17, fontWeight: '800' }}>
          Save plan
        </Text>
      </Pressable>

      <ExercisePickerModal visible={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={addExercise} />
    </ScrollView>
  );
}