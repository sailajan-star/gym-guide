import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from 'react-native';

import { useTheme } from '@/constants/app-theme';
import { buildWeek, SETS_BY_WEEK, WEEK_NOTES } from '../../lib/program';
import { supabase } from '../../lib/supabase';

type Message = { id: string; role: 'user' | 'assistant'; text: string; error?: boolean };

const SUGGESTIONS = [
  'What does RPE mean?',
  'Why am I doing these exercises?',
  'My legs are sore. Should I still train?',
  'How heavy should I lift?',
];

async function buildContext() {
  const p = await AsyncStorage.getItem('profile');
  const l = await AsyncStorage.getItem('workoutLogs');
  if (!p) return { note: 'The user has not completed onboarding yet.' };

  const profile = JSON.parse(p);
  const logs = l ? JSON.parse(l) : [];
  const days = parseInt(profile.days, 10);
  const completed = logs.length;
  const finished = completed >= days * 4;
  const weekIdx = Math.min(Math.floor(completed / days), 3);
  const dayIdx = completed % days;
  const next = finished ? null : buildWeek(profile.equipment, days, weekIdx)[dayIdx];
  const last = logs[logs.length - 1];

  return {
    profile,
    programWeek: weekIdx + 1,
    setsPerExerciseThisWeek: SETS_BY_WEEK[weekIdx],
    weekFocus: WEEK_NOTES[weekIdx],
    workoutsCompleted: completed,
    nextWorkout: next,
    lastWorkout: last ? { workout: last.workout, sets: last.sets } : null,
  };
}

export default function CoachScreen() {
    const { palette, mode } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  // Load saved chat
  useEffect(() => {
    AsyncStorage.getItem('coachChat').then((v) => {
      if (v) setMessages(JSON.parse(v));
      setLoaded(true);
    });
  }, []);

  // Save chat whenever it changes
  useEffect(() => {
    if (loaded) AsyncStorage.setItem('coachChat', JSON.stringify(messages));
  }, [messages, loaded]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg: Message = { id: String(Date.now()), role: 'user', text: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setSending(true);

    const context = await buildContext();
    const { data, error } = await supabase.functions.invoke('coach', {
      body: {
        messages: next.filter((m) => !m.error).map((m) => ({ role: m.role, text: m.text })),
        context,
      },
    });

    let reply: string | undefined = data?.reply;
    let failed = false;

    if (error || !reply) {
      failed = true;
      reply = "Sorry, I couldn't reach the coach just now. Try again in a moment.";
      // Dev helper: show the real reason so we can debug
      try {
        const body = await (error as any).context.json();
        reply += `\n\n(${body.error ?? body.message ?? 'unknown error'})`;
      } catch {}
    }

    setMessages([...next, { id: String(Date.now() + 1), role: 'assistant', text: reply, error: failed }]);
    setSending(false);
  }

  function clearChat() {
    setMessages([]);
  }

  const bubbleBase = { maxWidth: '85%', padding: 14, marginBottom: 10 } as const;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={clearChat}>
              <Text style={{ color: palette.muted, fontSize: 16 }}>Clear</Text>
            </Pressable>
          ),
        }}
      />

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 8 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View
            style={{
              ...bubbleBase,
              alignSelf: 'flex-start',
              backgroundColor: palette.surfaceAlt,
              borderTopLeftRadius: 6,
              borderTopRightRadius: 22,
              borderBottomLeftRadius: 22,
              borderBottomRightRadius: 22,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <Text style={{ color: palette.text, fontSize: 16, lineHeight: 22 }}>
              Hi, I'm your coach. Ask me about your plan, how to do an exercise, or how you're feeling. I can't
              change your plan yet, but I can explain it.
            </Text>
          </View>
        }
        renderItem={({ item }) =>
          item.role === 'user' ? (
            <View
              style={{
                ...bubbleBase,
                alignSelf: 'flex-end',
                backgroundColor: palette.accent,
                borderTopLeftRadius: 22,
                borderTopRightRadius: 22,
                borderBottomLeftRadius: 22,
                borderBottomRightRadius: 6,
              }}
            >
              <Text style={{ color: palette.accentText, fontSize: 16, lineHeight: 22, fontWeight: '600' }}>
                {item.text}
              </Text>
            </View>
          ) : (
            <View
              style={{
                ...bubbleBase,
                alignSelf: 'flex-start',
                backgroundColor: palette.surfaceAlt,
                borderTopLeftRadius: 6,
                borderTopRightRadius: 22,
                borderBottomLeftRadius: 22,
                borderBottomRightRadius: 22,
                borderWidth: 1,
                borderColor: item.error ? '#7A3B3B' : palette.border,
              }}
            >
              <Text style={{ color: palette.text, fontSize: 16, lineHeight: 22 }}>{item.text}</Text>
            </View>
          )
        }
        ListFooterComponent={
          <View>
            {sending ? (
              <View style={{ alignSelf: 'flex-start', padding: 10 }}>
                <ActivityIndicator color={palette.accent} />
              </View>
            ) : null}
            {messages.length === 0 ? (
              <View style={{ marginTop: 8 }}>
                <Text
                  style={{ color: palette.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 }}
                >
                  TRY ASKING
                </Text>
                {SUGGESTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => send(s)}
                    style={{
                      backgroundColor: palette.surface,
                      borderRadius: 18,
                      padding: 14,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: palette.border,
                    }}
                  >
                    <Text style={{ color: palette.text, fontSize: 15 }}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        }
      />

      {/* Input bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12,
          paddingBottom: 28,
          borderTopWidth: 1,
          borderTopColor: palette.border,
          backgroundColor: palette.background,
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type here..."
          placeholderTextColor={palette.muted}
          keyboardAppearance="dark"
          maxLength={500}
          multiline
          style={{
            flex: 1,
            color: palette.text,
            backgroundColor: palette.surface,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: palette.border,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 12,
            maxHeight: 110,
            fontSize: 16,
          }}
        />
        <Pressable
          onPress={() => send(input)}
          disabled={sending || input.trim() === ''}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            marginLeft: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: sending || input.trim() === '' ? palette.border : palette.accent,
          }}
        >
          <Text
            style={{
              color: sending || input.trim() === '' ? palette.muted : palette.accentText,
              fontSize: 20,
              fontWeight: '800',
            }}
          >
            ↑
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}