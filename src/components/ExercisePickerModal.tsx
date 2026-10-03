import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { labelStyle, useTheme } from '@/constants/app-theme';
import { CustomExercise, loadCustomExercises, saveCustomExercise } from '../../lib/customPlan';
import { supabase } from '../../lib/supabase';

export type Picked = { name: string; custom: boolean; timed: boolean };

type Item = { name: string; muscle_group: string; equipment: string; timed: boolean; custom: boolean };
type Props = { visible: boolean; onClose: () => void; onSelect: (e: Picked) => void };

const MUSCLES = ['legs', 'glutes', 'hamstrings', 'calves', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'core', 'cardio'];
const EQUIPMENT = ['bodyweight', 'dumbbell', 'barbell', 'kettlebell', 'resistance band', 'machine', 'cable', 'other'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function ExercisePickerModal({ visible, onClose, onSelect }: Props) {
  const { palette, mode } = useTheme();
  const label = labelStyle(palette);

  const [view, setView] = useState<'pick' | 'create'>('pick');
  const [library, setLibrary] = useState<Item[]>([]);
  const [customs, setCustoms] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState('All');
  const [equip, setEquip] = useState('All');

  // Create-exercise form
  const [name, setName] = useState('');
  const [newMuscle, setNewMuscle] = useState('');
  const [newEquip, setNewEquip] = useState('');
  const [timed, setTimed] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [cues, setCues] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setView('pick');
    setSearch('');
    setMuscle('All');
    setEquip('All');
    setError(null);

    async function load() {
      setLoading(true);
      const { data, error: dbError } = await supabase
        .from('exercises')
        .select('name, muscle_group, equipment, is_timed')
        .order('name');
      if (dbError) setError(dbError.message);
      else {
        setLibrary(
          (data ?? []).map((d) => ({
            name: d.name,
            muscle_group: d.muscle_group,
            equipment: d.equipment,
            timed: !!d.is_timed,
            custom: false,
          }))
        );
      }
      const c = await loadCustomExercises();
      setCustoms(
        c.map((e) => ({
          name: e.name,
          muscle_group: e.muscle_group,
          equipment: e.equipment,
          timed: e.is_timed,
          custom: true,
        }))
      );
      setLoading(false);
    }
    load();
  }, [visible]);

  const all = [...customs, ...library];
  const muscleOptions = ['All', ...Array.from(new Set(all.map((e) => e.muscle_group))).sort()];
  const equipOptions = ['All', ...Array.from(new Set(all.map((e) => e.equipment))).sort()];

  const q = search.trim().toLowerCase();
  const items = all
    .filter(
      (e) =>
        (!q || e.name.toLowerCase().includes(q)) &&
        (muscle === 'All' || e.muscle_group === muscle) &&
        (equip === 'All' || e.equipment === equip)
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const input = {
    color: palette.text,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    padding: 14,
    fontSize: 16,
    marginBottom: 14,
  } as const;

  function chip(text: string, active: boolean, onPress: () => void) {
    return (
      <Pressable
        key={text}
        onPress={onPress}
        style={{
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: 18,
          marginRight: 8,
          marginBottom: 8,
          backgroundColor: active ? palette.accent : palette.surface,
          borderWidth: 1,
          borderColor: active ? palette.accent : palette.border,
        }}
      >
        <Text style={{ color: active ? palette.accentText : palette.text, fontWeight: '700' }}>{cap(text)}</Text>
      </Pressable>
    );
  }

  function openCreate() {
    setName(search.trim());
    setFormError(null);
    setView('create');
  }

  async function saveCustom() {
    const trimmed = name.trim();
    if (trimmed.length < 2) return setFormError('Give your exercise a name.');
    const clash = all.some((e) => e.name.toLowerCase() === trimmed.toLowerCase());
    if (clash) {
      return setFormError('An exercise with that name already exists. Search for it in the list, or pick a different name.');
    }
    if (!newMuscle) return setFormError('Choose the main muscle group.');
    if (!newEquip) return setFormError('Choose the equipment.');

    const ex: CustomExercise = {
      name: trimmed,
      muscle_group: newMuscle,
      equipment: newEquip,
      instructions: instructions.trim() || 'No instructions added.',
      cues: cues.trim() || 'No cues added.',
      is_timed: timed,
    };
    await saveCustomExercise(ex);

    setName('');
    setNewMuscle('');
    setNewEquip('');
    setTimed(false);
    setInstructions('');
    setCues('');
    setFormError(null);
    onSelect({ name: ex.name, custom: true, timed: ex.is_timed });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 20,
            paddingBottom: 12,
          }}
        >
          <Text style={{ color: palette.text, fontSize: 22, fontWeight: '800' }}>
            {view === 'pick' ? 'Add exercise' : 'New custom exercise'}
          </Text>
          <Pressable onPress={view === 'pick' ? onClose : () => setView('pick')} hitSlop={10}>
            <Text style={{ color: palette.accent, fontSize: 16, fontWeight: '700' }}>
              {view === 'pick' ? 'Close' : 'Back'}
            </Text>
          </Pressable>
        </View>

        {view === 'pick' ? (
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search exercises"
              placeholderTextColor={palette.muted}
              keyboardAppearance={mode}
              style={input}
            />

            <Text style={{ ...label, marginBottom: 8 }}>MUSCLE GROUP</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              {muscleOptions.map((m) => chip(m, muscle === m, () => setMuscle(m)))}
            </ScrollView>

            <Text style={{ ...label, marginBottom: 8, marginTop: 4 }}>EQUIPMENT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 8 }}>
              {equipOptions.map((e) => chip(e, equip === e, () => setEquip(e)))}
            </ScrollView>

            <Pressable
              onPress={openCreate}
              style={{
                borderWidth: 1,
                borderColor: palette.accent,
                borderStyle: 'dashed',
                borderRadius: 18,
                padding: 14,
                marginBottom: 16,
                backgroundColor: palette.accentSoft,
              }}
            >
              <Text style={{ color: palette.accent, textAlign: 'center', fontWeight: '800', fontSize: 16 }}>
                + Create a custom exercise
              </Text>
            </Pressable>

            {loading ? <ActivityIndicator color={palette.accent} style={{ marginTop: 20 }} /> : null}
            {error ? <Text style={{ color: palette.danger, marginBottom: 12 }}>{error}</Text> : null}

            {!loading && items.length === 0 ? (
              <Text style={{ color: palette.muted, textAlign: 'center', lineHeight: 22, marginTop: 8 }}>
                No exercises match. Can't find yours? Create it as a custom exercise above.
              </Text>
            ) : null}

            {items.map((e) => (
              <Pressable
                key={`${e.custom ? 'c' : 'l'}-${e.name}`}
                onPress={() => onSelect({ name: e.name, custom: e.custom, timed: e.timed })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: palette.surface,
                  borderRadius: 18,
                  padding: 16,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: palette.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700' }}>{e.name}</Text>
                  <Text style={{ color: palette.muted, marginTop: 2 }}>
                    {cap(e.muscle_group)} · {cap(e.equipment)}
                  </Text>
                </View>
                {e.custom ? (
                  <View
                    style={{
                      backgroundColor: palette.accentSoft,
                      borderRadius: 10,
                      paddingVertical: 2,
                      paddingHorizontal: 8,
                      marginRight: 10,
                    }}
                  >
                    <Text style={{ color: palette.accent, fontSize: 11, fontWeight: '800' }}>CUSTOM</Text>
                  </View>
                ) : null}
                <Text style={{ color: palette.accent, fontSize: 22, fontWeight: '700' }}>＋</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
            <Text style={{ color: palette.muted, lineHeight: 22, marginBottom: 20 }}>
              Add an exercise from your own plan. It will be saved on this phone so you can reuse it, and your
              progress on it will be charted like any other exercise.
            </Text>

            <Text style={{ ...label, marginBottom: 6 }}>NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Hack Squat"
              placeholderTextColor={palette.muted}
              keyboardAppearance={mode}
              style={input}
            />

            <Text style={{ ...label, marginBottom: 8 }}>MAIN MUSCLE GROUP</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
              {MUSCLES.map((m) => chip(m, newMuscle === m, () => setNewMuscle(m)))}
            </View>

            <Text style={{ ...label, marginBottom: 8 }}>EQUIPMENT</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
              {EQUIPMENT.map((e) => chip(e, newEquip === e, () => setNewEquip(e)))}
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: palette.surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: palette.border,
                padding: 14,
                marginBottom: 14,
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: palette.text, fontWeight: '700' }}>Timed exercise</Text>
                <Text style={{ color: palette.muted, marginTop: 2 }}>Counted in seconds, like a plank or a walk.</Text>
              </View>
              <Switch
                value={timed}
                onValueChange={setTimed}
                trackColor={{ true: palette.accent, false: palette.border }}
              />
            </View>

            <Text style={{ ...label, marginBottom: 6 }}>HOW TO DO IT (OPTIONAL)</Text>
            <TextInput
              value={instructions}
              onChangeText={setInstructions}
              placeholder="A short description of the movement"
              placeholderTextColor={palette.muted}
              keyboardAppearance={mode}
              multiline
              style={{ ...input, minHeight: 90, textAlignVertical: 'top' }}
            />

            <Text style={{ ...label, marginBottom: 6 }}>FORM CUES (OPTIONAL)</Text>
            <TextInput
              value={cues}
              onChangeText={setCues}
              placeholder="Short reminders, e.g. chest up, controlled lowering"
              placeholderTextColor={palette.muted}
              keyboardAppearance={mode}
              multiline
              style={{ ...input, minHeight: 70, textAlignVertical: 'top' }}
            />

            <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 19, marginBottom: 16 }}>
              Custom exercises aren't checked by the app, so the form guide is only as good as what you write.
            </Text>

            {formError ? <Text style={{ color: palette.danger, marginBottom: 12 }}>{formError}</Text> : null}

            <Pressable onPress={saveCustom} style={{ backgroundColor: palette.accent, padding: 16, borderRadius: 16 }}>
              <Text style={{ color: palette.accentText, textAlign: 'center', fontSize: 17, fontWeight: '800' }}>
                Save and add to my plan
              </Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}