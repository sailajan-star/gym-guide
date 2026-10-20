import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, Path, Polygon, RadialGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/constants/app-theme';

type Props = { size?: number; active?: boolean; animated?: boolean };
type OrbProps = { size: number; active: boolean; animated: boolean };

const TAU = Math.PI * 2;

const steps = (n: number) => Array.from({ length: n + 1 }, (_, i) => i / n);

// Horizontal squash of a meridian ring as the globe turns (this is what makes it look 3D)
function cosScale(t: Animated.Value, phase: number) {
  const input = steps(24);
  const output = input.map((x) => {
    const c = Math.cos(TAU * x + phase);
    return Math.abs(c) < 0.03 ? (c < 0 ? -0.03 : 0.03) : c;
  });
  return t.interpolate({ inputRange: input, outputRange: output });
}

// Smooth up-and-down value, used for twinkling
function wave(t: Animated.Value, phase: number, lo: number, hi: number) {
  const input = steps(12);
  const output = input.map((x) => lo + (hi - lo) * (0.5 + 0.5 * Math.sin(TAU * (x + phase))));
  return t.interpolate({ inputRange: input, outputRange: output });
}

function turn(t: Animated.Value, reverse = false) {
  return t.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'],
  });
}

function loopLinear(v: Animated.Value, duration: number) {
  v.setValue(0);
  const a = Animated.loop(
    Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })
  );
  a.start();
  return a;
}

function loopPulse(v: Animated.Value, half: number) {
  const a = Animated.loop(
    Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: half, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: half, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])
  );
  a.start();
  return a;
}

const boxFor = (r: number, dot: number) => (r + dot * 2.5) * 2;

const centered = (S: number, box: number, dy = 0) => ({
  position: 'absolute' as const,
  width: box,
  height: box,
  left: (S - box) / 2,
  top: (S - box) / 2 + dy,
});

// A ring made of dots, every fourth one bigger
function DottedCircle({ r, n, dot, color }: { r: number; n: number; dot: number; color: string }) {
  const box = boxFor(r, dot);
  const c = box / 2;
  return (
    <Svg width={box} height={box}>
      {Array.from({ length: n }, (_, k) => {
        const a = (k / n) * TAU;
        const big = k % 4 === 0;
        return (
          <Circle
            key={k}
            cx={c + r * Math.cos(a)}
            cy={c + r * Math.sin(a)}
            r={big ? dot * 1.5 : dot}
            fill={color}
            opacity={big ? 1 : 0.6}
          />
        );
      })}
    </Svg>
  );
}

const SPARKS = [
  { x: 0.1, y: 0.22, p: 0, k: 0.03 },
  { x: 0.9, y: 0.3, p: 0.3, k: 0.022 },
  { x: 0.84, y: 0.86, p: 0.6, k: 0.03 },
  { x: 0.14, y: 0.8, p: 0.15, k: 0.02 },
  { x: 0.52, y: 0.03, p: 0.8, k: 0.024 },
];

const MERIDIANS = [0, 1, 2, 3, 4, 5].map((i) => (i * Math.PI) / 6);

const LATITUDES = [
  { lat: 0, n: 30 },
  { lat: 42, n: 24 },
  { lat: -42, n: 24 },
  { lat: 70, n: 12 },
  { lat: -70, n: 12 },
];

// ---------- Full orb ----------

