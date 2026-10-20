import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { labelStyle, useTheme } from '@/constants/app-theme';
import { muscleLabel, PATTERN_WHY } from '../../lib/muscles';
import MuscleMap from '@/components/MuscleMap';
import { exerciseMapData } from '../../lib/muscleData';

export type ExerciseDetail = {
  instructions: string;
  cues: string;
  mistakes?: string | null;
  breathing?: string | null;
  primary?: string[];
  secondary?: string[];
  alternatives?: string[];
  pattern?: string | null;
  difficulty?: string | null;
  equipment?: string | null;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function ExerciseInfo({ detail }: { name: string; detail?: ExerciseDetail }) {
  const { palette } = useTheme();
  const label = labelStyle(palette);
  const [open, setOpen] = useState(false);
  const [showBody, setShowBody] = useState(false);

  if (!detail) {
    return <Text style={{ color: palette.muted, marginBottom: 20 }}>No form guide found for this exercise.</Text>;
  }

  const primary = detail.primary ?? [];
  const secondary = detail.secondary ?? [];
  const alternatives = detail.alternatives ?? [];
  const hasMore = !!(detail.mistakes || detail.breathing || alternatives.length > 0);
  const why = detail.pattern ? PATTERN_WHY[detail.pattern] : undefined;
  const meta = [detail.equipment ? cap(detail.equipment) : null, detail.difficulty ? cap(detail.difficulty) : null]
    .filter(Boolean)
    .join(' · ');

  function chip(text: string, strong: boolean) {
    return (
      <View
        key={text}
        style={{
          backgroundColor: strong ? palette.accentSoft : palette.surface,
          borderWidth: 1,
          borderColor: strong ? palette.accent : palette.border,
          borderRadius: 14,
          paddingVertical: 5,
          paddingHorizontal: 12,
          marginRight: 8,
          marginBottom: 8,
        }}
      >
        <Text style={{ color: strong ? palette.accent : palette.muted, fontWeight: '700', fontSize: 13 }}>
          {text}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 20 }}>
      {/* Muscles */}
      {primary.length > 0 ? (
        <View style={{ marginBottom: 6 }}>
          <Text style={{ ...label, marginBottom: 8 }}>MAIN MUSCLES</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {primary.map((m) => chip(muscleLabel(m), true))}
            {secondary.map((m) => chip(muscleLabel(m), false))}
          </View>
        </View>
      ) : null}
      {meta ? <Text style={{ color: palette.muted, marginBottom: 14 }}>{meta}</Text> : null}

      {primary.length > 0 ? (
        <View style={{ marginBottom: 14 }}>
          <Pressable onPress={() => setShowBody(!showBody)}>
            <Text style={{ color: palette.accent, fontWeight: '700' }}>
              {showBody ? 'Hide body map ▴' : 'See on body map ▾'}
            </Text>
          </Pressable>
          {showBody ? (
            <View style={{ marginTop: 12 }}>
              <MuscleMap data={exerciseMapData(primary, secondary)} scale={0.9} />
              <Text style={{ color: palette.muted, fontSize: 12, textAlign: 'center', marginTop: 6 }}>
                Bright = main muscles · lighter = helping muscles
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Instructions */}
      <View
        style={{
          backgroundColor: palette.surface,
          borderRadius: 24,
          padding: 20,
          borderWidth: 1,
          borderColor: palette.border,
        }}
      >
        <Text style={label}>HOW TO DO IT</Text>
        <Text style={{ color: palette.text, lineHeight: 22, marginTop: 6, marginBottom: 16 }}>
          {detail.instructions}
        </Text>
        <Text style={{ ...label, color: palette.accent }}>FORM CUES</Text>
        <Text style={{ color: palette.text, lineHeight: 22, marginTop: 6 }}>{detail.cues}</Text>

        {open ? (
          <>
            {detail.mistakes ? (
              <>
                <Text style={{ ...label, marginTop: 16 }}>COMMON MISTAKES</Text>
                <Text style={{ color: palette.text, lineHeight: 22, marginTop: 6 }}>{detail.mistakes}</Text>
              </>
            ) : null}
            {detail.breathing ? (
              <>
                <Text style={{ ...label, marginTop: 16 }}>BREATHING</Text>
                <Text style={{ color: palette.text, lineHeight: 22, marginTop: 6 }}>{detail.breathing}</Text>
              </>
            ) : null}
            {alternatives.length > 0 ? (
              <>
                <Text style={{ ...label, marginTop: 16, marginBottom: 8 }}>ALTERNATIVES</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {alternatives.map((a) => chip(a, false))}
                </View>
              </>
            ) : null}
          </>
        ) : null}

        {hasMore ? (
          <Pressable onPress={() => setOpen(!open)} style={{ marginTop: 14 }}>
            <Text style={{ color: palette.accent, fontWeight: '700' }}>
              {open ? 'Show less ▴' : 'Mistakes, breathing and alternatives ▾'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {why ? (
        <View style={{ backgroundColor: palette.accentSoft, borderRadius: 18, padding: 16, marginTop: 12 }}>
          <Text style={{ ...label, color: palette.accent, marginBottom: 4 }}>WHY IT'S IN YOUR PLAN</Text>
          <Text style={{ color: palette.text, lineHeight: 22 }}>{why}</Text>
        </View>
      ) : null}
    </View>
  );
}