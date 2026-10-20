import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { labelStyle, useTheme } from '@/constants/app-theme';
import { Profile } from '../../lib/activePlan';
import { loadSwapOptions, SwapOption } from '../../lib/swap';

type Reason = 'busy' | 'off' | 'change';
export type SwapScope = 'today' | 'plan';

type Props = {
  visible: boolean;
  onClose: () => void;
  currentName: string;
  inWorkout: string[];
  profile: Profile | null;
  mode: 'guided' | 'custom';
  onConfirm: (option: SwapOption, scope: SwapScope) => void;
};

const REASONS: { key: Reason; text: string }[] = [
  { key: 'busy', text: 'Equipment is busy' },
  { key: 'off', text: 'Something feels off' },
  { key: 'change', text: 'Just a change' },
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function SwapModal({ visible, onClose, currentName, inWorkout, profile, mode, onConfirm }: Props) {
  const { palette } = useTheme();
  const label = labelStyle(palette);
  const [reason, setReason] = useState<Reason>('change');
  const [options, setOptions] = useState<SwapOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setReason('change');
      setSelected(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setSelected(null);
    loadSwapOptions(currentName, inWorkout, profile, reason === 'busy').then((res) => {
      if (cancelled) return;
      setOptions(res.options);
      setMessage(
        res.error ?? (res.options.length === 0 ? 'Nothing else fits your equipment and limitations.' : null)
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, reason, currentName]);

  const chosen = options.find((o) => o.name === selected);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 20,
            paddingBottom: 8,
          }}
        >
          <Text style={{ color: palette.text, fontSize: 22, fontWeight: '800' }}>Swap exercise</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={{ color: palette.accent, fontSize: 16, fontWeight: '700' }}>Close</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 32 }}>
          <Text style={{ color: palette.muted, marginBottom: 16 }}>
            Swapping out: <Text style={{ color: palette.text, fontWeight: '700' }}>{currentName}</Text>
          </Text>

          <Text style={{ ...label, marginBottom: 8 }}>WHY?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
            {REASONS.map((r) => (
              <Pressable
                key={r.key}
                onPress={() => setReason(r.key)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 18,
                  marginRight: 8,
                  marginBottom: 8,
                  backgroundColor: reason === r.key ? palette.accent : palette.surface,
                  borderWidth: 1,
                  borderColor: reason === r.key ? palette.accent : palette.border,
                }}
              >
                <Text style={{ color: reason === r.key ? palette.accentText : palette.text, fontWeight: '700' }}>
                  {r.text}
                </Text>
              </Pressable>
            ))}
          </View>

          {reason === 'off' ? (
            <View style={{ backgroundColor: palette.accentSoft, borderRadius: 16, padding: 14, marginBottom: 16 }}>
              <Text style={{ color: palette.text, lineHeight: 21 }}>
                If something hurts, stop the exercise. Don't push through pain, and see a doctor or physio if it
                keeps happening. A swap can help when a movement feels awkward, but it isn't a fix for an injury.
              </Text>
            </View>
          ) : null}

          {reason === 'busy' ? (
            <Text style={{ color: palette.muted, fontSize: 13, marginBottom: 16 }}>
              Showing options that don't need a machine or cable station.
            </Text>
          ) : null}

          {loading ? <ActivityIndicator color={palette.accent} style={{ marginTop: 20 }} /> : null}
          {!loading && message ? (
            <Text style={{ color: palette.muted, lineHeight: 22, marginTop: 8 }}>{message}</Text>
          ) : null}

          {!loading &&
            options.map((o) => {
              const on = selected === o.name;
              return (
                <Pressable
                  key={o.name}
                  onPress={() => setSelected(o.name)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: on ? palette.accentSoft : palette.surface,
                    borderRadius: 18,
                    padding: 16,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: on ? palette.accent : palette.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700' }}>{o.name}</Text>
                    <Text style={{ color: palette.muted, marginTop: 2 }}>
                      {cap(o.muscle_group)} · {cap(o.equipment)}
                    </Text>
                  </View>
                  {o.suggested ? (
                    <View
                      style={{
                        backgroundColor: palette.accentSoft,
                        borderRadius: 10,
                        paddingVertical: 2,
                        paddingHorizontal: 8,
                      }}
                    >
                      <Text style={{ color: palette.accent, fontSize: 11, fontWeight: '800' }}>SUGGESTED</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
        </ScrollView>

        {chosen ? (
          <View
            style={{
              padding: 20,
              paddingBottom: 32,
              borderTopWidth: 1,
              borderTopColor: palette.border,
              backgroundColor: palette.background,
            }}
          >
            <Text style={{ color: palette.text, fontWeight: '700', marginBottom: 12 }}>
              Swap {currentName} for {chosen.name}?
            </Text>
            <Pressable
              onPress={() => onConfirm(chosen, 'today')}
              style={{ backgroundColor: palette.accent, padding: 14, borderRadius: 16, marginBottom: 10 }}
            >
              <Text style={{ color: palette.accentText, textAlign: 'center', fontSize: 16, fontWeight: '800' }}>
                Just for today
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(chosen, 'plan')}
              style={{ borderWidth: 1, borderColor: palette.accent, padding: 14, borderRadius: 16 }}
            >
              <Text style={{ color: palette.accent, textAlign: 'center', fontSize: 16, fontWeight: '800' }}>
                {mode === 'guided' ? 'For the rest of this block' : 'In my plan from now on'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}