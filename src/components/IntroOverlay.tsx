import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, G, RadialGradient, Stop } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/constants/app-theme';

// Change these two to your app's name and tagline
export const APP_NAME = 'MINNAL';
export const APP_TAGLINE = 'Train smarter. Start simple.';

const GRAD = ['#6b1e1e', '#230909', '#000000'] as const;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const TRAIL = 24; // how many dots in the tail
const TRAIL_STEP = 15; // degrees between dots, so the tail is about 90° long
// So the intro shows once per app launch, not every time Home is visited
let shownThisLaunch = false;

// ---------- Logo mark ----------

function LogoMark({ size }: { size: number }) {
  const { palette } = useTheme();
  const uid = useRef(Math.random().toString(36).slice(2, 8)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const draw = useRef(new Animated.Value(0)).current;
  const chev = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(pop, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(draw, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(chev, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const loops = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ),
      Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true })),
    ];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);

  const C = 2 * Math.PI * 44;
  const box = size * 2.2;
  const ringOffset = draw.interpolate({ inputRange: [0, 1], outputRange: [C, 0] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const popScale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const spin = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const chevY = chev.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow */}
      <Animated.View
        style={{ position: 'absolute', width: box, height: box, opacity: glowOpacity, transform: [{ scale: glowScale }] }}
      >
        <Svg width={box} height={box}>
          <Defs>
            <RadialGradient id={`glow-${uid}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={palette.accent} stopOpacity={0.55} />
              <Stop offset="100%" stopColor={palette.accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={box / 2} cy={box / 2} r={box / 2} fill={`url(#glow-${uid})`} />
        </Svg>
      </Animated.View>

      {/* The mark */}
     

       {/* Bolt */}
        <Animated.View
        style={{
            position: 'absolute',
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: chev,
            transform: [{ translateY: chevY }],
        }}
        >
        <Ionicons name="flash-outline" size={size * 0.6} color={palette.accent} style={{ position: 'absolute', opacity: 0.35 }} />
        <Ionicons name="flash-outline" size={size * 0.5} color="#ffffff" />
        </Animated.View>

        {/* Orbiting dot */}
        <Animated.View style={{ position: 'absolute', width: size, height: size, transform: [{ rotate: spin }] }}>
            <Svg width={size} height={size} viewBox="0 0 100 100">
                {Array.from({ length: TRAIL }, (_, i) => TRAIL - 1 - i).map((k) => {
                // Dot k sits k steps behind the leader, on the ring (radius 44)
                const a = (-k * TRAIL_STEP * Math.PI) / 180;
                const cx = 50 + 44 * Math.sin(a);
                const cy = 50 - 44 * Math.cos(a);
                const t = 1 - k / TRAIL; // 1 at the front, near 0 at the back
                const r = 6 * (0.3 + 0.75 * t);
                return (
                    <G key={k} opacity={0.15 + 0.85 * t}>
                    <Circle cx={cx} cy={cy} r={r * 0.5} fill="#ffffff" />
                    </G>
                );
                })}
            </Svg>
            </Animated.View>
    </View>
  );
}


// ---------- Drifting particles ----------

function Particles({ width, height }: { width: number; height: number }) {
  const { palette } = useTheme();

  const items = useMemo(
    () =>
      Array.from({ length: 30 }, () => ({
        x: Math.random() * width,
        size: 2 + Math.random() * 3,
        duration: 6000 + Math.random() * 6000,
        start: Math.random(),
        drift: (Math.random() - 0.5) * 40,
        value: new Animated.Value(0),
      })),
    [width]
  );

  useEffect(() => {
    const loops = items.map((p) => {
      p.value.setValue(p.start);
      const l = Animated.loop(
        Animated.timing(p.value, { toValue: 1, duration: p.duration, easing: Easing.linear, useNativeDriver: true })
      );
      l.start();
      return l;
    });
    return () => loops.forEach((l) => l.stop());
  }, [items]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {items.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: height * 0.92,
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: i % 3 === 0 ? '#ffffff' : palette.accent,
            opacity: p.value.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.8, 0.5, 0] }),
            transform: [
              { translateY: p.value.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.95] }) },
              { translateX: p.value.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

// ---------- Name and tagline ----------

function Wordmark() {
  const chars = APP_NAME.split('');
  const vals = useRef(chars.map(() => new Animated.Value(0))).current;
  const tag = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(900),
      Animated.stagger(
        70,
        vals.map((v) =>
          Animated.timing(v, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true })
        )
      ),
      Animated.timing(tag, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row' }}>
        {chars.map((c, i) => (
          <Animated.Text
            key={i}
            style={{
              color: '#ffffff',
              fontStyle: 'italic',
              fontSize: 35,
              fontWeight: '800',
              letterSpacing: 5,
              opacity: vals[i],
              transform: [{ translateY: vals[i].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
            }}
          >
            {c === ' ' ? '\u00A0' : c}
          </Animated.Text>
        ))}
      </View>
      <Animated.Text
        style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, letterSpacing: 1, marginTop: 10, opacity: tag }}
      >
        {APP_TAGLINE}
      </Animated.Text>
    </View>
  );
}

