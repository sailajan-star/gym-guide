import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { palette } from '@/constants/palette';

const QUESTIONS = [
  { key: 'goal', title: "What's your main goal?", options: ['Build muscle', 'Lose fat', 'Get stronger', 'Just get healthier'] },
  { key: 'experience', title: 'How much gym experience do you have?', options: ['Complete beginner', 'Tried a few times', 'A few months'] },
  { key: 'equipment', title: 'What can you use?', options: ['Full gym', 'Dumbbells only', 'Bodyweight only'] },
  { key: 'days', title: 'How many days a week?', options: ['2', '3', '4'] },
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const question = QUESTIONS[step];

  async function choose(option: string) {
    const updated = { ...answers, [question.key]: option };
    setAnswers(updated);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      await AsyncStorage.setItem('profile', JSON.stringify(updated));
      router.replace('/');
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
    >
      {/* Segmented progress */}
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        {QUESTIONS.map((q, i) => (
          <View
            key={q.key}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              marginRight: i < QUESTIONS.length - 1 ? 6 : 0,
              backgroundColor: i <= step ? palette.accent : palette.border,
            }}
          />
        ))}
      </View>

      <Text style={{ color: palette.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>
        QUESTION {step + 1} OF {QUESTIONS.length}
      </Text>
      <Text style={{ color: palette.text, fontSize: 32, fontWeight: '800', marginTop: 8, marginBottom: 28 }}>
        {question.title}
      </Text>

      {question.options.map((option, i) => {
        const selected = answers[question.key] === option;
        return (
          <Pressable
            key={option}
            onPress={() => choose(option)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: selected ? palette.accentSoft : palette.surface,
              borderRadius: 20,
              padding: 18,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: selected ? palette.accent : palette.border,
            }}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                backgroundColor: palette.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}
            >
              <Text style={{ color: palette.accent, fontWeight: '800' }}>{String.fromCharCode(65 + i)}</Text>
            </View>
            <Text style={{ color: palette.text, fontSize: 18, fontWeight: '600', flex: 1 }}>{option}</Text>
          </Pressable>
        );
      })}

      {step > 0 ? (
        <Pressable onPress={() => setStep(step - 1)} style={{ padding: 12, marginTop: 4 }}>
          <Text style={{ color: palette.muted, textAlign: 'center', fontSize: 16 }}>← Previous question</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}