function FullOrb({ size: S, active, animated }: OrbProps) {
  const { palette } = useTheme();
  const accent = palette.accent;
  const uid = useRef(Math.random().toString(36).slice(2, 8)).current;

  const spin = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const slow = useRef(new Animated.Value(0)).current;
  const tw = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    const k = active ? 0.4 : 1; // faster while the coach is thinking
    const loops = [
      loopLinear(spin, 14000 * k),
      loopLinear(orbit, 9000 * k),
      loopLinear(slow, 34000 * k),
      loopLinear(tw, 4200 * k),
      loopPulse(pulse, active ? 600 : 2000),
    ];
    return () => loops.forEach((l) => l.stop());
  }, [animated, active]);

  const R = S * 0.3;
  const dot = Math.max(1, S * 0.0062);

  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const coreScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.2] });

  // Hexagon corners
  const hexR = S * 0.47;
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * TAU - Math.PI / 2;
    return [S / 2 + hexR * Math.cos(a), S / 2 + hexR * Math.sin(a)];
  });

  // Diamonds and specks on the outer orbit
  const onOrbit = (deg: number, radius: number) => {
    const a = (deg * Math.PI) / 180;
    return { x: S / 2 + radius * Math.cos(a), y: S / 2 + radius * Math.sin(a) };
  };
  const diamonds = [20, 140, 255].map((d) => onOrbit(d, S * 0.455));
  const specks = [80, 200, 320].map((d) => onOrbit(d, S * 0.49));
  const ds = dot * 3.4;

  const coreSize = S * 0.26;

  function ring(r: number, tilt: number, squash: number, reverse: boolean) {
    const box = boxFor(r, dot * 2);
    return (
      <View style={[centered(S, box), { transform: [{ rotate: `${tilt}deg` }, { scaleY: squash }] }]}>
        <Animated.View style={{ width: box, height: box, transform: [{ rotate: turn(orbit, reverse) }] }}>
          <Svg width={box} height={box}>
            <Circle
              cx={box / 2}
              cy={box / 2}
              r={r}
              stroke={accent}
              strokeOpacity={0.35}
              strokeWidth={1}
              strokeDasharray="1 6"
              fill="none"
            />
            <Circle cx={box / 2 + r} cy={box / 2} r={dot * 6} fill={accent} opacity={0.25} />
            <Circle cx={box / 2 + r} cy={box / 2} r={dot * 3} fill={accent} />
          </Svg>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={{ width: S, height: S }}>
      {/* Soft glow */}
      <Animated.View
        style={{ position: 'absolute', width: S, height: S, opacity: glowOpacity, transform: [{ scale: glowScale }] }}
      >
        <Svg width={S} height={S}>
          <Defs>
            <RadialGradient id={`glow-${uid}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={accent} stopOpacity={0.5} />
              <Stop offset="100%" stopColor={accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={S / 2} cy={S / 2} r={S / 2} fill={`url(#glow-${uid})`} />
        </Svg>
      </Animated.View>

      {/* Hexagon */}
      <Animated.View style={{ position: 'absolute', width: S, height: S, transform: [{ rotate: turn(slow) }] }}>
        <Svg width={S} height={S}>
          <Polygon
            points={hex.map((p) => p.join(',')).join(' ')}
            stroke={accent}
            strokeOpacity={0.28}
            strokeWidth={1}
            fill="none"
          />
          {hex.map((p, i) => (
            <Circle key={i} cx={p[0]} cy={p[1]} r={dot * 1.4} fill={accent} opacity={0.8} />
          ))}
        </Svg>
      </Animated.View>

      {/* Back orbit ring */}
      {ring(S * 0.4, 32, 0.3, true)}

      {/* The dotted globe, tilted a little */}
      <View style={{ position: 'absolute', width: S, height: S, transform: [{ rotate: '-18deg' }] }}>
        {MERIDIANS.map((phase, i) => {
          const box = boxFor(R, dot);
          return (
            <Animated.View key={`m${i}`} style={[centered(S, box), { transform: [{ scaleX: cosScale(spin, phase) }] }]}>
              <DottedCircle r={R} n={30} dot={dot} color={accent} />
            </Animated.View>
          );
        })}
        {LATITUDES.map(({ lat, n }) => {
          const rad = (lat * Math.PI) / 180;
          const rr = R * Math.cos(rad);
          const box = boxFor(rr, dot);
          return (
            <View
              key={`l${lat}`}
              style={[centered(S, box, -R * Math.sin(rad) * 0.95), { transform: [{ scaleY: 0.28 }] }]}
            >
              <Animated.View style={{ width: box, height: box, transform: [{ rotate: turn(spin) }] }}>
                <DottedCircle r={rr} n={n} dot={dot} color={accent} />
              </Animated.View>
            </View>
          );
        })}
      </View>

      {/* Glowing core */}
      <Animated.View
        style={{
          position: 'absolute',
          width: coreSize,
          height: coreSize,
          left: (S - coreSize) / 2,
          top: (S - coreSize) / 2,
          transform: [{ scale: coreScale }],
        }}
      >
        <Svg width={coreSize} height={coreSize}>
          <Defs>
            <RadialGradient id={`core-${uid}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
              <Stop offset="35%" stopColor={accent} stopOpacity={0.9} />
              <Stop offset="100%" stopColor={accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={coreSize / 2} cy={coreSize / 2} r={coreSize / 2} fill={`url(#core-${uid})`} />
        </Svg>
      </Animated.View>

      {/* Front orbit ring */}
      {ring(S * 0.44, -28, 0.34, false)}

      {/* Diamonds and specks */}
      <Animated.View style={{ position: 'absolute', width: S, height: S, transform: [{ rotate: turn(slow, true) }] }}>
        <Svg width={S} height={S}>
          {diamonds.map((d, i) => (
            <Polygon
              key={i}
              points={`${d.x},${d.y - ds} ${d.x + ds},${d.y} ${d.x},${d.y + ds} ${d.x - ds},${d.y}`}
              fill={i === 0 ? accent : 'none'}
              stroke={accent}
              strokeWidth={1}
              opacity={0.9}
            />
          ))}
          {specks.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={dot * 1.2} fill={accent} opacity={0.7} />
          ))}
        </Svg>
      </Animated.View>

      {/* Twinkling sparkles */}
      {SPARKS.map((s, i) => {
        const r = S * s.k;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: S * s.x - r,
              top: S * s.y - r,
              width: r * 2,
              height: r * 2,
              opacity: wave(tw, s.p, 0.1, 1),
              transform: [{ scale: wave(tw, s.p, 0.6, 1.1) }],
            }}
          >
            <Svg width={r * 2} height={r * 2} viewBox={`${-r} ${-r} ${r * 2} ${r * 2}`}>
              <Path d={`M0 ${-r} Q0 0 ${r} 0 Q0 0 0 ${r} Q0 0 ${-r} 0 Q0 0 0 ${-r} Z`} fill={accent} />
            </Svg>
          </Animated.View>
        );
      })}
    </View>
  );
}

