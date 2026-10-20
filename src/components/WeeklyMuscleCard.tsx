import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import MuscleMap, { useRamp } from '@/components/MuscleMap';
import { labelStyle, useTheme } from '@/constants/app-theme';
import {
  computeStats,
  loadMuscleInfo,
  MuscleInfo,
  MuscleStat,
  toMapData,
  TRACKED,
  WEEKLY_TARGET,
} from '../../lib/muscleData';
import { muscleLabel } from '../../lib/muscles';
import { loadLogs } from '../../lib/progress';

const DAY = 24 * 60 * 60 * 1000;

function ago(d: Date) {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  const b = new Date(d);
  b.setHours(0, 0, 0, 0);
  const days = Math.round((a.getTime() - b.getTime()) / DAY);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
}

type Data = { week: Record<string, MuscleStat>; all: Record<string, MuscleStat>; info: MuscleInfo };

export default function WeeklyMuscleCard() {
  const { palette } = useTheme();
  const label = labelStyle(palette);
  const ramp = useRamp();
  const [data, setData] = useState<Data | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [logs, info] = await Promise.all([loadLogs(), loadMuscleInfo()]);
        setData({
          week: computeStats(logs, info, Date.now() - 7 * DAY),
          all: computeStats(logs, info, 0),
          info,
        });
      }
      load();
    }, [])
  );

  if (!data) return null;

  const mapData = toMapData(data.week, WEEKLY_TARGET);
  const trained = TRACKED.filter((s) => (data.week[s]?.sets ?? 0) > 0);
  const missing = TRACKED.filter((s) => !trained.includes(s));

  function onPress(slug: string) {
    if (muscleLabel(slug) === slug) return; // ignore parts we do not track (head, hands, and so on)
    setSelected(selected === slug ? null : slug);
  }

  const st = selected ? data.week[selected] : undefined;
  const ever = selected ? data.all[selected] : undefined;
  const ideas = selected
    ? Object.entries(data.info)
        .filter(([, m]) => m.primary.includes(selected))
        .map(([name]) => name)
        .slice(0, 4)
    : [];

  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: palette.border,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={label}>LAST 7 DAYS</Text>
        <Text style={{ color: palette.accent, fontWeight: '700' }}>
          {trained.length} of {TRACKED.length} areas
        </Text>
      </View>

      <MuscleMap data={mapData} scale={1.2} onPress={onPress} />

      {/* Legend */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
        <Text style={{ color: palette.muted, fontSize: 12, marginRight: 8 }}>Light</Text>
        {ramp.map((c) => (
          <View key={c} style={{ width: 22, height: 10, backgroundColor: c, marginHorizontal: 1, borderRadius: 3 }} />
        ))}
        <Text style={{ color: palette.muted, fontSize: 12, marginLeft: 8 }}>Full</Text>
      </View>

      {selected ? (
        <View style={{ backgroundColor: palette.surfaceAlt, borderRadius: 18, padding: 16, marginTop: 16 }}>
          <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800' }}>{muscleLabel(selected)}</Text>
          <Text style={{ color: palette.muted, marginTop: 4, lineHeight: 20 }}>
            {st ? `${Math.round(st.sets * 10) / 10} sets in the last 7 days` : 'Not trained in the last 7 days'}
            {ever ? ` · last trained ${ago(ever.last)}` : ''}
          </Text>
          <Text style={{ color: palette.text, marginTop: 8, lineHeight: 20 }}>
            {ever
              ? `Worked by: ${ever.exercises.slice(0, 5).join(', ')}`
              : ideas.length > 0
              ? `You could train it with: ${ideas.join(', ')}`
              : 'No exercises in your library train this yet.'}
          </Text>
        </View>
      ) : (
        <Text style={{ color: palette.muted, lineHeight: 20, marginTop: 16, fontSize: 13 }}>
          {mapData.length === 0
            ? 'Log a workout and the muscles you train will light up here. Tap a muscle for details.'
            : missing.length > 0
            ? `Not trained yet this week: ${missing.map(muscleLabel).join(', ')}. Tap a muscle for details.`
            : 'Every main area got some work this week. Tap a muscle for details.'}
        </Text>
      )}

      <Text style={{ color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 12 }}>
        Full colour is roughly {WEEKLY_TARGET} sets of work in a week. More isn't better, steady is. This is an
        estimate, not a measure of recovery.
      </Text>
    </View>
  );
}