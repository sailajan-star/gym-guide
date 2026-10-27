import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CoachOrb from '@/components/CoachOrb';
import { labelStyle, useTheme } from '@/constants/app-theme';
import { TAB_BAR_HEIGHT, useKeyboardOpen, useTabBarOffset } from '@/constants/tab-bar';
import { getCoachContext, getHomeSummary, loadPlanState } from '../../../lib/activePlan';
import { supabase } from '../../../lib/supabase';

type Message = { id: string; role: 'user' | 'assistant'; text: string; error?: boolean };
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const IDEAS: { icon: IconName; title: string; hint: string; prompt: string }[] = [
  { icon: 'document-text-outline', title: 'Explain my plan', hint: 'Why these exercises', prompt: 'Why am I doing these exercises?' },
  { icon: 'body-outline', title: 'Form tips', hint: 'For my next workout', prompt: 'What should I focus on for form in my next workout?' },
  { icon: 'bandage-outline', title: 'Feeling sore', hint: 'Train or rest?', prompt: 'My legs are sore. Should I still train?' },
  { icon: 'barbell-outline', title: 'How heavy?', hint: 'Choosing your weight', prompt: 'How heavy should I lift?' },
];

const QUICK = ['What does RPE mean?', 'How long should I rest?'];
const FOLLOW_UPS = ['Explain it more simply', 'Give me an example', 'What should I do next?'];

function AmbientCoachBackground({
  background,
  accent,
  glow,
}: {
  background: string;
  accent: string;
  glow: string;
}) {
  const driftOne = useRef(new Animated.Value(0)).current;
  const driftTwo = useRef(new Animated.Value(0)).current;
  const driftThree = useRef(new Animated.Value(0)).current;
  const driftDots = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeLoop = (value: Animated.Value, duration: number, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

    const animations = [
      makeLoop(driftOne, 8500),
      makeLoop(driftTwo, 11000, 900),
      makeLoop(driftThree, 9500, 1700),
      makeLoop(driftDots, 6000, 500),
    ];

    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [driftOne, driftTwo, driftThree, driftDots]);

  const movement = (value: Animated.Value, x: number, y: number) => ({
    transform: [
      {
        translateX: value.interpolate({
          inputRange: [0, 1],
          outputRange: [-x, x],
        }),
      },
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [y, -y],
        }),
      },
    ],
  });

  const dots: { left: `${number}%`; top: `${number}%`; size: number }[] = [
  { left: '15%', top: '22%', size: 4 },
  { left: '78%', top: '18%', size: 3 },
  { left: '68%', top: '42%', size: 5 },
  { left: '25%', top: '57%', size: 3 },
  { left: '85%', top: '68%', size: 4 },
  { left: '43%', top: '82%', size: 3 },
  { left: '8%', top: '72%', size: 4 },
  { left: '55%', top: '30%', size: 2 },
];

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        backgroundColor: background,
      }}
    >
      {/* Large, softly glowing accent orb */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 90,
            left: -100,
            width: 300,
            height: 300,
            borderRadius: 150,
            backgroundColor: accent,
            opacity: 0.13,
          },
          movement(driftOne, 65, 45),
        ]}
      />

      {/* Second glow moves in a different direction */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 330,
            right: -120,
            width: 340,
            height: 340,
            borderRadius: 170,
            backgroundColor: glow,
            opacity: 0.16,
          },
          movement(driftTwo, 55, 70),
        ]}
      />

      {/* Low-level glow near the bottom */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 100,
            left: 20,
            width: 230,
            height: 230,
            borderRadius: 115,
            backgroundColor: accent,
            opacity: 0.09,
          },
          movement(driftThree, 75, 40),
        ]}
      />

      {/* Tiny floating particles */}
      {dots.map((dot, index) => (
        <Animated.View
          key={index}
          style={[
            {
              position: 'absolute',
              left: dot.left,
              top: dot.top,
              width: dot.size,
              height: dot.size,
              borderRadius: dot.size / 2,
              backgroundColor: accent,
              opacity: 0.45,
            },
            movement(
              driftDots,
              index % 2 === 0 ? 18 : 30,
              index % 2 === 0 ? 28 : -20
            ),
          ]}
        />
      ))}

      {/* Very subtle colour wash to give the background more depth */}
      <LinearGradient
        pointerEvents="none"
        colors={[glow, background, accent, background]}
        locations={[0, 0.35, 0.72, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.08,
        }}
      />
    </View>
  );
}

