
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from 'react-native';

import { useTheme } from '@/constants/app-theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { setPlanMode } from '../../lib/customPlan';
import { createGuidedPlan } from '../../lib/program';

type Option = {
  label: string;
  desc?: string;
};

type Question = {
  key: string;
  title: string;
  hint?: string;
  multi?: boolean;
  options?: Option[];
  type?: 'options' | 'date' | 'text';
};

const QUESTIONS: Question[] = [
  
   {
    key: 'name',
    title: "What's your name?",
    type: 'text',
  },
  {
    key: 'age',
    title: "What's your date of birth?",
    hint: 'Choose your birthday so we can calculate your age.',
    type: 'date',
  },
  {
    key: 'goal',
    title: "What's your main goal?",
    options: [
      { label: 'Build muscle' },
      { label: 'Lose fat' },
      { label: 'Get stronger' },
      { label: 'Just get healthier' },
    ],
  },
  {
    key: 'experience',
    title: 'How much gym experience do you have?',
    options: [
      { label: 'Complete beginner' },
      { label: 'Tried a few times' },
      { label: 'A few months' },
    ],
  },
  {
    key: 'equipment',
    title: 'Where will you train?',
    options: [
      {
        label: 'Home, no equipment',
        desc: 'Just your bodyweight',
      },
      {
        label: 'Home with dumbbells and bands',
        desc: 'Dumbbells, resistance bands and a backpack for extra weight',
      },
      {
        label: 'Full gym',
        desc: 'Machines, cables and dumbbells',
      },
    ],
  },
  {
    key: 'days',
    title: 'How many days a week?',
    options: [
      { label: '2' },
      { label: '3' },
      { label: '4' },
      { label: '5' },
      { label: '6' },
    ],
  },
  {
    key: 'limitations',
    title: 'Anything we should work around?',
    hint:
      "Pick any that apply. We'll leave out exercises that often aggravate them. This isn't medical advice, so check with a doctor or physio about pain or injuries.",
    multi: true,
    options: [
      { label: 'None' },
      { label: 'Knees' },
      { label: 'Lower back' },
      { label: 'Shoulders' },
      { label: 'Wrists' },
      { label: 'Something else' },
    ],
  },
];

