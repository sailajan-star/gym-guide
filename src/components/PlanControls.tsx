import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/constants/app-theme';
import { PlanState } from '../../lib/activePlan';
import { PlanMode, setPlanMode } from '../../lib/customPlan';

type Props = { state: PlanState; onSwitched: () => void };

export default function PlanControls({ state, onSwitched }: Props) {
  const { palette } = useTheme();
  const router = useRouter();
  const hasBoth = !!state.guided && !!state.custom;

  async function choose(mode: PlanMode) {
    if (state.mode === mode) return;
    await setPlanMode(mode);
    onSwitched();
  }

  const segment = (active: boolean) => ({
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: active ? palette.accent : 'transparent',
  });

  const action = {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  } as const;

  return (
    <View style={{ marginBottom: 20 }}>
      {hasBoth ? (
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: palette.surface,
            borderRadius: 16,
            padding: 4,
            borderWidth: 1,
            borderColor: palette.border,
            marginBottom: 12,
          }}
        >
          <Pressable onPress={() => choose('guided')} style={segment(state.mode === 'guided')}>
            <Text
              style={{
                textAlign: 'center',
                fontWeight: '700',
                color: state.mode === 'guided' ? palette.accentText : palette.text,
              }}
            >
              Guided
            </Text>
          </Pressable>
          <Pressable onPress={() => choose('custom')} style={segment(state.mode === 'custom')}>
            <Text
              style={{
                textAlign: 'center',
                fontWeight: '700',
                color: state.mode === 'custom' ? palette.accentText : palette.text,
              }}
            >
              My plan
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row' }}>
        <Pressable onPress={() => router.push('/build-plan' as any)} style={{ ...action, marginRight: 8 }}>
          <Ionicons name="create-outline" size={18} color={palette.accent} />
          <Text style={{ color: palette.text, fontWeight: '700', marginLeft: 8 }}>
            {state.custom ? 'Edit my plan' : 'Build my own'}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.push('/onboarding' as any)} style={{ ...action, marginLeft: 8 }}>
          <Ionicons name="options-outline" size={18} color={palette.accent} />
          <Text style={{ color: palette.text, fontWeight: '700', marginLeft: 8 }}>
            {state.guided ? 'Change answers' : 'Guided quiz'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}