// ---------- Mini orb (small sizes) ----------

function MiniOrb({ size, active, animated }: OrbProps) {
  const { palette } = useTheme();
  const uid = useRef(Math.random().toString(36).slice(2, 8)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    const loops = [loopPulse(pulse, active ? 500 : 1600), loopLinear(spin, active ? 2200 : 7000)];
    return () => loops.forEach((l) => l.stop());
  }, [animated, active]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] });
  const ring = size * 0.92;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id={`mini-${uid}`} cx="35%" cy="30%" r="75%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.9} />
              <Stop offset="40%" stopColor={palette.accent} stopOpacity={1} />
              <Stop offset="100%" stopColor={palette.accentMid} stopOpacity={1} />
            </RadialGradient>
          </Defs>
          <Circle cx="50" cy="50" r="48" fill={`url(#mini-${uid})`} />
        </Svg>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', transform: [{ rotate: turn(spin) }] }}>
        <Svg width={ring} height={ring} viewBox="0 0 100 100">
          <Circle
            cx="50"
            cy="50"
            r="46"
            stroke={palette.accent}
            strokeOpacity={0.5}
            strokeWidth={3}
            strokeDasharray="1 7"
            fill="none"
          />
          <Circle cx="96" cy="50" r="4" fill={palette.accent} />
        </Svg>
      </Animated.View>
    </View>
  );
}

export default function CoachOrb({ size = 160, active = false, animated = true }: Props) {
  if (size < 70) return <MiniOrb size={size} active={active} animated={animated} />;
  return <FullOrb size={size} active={active} animated={animated} />;
}