export default function Onboarding() {
  const { palette } = useTheme();
  const router = useRouter();

  const [step, setStep] = useState(0);

  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [dateOfBirth, setDateOfBirth] = useState<Date>(
    new Date(2000, 0, 1)
  );

  const [showAndroidDatePicker, setShowAndroidDatePicker] =
    useState(false);

  const [limits, setLimits] = useState<string[]>([]);

  const [phase, setPhase] = useState<
    'asking' | 'building' | 'error'
  >('asking');

  const [errorMsg, setErrorMsg] = useState('');

  const [profile, setProfile] =
    useState<Record<string, string> | null>(null);

  const question = QUESTIONS[step];
  const minimumDate = new Date(1900, 0, 1);

  async function build(p: Record<string, string>) {
    setProfile(p);
    setPhase('building');
    setErrorMsg('');

    try {
      await createGuidedPlan(p, { block: 1 });
      await setPlanMode('guided');
      router.dismissTo('/');
    } catch (e: unknown) {
      setErrorMsg(
        e instanceof Error
          ? e.message
          : 'Something went wrong.'
      );
      setPhase('error');
    }
  }

  function choose(label: string) {
    setAnswers((previous) => ({
      ...previous,
      [question.key]: label,
    }));

    setStep((previous) => previous + 1);
  }

  function toggleLimit(label: string) {
    if (label === 'None') {
      setLimits(['None']);
      return;
    }

    setLimits((previous) => {
      const withoutNone = previous.filter(
        (item) => item !== 'None'
      );

      return withoutNone.includes(label)
        ? withoutNone.filter((item) => item !== label)
        : [...withoutNone, label];
    });
  }

  function chooseDateOfBirth() {
    const today = new Date();

    // Reject a future birthday.
    if (dateOfBirth.getTime() > today.getTime()) {
      return;
    }

    let age =
      today.getFullYear() - dateOfBirth.getFullYear();

    const birthdayHasPassed =
      today.getMonth() > dateOfBirth.getMonth() ||
      (today.getMonth() === dateOfBirth.getMonth() &&
        today.getDate() >= dateOfBirth.getDate());

    if (!birthdayHasPassed) {
      age -= 1;
    }

    setAnswers((previous) => ({
      ...previous,
      age: String(age),
      dateOfBirth: [
        dateOfBirth.getFullYear(),
        String(dateOfBirth.getMonth() + 1).padStart(2, '0'),
        String(dateOfBirth.getDate()).padStart(2, '0'),
      ].join('-'),
    }));

    setShowAndroidDatePicker(false);
    setStep((previous) => previous + 1);
  }

  function finish() {
    const finalAnswers = {
      ...answers,
      limitations:
        limits.length > 0 ? limits.join(',') : 'None',
    };

    build(finalAnswers);
  }

  function goBack() {
    setShowAndroidDatePicker(false);
    setStep((previous) => Math.max(0, previous - 1));
  }

  // Loading screen
  if (phase === 'building') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: palette.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <ActivityIndicator
          color={palette.accent}
          size="large"
        />

        <Text
          style={{
            color: palette.text,
            fontSize: 20,
            fontWeight: '700',
            marginTop: 20,
          }}
        >
          Building your plan…
        </Text>

        <Text
          style={{
            color: palette.muted,
            marginTop: 6,
            textAlign: 'center',
          }}
        >
          Picking exercises that fit your goal, equipment
          and experience.
        </Text>
      </View>
    );
  }

  // Error screen
  if (phase === 'error') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: palette.background,
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Text
          style={{
            color: palette.text,
            fontSize: 24,
            fontWeight: '800',
            marginBottom: 8,
          }}
        >
          Couldn't build your plan
        </Text>

        <Text
          style={{
            color: palette.danger,
            lineHeight: 22,
            marginBottom: 24,
          }}
        >
          {errorMsg}
        </Text>

        <Pressable
          onPress={() => profile && build(profile)}
          style={{
            backgroundColor: palette.accent,
            padding: 16,
            borderRadius: 16,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              color: palette.accentText,
              textAlign: 'center',
              fontSize: 17,
              fontWeight: '800',
            }}
          >
            Try again
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setPhase('asking')}
          style={{ padding: 12 }}
        >
          <Text
            style={{
              color: palette.muted,
              textAlign: 'center',
              fontSize: 16,
            }}
          >
            Change my answers
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: palette.background,
      }}
      contentContainerStyle={{
        padding: 24,
        paddingBottom: 48,
        flexGrow: 1,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Progress indicator */}
      <View
        style={{
          flexDirection: 'row',
          marginBottom: 20,
        }}
      >
        {QUESTIONS.map((q, i) => (
          <View
            key={q.key}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              marginRight:
                i < QUESTIONS.length - 1 ? 6 : 0,
              backgroundColor:
                i <= step
                  ? palette.accent
                  : palette.border,
            }}
          />
        ))}
      </View>

      {/* Question heading */}
      <Text
        style={{
          color: palette.accent,
          fontSize: 12,
          fontWeight: '700',
          letterSpacing: 1.5,
        }}
      >
        QUESTION {step + 1} OF {QUESTIONS.length}
      </Text>

      <Text
        style={{
          color: palette.text,
          fontSize: 32,
          fontWeight: '800',
          marginTop: 8,
          marginBottom: question.hint ? 10 : 28,
        }}
      >
        {question.title}
      </Text>

      {question.hint ? (
        <Text
          style={{
            color: palette.muted,
            lineHeight: 22,
            marginBottom: 24,
          }}
        >
          {question.hint}
        </Text>
      ) : null}

      
      {question.type === 'text' ? (
        <View style={{ marginBottom: 20 }}>
          <TextInput
            value={answers[question.key] ?? ''}
            onChangeText={(value) =>
              setAnswers((prev) => ({
                ...prev,
                [question.key]: value,
              }))
            }
            placeholder="Enter your name"
            placeholderTextColor={palette.muted}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            maxLength={50}
            style={{
              backgroundColor: palette.surface,
              color: palette.text,
              borderWidth: 1,
              borderColor: palette.border,
              borderRadius: 16,
              padding: 18,
              fontSize: 18,
              marginBottom: 12,
            }}
          />

          <Pressable
            onPress={() => {
              if (!(answers.name ?? '').trim()) return;
              setAnswers((prev) => ({
                ...prev,
                name: prev.name.trim(),
              }));
              setStep((prev) => prev + 1);
            }}
            disabled={!(answers.name ?? '').trim()}
            style={{
              backgroundColor: (answers.name ?? '').trim()
                ? palette.accent
                : palette.border,
              padding: 16,
              borderRadius: 16,
            }}
          >
            <Text
              style={{
                color: palette.accentText,
                textAlign: 'center',
                fontSize: 17,
                fontWeight: '800',
              }}
            >
              Next question →
            </Text>
          </Pressable>
        </View>
      ) : question.type === 'date' ? (
        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: 20,
            padding: 12,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: palette.border,
          }}
        >
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={dateOfBirth}
              mode="date"
              display="spinner"
              minimumDate={minimumDate}
              maximumDate={new Date()}
              onChange={(_event, selectedDate) => {
                if (selectedDate) {
                  setDateOfBirth(selectedDate);
                }
              }}
              themeVariant="dark"
              style={{
                width: '100%',
                height: 200,
              }}
            />
          ) : (
            <>
              <Pressable
                onPress={() =>
                  setShowAndroidDatePicker(true)
                }
                style={{
                  backgroundColor: palette.surfaceAlt,
                  borderRadius: 14,
                  padding: 18,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: palette.text,
                    fontSize: 18,
                    fontWeight: '700',
                  }}
                >
                  {dateOfBirth.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>

                <Text
                  style={{
                    color: palette.muted,
                    marginTop: 6,
                  }}
                >
                  Tap to choose your birthday
                </Text>
              </Pressable>

              {showAndroidDatePicker ? (
                <DateTimePicker
                  value={dateOfBirth}
                  mode="date"
                  display="default"
                  minimumDate={minimumDate}
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowAndroidDatePicker(false);

                    if (
                      event.type === 'set' &&
                      selectedDate
                    ) {
                      setDateOfBirth(selectedDate);
                    }
                  }}
                />
              ) : null}
            </>
          )}

          <Text
            style={{
              color: palette.muted,
              textAlign: 'center',
              marginTop: 8,
              fontSize: 14,
            }}
          >
            Selected birthday:{' '}
            {dateOfBirth.toLocaleDateString('en-GB')}
          </Text>

          <Pressable
            onPress={chooseDateOfBirth}
            style={{
              backgroundColor: palette.accent,
              padding: 16,
              borderRadius: 16,
              marginTop: 16,
            }}
          >
            <Text
              style={{
                color: palette.accentText,
                textAlign: 'center',
                fontSize: 17,
                fontWeight: '800',
              }}
            >
              Next question →
            </Text>
          </Pressable>
        </View>
      ) : (
        /* Multiple-choice questions */
        (question.options ?? []).map((option, i) => {
          const selected = question.multi
            ? limits.includes(option.label)
            : answers[question.key] === option.label;

          return (
            <Pressable
              key={option.label}
              onPress={() =>
                question.multi
                  ? toggleLimit(option.label)
                  : choose(option.label)
              }
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: selected
                  ? palette.accentSoft
                  : palette.surface,
                borderRadius: 20,
                padding: 18,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: selected
                  ? palette.accent
                  : palette.border,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  backgroundColor:
                    selected && question.multi
                      ? palette.accent
                      : palette.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}
              >
                <Text
                  style={{
                    color:
                      selected && question.multi
                        ? palette.accentText
                        : palette.accent,
                    fontWeight: '800',
                  }}
                >
                  {question.multi
                    ? selected
                      ? '✓'
                      : ''
                    : String.fromCharCode(65 + i)}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: palette.text,
                    fontSize: 18,
                    fontWeight: '600',
                  }}
                >
                  {option.label}
                </Text>

                {option.desc ? (
                  <Text
                    style={{
                      color: palette.muted,
                      marginTop: 4,
                    }}
                  >
                    {option.desc}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })
      )}

      {/* Finish questionnaire */}
      {question.multi ? (
        <Pressable
          onPress={finish}
          disabled={limits.length === 0}
          style={{
            backgroundColor:
              limits.length === 0
                ? palette.border
                : palette.accent,
            padding: 16,
            borderRadius: 16,
            marginTop: 8,
          }}
        >
          <Text
            style={{
              color:
                limits.length === 0
                  ? palette.muted
                  : palette.accentText,
              textAlign: 'center',
              fontSize: 17,
              fontWeight: '800',
            }}
          >
            Build my plan
          </Text>
        </Pressable>
      ) : null}

      {/* Previous question */}
      {step > 0 ? (
        <Pressable
          onPress={goBack}
          style={{
            padding: 12,
            marginTop: 4,
          }}
        >
          <Text
            style={{
              color: palette.muted,
              textAlign: 'center',
              fontSize: 16,
            }}
          >
            ← Previous question
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}