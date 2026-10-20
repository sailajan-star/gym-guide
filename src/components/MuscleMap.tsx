import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Body from 'react-native-body-highlighter';
import { useBodyGender } from '../../lib/bodyGender';
import { useTheme } from '@/constants/app-theme';
import { autoSide } from '../../lib/muscleData';

export type MapPart = { slug: string; intensity: number };
type Side = 'front' | 'back';

function mix(a: string, b: string, t: number) {
  const hex = /^#[0-9a-f]{6}$/i;
  if (!hex.test(a) || !hex.test(b)) return b;
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const out = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// Four shades from faint to full accent colour
export function useRamp() {
  const { palette } = useTheme();
  return [0.3, 0.55, 0.8, 1].map((t) => mix(palette.surfaceAlt, palette.accent, t));
}

type Props = {
  data: MapPart[];
  scale?: number;
  initialSide?: Side;
  showToggle?: boolean;
  onPress?: (slug: string) => void;
};

export default function MuscleMap({ data, scale = 1.1, initialSide, showToggle = true, onPress }: Props) {
  const { palette } = useTheme();
  const colors = useRamp();
  const [override, setOverride] = useState<Side | null>(initialSide ?? null);

  const gender = useBodyGender();

  const side: Side = override ?? autoSide(data.map((d) => d.slug));

  return (
    <View style={{ alignItems: 'center' }}>
      {showToggle ? (
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: palette.surface,
            borderRadius: 14,
            padding: 3,
            borderWidth: 1,
            borderColor: palette.border,
            marginBottom: 8,
          }}
        >
          {(['front', 'back'] as Side[]).map((s) => (
            <Pressable
              key={s}
              onPress={() => setOverride(s)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 18,
                borderRadius: 11,
                backgroundColor: side === s ? palette.accent : 'transparent',
              }}
            >
              <Text style={{ color: side === s ? palette.accentText : palette.text, fontWeight: '700', fontSize: 13 }}>
                {s === 'front' ? 'Front' : 'Back'}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Body
        key={`${gender}-${side}`}
        data={data as any}
        gender={gender}
        side={side}
        scale={scale}
        colors={colors}
        border={palette.border}
        onBodyPartPress={(part: any) => onPress?.(part.slug)}
      />
    </View>
  );
}