export default function CoachScreen() {
  const { palette, mode } = useTheme();
  const label = labelStyle(palette);
  const insets = useSafeAreaInsets();
  const offset = useTabBarOffset();
  const kbOpen = useKeyboardOpen();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [todayCard, setTodayCard] = useState<{ title: string; count: number } | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const glowTop = palette.heroGradient?.[0] ?? palette.accentSoft;
  const heroColors = (palette.heroGradient ?? ['#842727', '#571414','#f85959','#390d0d']) as [string, string, string];

  // Load saved chat and recent questions
  useEffect(() => {
    Promise.all([AsyncStorage.getItem('coachChat'), AsyncStorage.getItem('coachRecent')])
      .then(([chat, rec]) => {
        if (chat) setMessages(JSON.parse(chat));
        if (rec) setRecent(JSON.parse(rec));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Save chat whenever it changes
  useEffect(() => {
    if (loaded) AsyncStorage.setItem('coachChat', JSON.stringify(messages));
  }, [messages, loaded]);

  // Next workout, for the landing card
  useFocusEffect(
    useCallback(() => {
      loadPlanState().then((s) => {
        const sum = getHomeSummary(s);
        setTodayCard(sum?.next ? { title: sum.next.title, count: sum.next.exercises.length } : null);
      });
    }, [])
  );

  async function send(text: string, base: Message[] = messages) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg: Message = { id: String(Date.now()), role: 'user', text: trimmed };
    const next = [...base, userMsg];
    setMessages(next);
    setInput('');
    setSending(true);

    const nextRecent = [trimmed, ...recent.filter((r) => r !== trimmed)].slice(0, 5);
    setRecent(nextRecent);
    AsyncStorage.setItem('coachRecent', JSON.stringify(nextRecent));

    try {
      const context = await getCoachContext();
      const { data, error } = await supabase.functions.invoke('coach', {
        body: {
          messages: next.filter((m) => !m.error).map(({ role, text }) => ({ role, text })),
          context,
        },
      });

      let reply: string | undefined = data?.reply;
      let failed = false;

      if (error || !reply) {
        failed = true;
        reply = "Sorry, I couldn't reach the coach just now. Try again in a moment.";
        try {
          const body = await (error as any)?.context?.json();
          reply += `\n\n(${body?.error ?? body?.message ?? 'unknown error'})`;
        } catch {
          // keep the fallback message
        }
      }

      setMessages([...next, { id: String(Date.now() + 1), role: 'assistant', text: reply, error: failed }]);
    } catch {
      setMessages([
        ...next,
        { id: String(Date.now() + 1), role: 'assistant', text: 'Sorry, something went wrong. Please try again.', error: true },
      ]);
    } finally {
      setSending(false);
    }
  }

  function regenerate() {
    if (sending) return;
    const lastUser = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUser === -1) return;
    const idx = messages.length - 1 - lastUser;
    const base = messages.slice(0, idx);
    setMessages(base);
    send(messages[idx].text, base);
  }

  function newChat() {
    setMessages([]);
  }

  const last = messages[messages.length - 1];
  const showFollowUps = !!last && last.role === 'assistant' && !last.error && !sending;
  const canSend = !sending && input.trim() !== '';
  const circle = { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' } as const;

  // ---------- Landing ----------
  const landing = (
    <View>
      <View style={{ alignItems: 'center', marginTop: 4, marginBottom: 8 }}>
        <CoachOrb size={230} active={sending} />
      </View>
      <Text style={{ color: palette.text, fontSize: 32, fontWeight: '800', textAlign: 'center' }}>
        Ask your <Text style={{ color: palette.accent }}>coach</Text> anything.
      </Text>
      <Text style={{ color: palette.muted, fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
      </Text>

      {todayCard ? (
        <LinearGradient
          colors={['#130707', '#842727', '#571414','#d02e2e','#390d0d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 24, padding: 18, borderWidth: 0, borderColor: palette.heroBorder, marginBottom: 20 }}
        >
          <Text style={{ ...label, color: palette.accent }}>YOUR NEXT WORKOUT</Text>
          <Text style={{ color: palette.text, fontSize: 20, fontWeight: '800', marginTop: 4 }}>{todayCard.title}</Text>
          <Text style={{ color: palette.muted, marginTop: 2 }}>{todayCard.count} exercises</Text>
          <Pressable
            onPress={() => send('Talk me through my next workout')}
            style={{
              marginTop: 14,
              alignSelf: 'center',
              borderRadius: 14,
              paddingVertical: 10,
              paddingHorizontal: 16,
            }}
          >
             <BlurView
              intensity={60}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 32,
                overflow: 'hidden',
              }}
            />
              
              <Ionicons name="arrow-forward" size={20} color={palette.text} />

          </Pressable>
        </LinearGradient>
      ) : null}

      {/* Idea cards */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {IDEAS.map((idea) => (
          <Pressable
            key={idea.title}
            onPress={() => send(idea.prompt)}
            style={{
              width: '48.5%',
              borderRadius: 22,
              borderWidth: 0,
              borderColor: palette.border,
              padding: 16,
              marginBottom: 12,
              minHeight: 118,
            }}
          >
          <BlurView
            intensity={60}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 32,
              overflow: 'hidden',
            }}
          />
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 13,
                backgroundColor: palette.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <Ionicons name={idea.icon} size={19} color={palette.accent} />
            </View>
            <Text style={{ color: palette.text, fontSize: 16, fontWeight: '800' }}>{idea.title}</Text>
            <Text style={{ color: palette.muted, fontSize: 13, marginTop: 2 }}>{idea.hint}</Text>
          </Pressable>
        ))}
      </View>

      {/* Quick questions */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 20 }}>
        {QUICK.map((q) => (
          <Pressable
            key={q}
            onPress={() => send(q)}
            style={{
              paddingVertical: 9,
              paddingHorizontal: 14,
              borderRadius: 18,
              marginRight: 8,
              borderWidth: 0,
              borderColor: palette.border,
            }}
          >

           <BlurView
            intensity={60}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 32,
              overflow: 'hidden',
            }}
          />
            <Text style={{ color: palette.text, fontWeight: '600' }}>{q}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Recent */}
      {recent.length > 0 ? (
        <View>
          <Text style={{ ...label, marginBottom: 10 }}>RECENT</Text>
          <View
            style={{
              borderRadius: 22,
              borderWidth: 0,
              borderColor: palette.border,
              overflow: 'hidden',
            }}
          >
          
           <BlurView
              intensity={60}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 32,
                overflow: 'hidden',
              }}
            />
            {recent.map((r, i) => (
              <Pressable
                key={r}
                onPress={() => send(r)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: palette.border,
                }}
              >
                <Ionicons name="time-outline" size={18} color={palette.muted} />
                <Text numberOfLines={1} style={{ color: palette.text, flex: 1, marginHorizontal: 12, fontSize: 15 }}>
                  {r}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={palette.muted} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Hide the default header: this screen has its own */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* Dynamic background — behind all content and controls */}
      <AmbientCoachBackground
        background={palette.background}
        accent={palette.accent}
        glow={glowTop}
      />


      {/* Soft fade so content doesn't collide with the status bar */}
      <LinearGradient
          pointerEvents="none"
          colors={[palette.background, `${palette.background}00`]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 24, zIndex: 5 }}
        />

        {/* New chat floats over the content, so nothing is pushed down */}
        {messages.length > 0 ? (
          <Pressable
            onPress={newChat}
            style={{
              position: 'absolute',
              top: insets.top + 6,
              right: 20,
              zIndex: 10,
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 7,
              paddingHorizontal: 12,
              borderRadius: 16,
              backgroundColor: palette.surface,
              borderWidth: 0,
              borderColor: palette.border,
            }}
          >
            <Ionicons name="add" size={16} color={palette.accent} />
            <Text style={{ color: palette.text, fontWeight: '700', marginLeft: 4, fontSize: 13 }}>New chat</Text>
          </Pressable>
        ) : null}

      {/* Conversation / landing */}
      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{
          padding: 20,
          paddingTop: messages.length > 0 ? insets.top + 48 : insets.top + 16,
          paddingBottom: 12,
          flexGrow: 1,
        }}
        onContentSizeChange={() => {
          if (messages.length > 0) listRef.current?.scrollToEnd({ animated: true });
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={landing}
        renderItem={({ item, index }) =>
          item.role === 'user' ? (
            <View style={{ alignItems: 'flex-end', marginBottom: 14 }}>
              <LinearGradient
                colors={[palette.accent, palette.accentMid]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  maxWidth: '82%',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderTopLeftRadius: 22,
                  borderTopRightRadius: 22,
                  borderBottomLeftRadius: 22,
                  borderBottomRightRadius: 6,
                }}
              >
                <Text style={{ color: palette.accentText, fontSize: 16, lineHeight: 22, fontWeight: '600' }}>
                  {item.text}
                </Text>
              </LinearGradient>
            </View>
          ) : (
            <View
              style={{
                borderRadius: 24,
                padding: 18,
                marginBottom: 14,
                borderWidth: 0,
                borderColor: item.error ? palette.danger : palette.border,
              }}
            >
              <BlurView
                intensity={50}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: 32,
                  overflow: 'hidden',
                }}
              />
        
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <CoachOrb size={30} animated={false} />
                <Text style={{ ...label, marginLeft: 8 }}>COACH</Text>
              </View>
              <Text style={{ color: palette.text, fontSize: 16, lineHeight: 24 }}>{item.text}</Text>
              {index === messages.length - 1 && !sending ? (
                <Pressable
                  onPress={regenerate}
                  style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, alignSelf: 'flex-start' }}
                >
                  <Ionicons name="refresh" size={15} color={palette.muted} />
                  <Text style={{ color: palette.muted, fontWeight: '600', marginLeft: 6, fontSize: 13 }}>
                    Regenerate
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )
        }
        ListFooterComponent={
          <View>
            {sending ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  backgroundColor: palette.surface,
                  borderRadius: 22,
                  borderWidth: 0,
                  borderColor: palette.border,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  marginBottom: 14,
                }}
              >
                <CoachOrb size={38} active />
                <Text style={{ color: palette.muted, marginLeft: 8, fontWeight: '600' }}>Thinking…</Text>
              </View>
            ) : null}

            {showFollowUps ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                {FOLLOW_UPS.map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => send(f)}
                    style={{
                      paddingVertical: 9,
                      paddingHorizontal: 14,
                      borderRadius: 18,
                      marginRight: 8,
                      borderWidth: 0,
                      borderColor: palette.accent,
                      backgroundColor: palette.accentSoft,
                    }}
                  >
                    <Text style={{ color: palette.accent, fontWeight: '700', fontSize: 13 }}>{f}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>
        }
      />

      
      {/* Floating glass input */}
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: kbOpen ? 8 : offset - 15 + TAB_BAR_HEIGHT + 10 }}>
        <BlurView
          intensity={40}
          style={{ borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: palette.border }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              paddingVertical: 8,
              paddingLeft: 16,
              paddingRight: 8,
              backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)',
            }}
          >
            <View style={{ height: 40, justifyContent: 'center', marginRight: 10 }}>
              <Ionicons name="sparkles" size={18} color={palette.accent} />
            </View>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask about form, swaps, soreness…"
              placeholderTextColor={palette.muted}
              keyboardAppearance={mode}
              maxLength={500}
              multiline
              style={{
                flex: 1,
                minHeight: 40,
                maxHeight: 110,
                color: palette.text,
                fontSize: 16,
                paddingTop: 10,
                paddingBottom: 10,
              }}
            />
            <Pressable onPress={() => send(input)} disabled={!canSend} style={{ marginLeft: 8 }}>
              {canSend ? (
                <LinearGradient colors={[palette.accent, palette.accentMid]} style={circle}>
                  <Ionicons name="arrow-up" size={20} color={palette.accentText} />
                </LinearGradient>
              ) : (
                <View style={{ ...circle, backgroundColor: palette.border }}>
                  <Ionicons name="arrow-up" size={20} color={palette.muted} />
                </View>
              )}
            </Pressable>
          </View>
        </BlurView>
      </View>
    </KeyboardAvoidingView>
  );
}

