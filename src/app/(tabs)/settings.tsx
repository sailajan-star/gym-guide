import ThemeToggle from '@/components/ThemeToggle';
import { labelStyle, useTheme } from '@/constants/app-theme';
import { useTabBarClearance } from '@/constants/tab-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { ReactNode, useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { clearDemo, createDemo, hasDemo } from '../../../lib/progress';
import { fillGuidedBlock } from '../../../lib/testing';
import { setBodyGender, useBodyGender } from '../../../lib/bodyGender';

type RowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
  first?: boolean;
  danger?: boolean;
};

export default function SettingsScreen() {
  const { palette } = useTheme();
  const label = labelStyle(palette);
  const clearance = useTabBarClearance();
  const [demoOn, setDemoOn] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const gender = useBodyGender();
  
  useFocusEffect(
    useCallback(() => {
      hasDemo().then(setDemoOn);
      setNote(null);
    }, [])
  );

  function confirm(title: string, body: string, action: () => Promise<void>) {
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: 'destructive', onPress: action },
    ]);
  }

  async function toggleDemo() {
    if (demoOn) await clearDemo();
    else await createDemo();
    setDemoOn(!demoOn);
    setNote(demoOn ? 'Demo data removed.' : 'Demo data loaded. Check the Progress tab.');
  }

  function resetHistory() {
    confirm('Reset workout history?', 'This deletes every logged workout on this phone.', async () => {
      await AsyncStorage.removeItem('workoutLogs');
      setNote('Workout history cleared.');
    });
  }

  async function fillBlock() {
  try {
    await fillGuidedBlock();
    setNote('Block filled with fake workouts. Check the Home tab.');
  } catch (e: any) {
    setNote(e.message);
  }
}

  function resetEverything() {
    confirm(
      'Reset everything?',
      'This deletes your answers, plans, custom exercises, history and demo data on this phone.',
      async () => {
        await AsyncStorage.multiRemove([
          'profile',
          'planMode',
          'workoutLogs',
          'customPlan',
          'customExercises',
          'demoLogs',
          'guidedPlan',
          'blockReview',
        ]);
        setDemoOn(false);
        setNote('Everything cleared. Your coach chat has its own Clear button on the Coach tab.');
      }
    );
  }

  function Row({ icon, title, subtitle, onPress, right, first, danger }: RowProps) {
    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          borderTopWidth: first ? 0 : 1,
          borderTopColor: palette.border,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: palette.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 14,
          }}
        >
          <Ionicons name={icon} size={18} color={danger ? palette.danger : palette.accent} />
        </View>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={{ color: danger ? palette.danger : palette.text, fontSize: 16, fontWeight: '700' }}>{title}</Text>
          {subtitle ? <Text style={{ color: palette.muted, marginTop: 2, lineHeight: 19 }}>{subtitle}</Text> : null}
        </View>
        {right}
      </Pressable>
    );
  }

  const card = {
    backgroundColor: palette.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 24,
    overflow: 'hidden',
  } as const;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: clearance }}
    >
      <Text style={{ ...label, marginBottom: 10 }}>APPEARANCE</Text>
      <View style={card}>
        <Row first icon="contrast-outline" title="Theme" subtitle="Switch between dark and light." right={<ThemeToggle />} />
      </View>

      <Text style={{ ...label, marginBottom: 10 }}>TESTING TOOLS</Text>
      <View style={card}>
        <Row
          first
          icon="flask-outline"
          title={demoOn ? 'Remove demo data' : 'Load demo data'}
          subtitle="Fake workout history so the progress charts have something to show."
          onPress={toggleDemo}
        />
        <Row
          icon="trash-outline"
          title="Reset workout history"
          subtitle="Clears logged workouts on this phone."
          onPress={resetHistory}
          danger
        />
        <Row
          icon="refresh-outline"
          title="Reset everything"
          subtitle="Back to the first-time screen."
          onPress={resetEverything}
          danger
        />
        <Row
          icon="play-forward-outline"
          title="Fill current block"
          subtitle="Logs fake workouts for the whole guided block so you can test the review."
          onPress={fillBlock}
        />
        <Row
          icon="body-outline"
          title="Body diagram"
          subtitle="Which figure the muscle map uses."
          right={
            <View style={{ flexDirection: 'row' }}>
              {(['male', 'female'] as const).map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setBodyGender(g)}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    marginLeft: 6,
                    backgroundColor: gender === g ? palette.accent : palette.surfaceAlt,
                  }}
                >
                  <Text style={{ color: gender === g ? palette.accentText : palette.text, fontWeight: '700', fontSize: 13 }}>
                    {g === 'male' ? 'Male' : 'Female'}
                  </Text>
                </Pressable>
              ))}
            </View>
          }
        />
      </View>

      {note ? (
        <Text style={{ color: palette.accent, marginBottom: 24, textAlign: 'center' }}>{note}</Text>
      ) : null}

      <Text style={{ ...label, marginBottom: 10 }}>ABOUT</Text>
      <View style={{ ...card, padding: 18 }}>
        <Text style={{ color: palette.text, fontWeight: '700', marginBottom: 6 }}>Not medical advice</Text>
        <Text style={{ color: palette.muted, lineHeight: 22 }}>
          This app gives general fitness guidance for beginners. Stop if something hurts, and speak to a doctor or
          physiotherapist about pain, injuries, or health conditions.
        </Text>
      </View>
    </ScrollView>
  );
}