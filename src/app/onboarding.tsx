import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

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
    <View style={{ flex: 1, backgroundColor: 'white', padding: 24, paddingTop: 80 }}>
      <Text style={{ color: 'gray', marginBottom: 8 }}>
        Question {step + 1} of {QUESTIONS.length}
      </Text>
      <Text style={{ color: 'black', fontSize: 26, fontWeight: '700', marginBottom: 24 }}>
        {question.title}
      </Text>
      {question.options.map((option) => (
        <Pressable
          key={option}
          onPress={() => choose(option)}
          style={{ padding: 18, borderRadius: 12, borderWidth: 1, borderColor: '#ccc', marginBottom: 12 }}
        >
          <Text style={{ color: 'black', fontSize: 18 }}>{option}</Text>
        </Pressable>
      ))}
    </View>
  );
}