// ---------- Swipe hint ----------

function SwipeHint({ bottom, onPress }: { bottom: number; onPress: () => void }) {
  const bob = useRef(new Animated.Value(0)).current;
  const show = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([Animated.delay(2200), Animated.timing(show, { toValue: 1, duration: 500, useNativeDriver: true })]).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={{ position: 'absolute', bottom, left: 0, right: 0, alignItems: 'center', opacity: show }}>
      <Pressable onPress={onPress} hitSlop={20} style={{ alignItems: 'center' }}>
        <Animated.View
          style={{
            opacity: bob.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
            transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [4, -6] }) }],
          }}
        >
          <Ionicons name="chevron-up" size={35} color="#ffffff" />
        </Animated.View>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700', letterSpacing: 2, marginTop: 2 }}>
          LET'S GET STARTED
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ---------- The overlay ----------

export default function IntroOverlay() {
  const { width, height } = useWindowDimensions();
  const { mode } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(!shownThisLaunch);
  const y = useRef(new Animated.Value(0)).current;
  const blur = useRef(new Animated.Value(1)).current; // 1 = frosted, 0 = sharp

  useEffect(() => {
    shownThisLaunch = true;
  }, []);

  function dismiss() {
    Animated.timing(y, {
      toValue: -height,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      // The card is fully closed, so now the page comes into focus
      Animated.timing(blur, {
        toValue: 0,
        duration: 500,
        delay: 0,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => setVisible(false));
    });
  }

  function snapBack() {
    Animated.spring(y, { toValue: 0, bounciness: 5, useNativeDriver: false }).start();
  }

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: (_, g) => g.dy < -6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => y.setValue(Math.min(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy < -height * 0.18 || g.vy < -2) dismiss();
          else snapBack();
        },
        onPanResponderTerminate: snapBack,
      }),
    [height]
  );

  if (!visible) return null;

  const radius = y.interpolate({ inputRange: [-height, 0], outputRange: [40, 0], extrapolate: 'clamp' });
  const fade = y.interpolate({ inputRange: [-height * 0.6, 0], outputRange: [0, 1], extrapolate: 'clamp' });
  const fill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

  return (
    <View pointerEvents="box-none" style={{ ...fill, zIndex: 999, elevation: 999 }}>
      {/* Frosted layer over the home screen. It sits under the card, so it only shows in the
          space the card leaves behind as it lifts, then fades out once the card has gone. */}
      <Animated.View pointerEvents="none" style={{ ...fill, opacity: blur }}>
        <BlurView intensity={90} tint={mode === 'dark' ? 'dark' : 'light'} style={fill} />
        <View
          style={{
            ...fill,
            backgroundColor: mode === 'dark' ? 'rgba(11,13,16,0.25)' : 'rgba(255,255,255,0.25)',
          }}
        />
      </Animated.View>

      {/* The card, exactly as before */}
      <Animated.View
        {...pan.panHandlers}
        onLayout={() => {
          SplashScreen.hideAsync().catch(() => {});
        }}
        style={{
          ...fill,
          backgroundColor: '#0B0D10',
          overflow: 'hidden',
          borderBottomLeftRadius: radius,
          borderBottomRightRadius: radius,
          transform: [{ translateY: y }],
        }}
      >
        <StatusBar style="light" />
        <LinearGradient
          colors={GRAD}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={fill}
        />

        <Animated.View style={{ flex: 1, opacity: fade }}>
          <Particles width={width} height={height} />

          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 }}>
            <LogoMark size={110} />
            <View style={{ marginTop: -10 }}>
              <Wordmark />
            </View>
          </View>

          <SwipeHint bottom={insets.bottom + 36} onPress={dismiss} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}