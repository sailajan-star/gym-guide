import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { labelStyle, useTheme } from '@/constants/app-theme';
import {
    buildSeries,
    formatDate,
    formatShort,
    loadLogs,
    Metric,
    unitFor,
    WorkoutLog,
} from '../../lib/progress';

type Range = '1M' | '3M' | 'All';
const GOOD = '#2FBF84';

export default function ExerciseScreen() {
  const { palette } = useTheme();
  const label = labelStyle(palette);
  const { width } = useWindowDimensions();
  const { name } = useLocalSearchParams<{ name: string }>();
  const exerciseName = name ?? '';

  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [metric, setMetric] = useState<Metric>('top');
  const [range, setRange] = useState<Range>('All');

  useFocusEffect(
    useCallback(() => {
      loadLogs().then((l) => {
        setLogs(l);
        setLoaded(true);
      });
    }, [])
  );

  if (!loaded) return <View style={{ flex: 1, backgroundColor: palette.background }} />;

  const { points: all, kind } = buildSeries(logs, exerciseName, metric);
  const unit = unitFor(kind);

  let cutoff: Date | null = null;
  if (range !== 'All') {
    cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (range === '1M' ? 30 : 90));
  }
  const shown = cutoff ? all.filter((p) => p.date >= cutoff!) : all;

  const latest = all[all.length - 1];
  const best = all.length ? Math.max(...all.map((p) => p.value)) : 0;

  const first = shown[0];
  const last = shown[shown.length - 1];
  const delta = first && last ? Math.round((last.value - first.value) * 10) / 10 : 0;
  const pct = first && first.value > 0 ? Math.round(((last.value - first.value) / first.value) * 100) : 0;

  const title =
    kind === 'weight' ? (metric === 'top' ? 'TOP WEIGHT' : 'ESTIMATED STRENGTH') : kind === 'time' ? 'SECONDS HELD' : 'REPS';

  // ----- chart sizing -----
  const axisWidth = 10;
  const initialSpacing = 12;
  const endSpacing = 12;
  const chartWidth = width - 48 - axisWidth;

  function renderChart() {
    if (shown.length < 2) {
      return (
        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: 20,
            padding: 24,
            borderWidth: 1,
            borderColor: palette.border,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>
            {all.length === 0 ? 'No data yet' : 'Not enough data in this range'}
          </Text>
          <Text style={{ color: palette.muted, lineHeight: 22 }}>
            {all.length === 0
              ? 'Log this exercise in a workout and your line will appear here.'
              : 'Log one more session, or switch to a longer range, to see your line.'}
          </Text>
        </View>
      );
    }

    const values = shown.map((p) => p.value);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const pad = Math.max((maxV - minV) * 0.35, maxV * 0.05, 1);
    const lo = Math.max(minV - pad, 0); // zoomed baseline, so small gains are visible
    const spacing = (chartWidth - initialSpacing - endSpacing) / (shown.length - 1);

    const chartData = shown.map((p) => ({
      value: p.value - lo,
      real: p.value,
      date: p.date.toISOString(),
    }));

    return (
      <View style={{ marginBottom: 8 }}>
        <LineChart
          key={`${metric}-${range}-${shown.length}`}
          data={chartData}
          width={chartWidth}
          height={220}
          spacing={spacing}
          initialSpacing={initialSpacing}
          endSpacing={endSpacing}
          maxValue={maxV - lo + pad * 0.6}
          noOfSections={4}
          curved
          areaChart
          color={palette.accent}
          thickness={3}
          startFillColor={palette.accent}
          endFillColor={palette.background}
          startOpacity={0.3}
          endOpacity={0.02}
          hideDataPoints
          hideRules
          hideYAxisText
          yAxisThickness={0}
          yAxisLabelWidth={axisWidth}
          xAxisThickness={1}
          xAxisColor={palette.border}
          backgroundColor={palette.background}
          disableScroll
          pointerConfig={{
            pointerStripHeight: 220,
            pointerStripColor: palette.muted,
            pointerStripWidth: 1,
            pointerColor: palette.accent,
            radius: 6,
            pointerLabelWidth: 140,
            pointerLabelHeight: 64,
            activatePointersOnLongPress: true,
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: (items: any[], _secondary: any, pointerIndex: number) => {
              const idx = typeof pointerIndex === 'number' && pointerIndex >= 0 ? pointerIndex : -1;
              const p = idx >= 0 ? shown[idx] : undefined;
              const value = p?.value ?? items?.[0]?.real;
              const date = p?.date ?? (items?.[0]?.date ? new Date(items[0].date) : undefined);
              return (
                <View
                  style={{
                    width: 140,
                    height: 64,
                    justifyContent: 'center',
                    backgroundColor: palette.surfaceAlt,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: palette.border,
                    paddingHorizontal: 12,
                  }}
                >
                  <Text style={{ color: palette.muted, fontSize: 12 }}>{date ? formatDate(date) : ''}</Text>
                  <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800', marginTop: 2 }}>
                    {value} {unit}
                  </Text>
                </View>
              );
            },
          }}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 4 }}>
          <Text style={{ color: palette.muted, fontSize: 12 }}>{formatShort(shown[0].date)}</Text>
          <Text style={{ color: palette.muted, fontSize: 12 }}>{formatShort(shown[shown.length - 1].date)}</Text>
        </View>
      </View>
    );
  }

  const segmentStyle = (active: boolean) => ({
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: active ? palette.accent : 'transparent',
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: 56 }}
    >
      <Stack.Screen options={{ title: exerciseName }} />

      {/* Metric switch (weight exercises only) */}
      {kind === 'weight' ? (
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: palette.surface,
            borderRadius: 16,
            padding: 4,
            borderWidth: 1,
            borderColor: palette.border,
            marginBottom: 20,
          }}
        >
          <Pressable onPress={() => setMetric('top')} style={segmentStyle(metric === 'top')}>
            <Text
              style={{
                textAlign: 'center',
                fontWeight: '700',
                color: metric === 'top' ? palette.accentText : palette.text,
              }}
            >
              Top weight
            </Text>
          </Pressable>
          <Pressable onPress={() => setMetric('est')} style={segmentStyle(metric === 'est')}>
            <Text
              style={{
                textAlign: 'center',
                fontWeight: '700',
                color: metric === 'est' ? palette.accentText : palette.text,
              }}
            >
              Estimated strength
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Headline value */}
      <Text style={label}>{title}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 }}>
        <Text style={{ color: palette.text, fontSize: 44, fontWeight: '800' }}>{latest ? latest.value : '–'}</Text>
        <Text style={{ color: palette.muted, fontSize: 20, marginBottom: 8, marginLeft: 6 }}>{unit}</Text>
      </View>
      {shown.length > 1 ? (
        <Text style={{ color: delta >= 0 ? GOOD : palette.danger, fontWeight: '700', marginBottom: 16 }}>
          {delta >= 0 ? '▲ +' : '▼ '}
          {delta} {unit} ({pct >= 0 ? '+' : ''}
          {pct}%){' '}
          <Text style={{ color: palette.muted, fontWeight: '400' }}>
            {range === 'All' ? 'since your first session' : `over ${range === '1M' ? '1 month' : '3 months'}`}
          </Text>
        </Text>
      ) : (
        <View style={{ height: 16 }} />
      )}

      {renderChart()}

      {shown.length > 1 ? (
        <Text style={{ color: palette.muted, fontSize: 12, textAlign: 'center', marginBottom: 16 }}>
          Press and hold the chart, then drag to see each session
        </Text>
      ) : null}

      {/* Range chips */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
        {(['1M', '3M', 'All'] as Range[]).map((r) => (
          <Pressable
            key={r}
            onPress={() => setRange(r)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 18,
              borderRadius: 18,
              marginHorizontal: 4,
              backgroundColor: range === r ? palette.accentSoft : 'transparent',
              borderWidth: 1,
              borderColor: range === r ? palette.accent : palette.border,
            }}
          >
            <Text style={{ color: range === r ? palette.accent : palette.muted, fontWeight: '700' }}>{r}</Text>
          </Pressable>
        ))}
      </View>

      {kind === 'weight' && metric === 'est' ? (
        <Text style={{ color: palette.muted, lineHeight: 20, marginBottom: 20 }}>
          Estimated strength combines weight and reps, so adding reps counts as progress even if the weight stays
          the same.
        </Text>
      ) : null}

      {/* Stat tiles */}
      {all.length > 0 ? (
        <View style={{ flexDirection: 'row', marginBottom: 20 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: palette.surface,
              borderRadius: 20,
              padding: 16,
              marginRight: 8,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <Text style={{ color: palette.text, fontSize: 28, fontWeight: '800' }}>
              {best}
              <Text style={{ color: palette.muted, fontSize: 14 }}> {unit}</Text>
            </Text>
            <Text style={label}>PERSONAL BEST</Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: palette.surface,
              borderRadius: 20,
              padding: 16,
              marginLeft: 8,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <Text style={{ color: palette.text, fontSize: 28, fontWeight: '800' }}>{all.length}</Text>
            <Text style={label}>SESSIONS</Text>
          </View>
        </View>
      ) : null}

      {/* Session list */}
      {all.length > 0 ? (
        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: 24,
            padding: 20,
            borderWidth: 1,
            borderColor: palette.border,
          }}
        >
          <Text style={{ ...label, marginBottom: 8 }}>SESSIONS</Text>
          {all
            .slice()
            .reverse()
            .slice(0, 20)
            .map((p, i) => (
              <View
                key={p.date.toISOString()}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: palette.border,
                }}
              >
                <Text style={{ color: palette.text, flex: 1 }}>{formatDate(p.date)}</Text>
                {p.value === best ? (
                  <View
                    style={{
                      backgroundColor: palette.accentSoft,
                      borderRadius: 10,
                      paddingVertical: 2,
                      paddingHorizontal: 8,
                      marginRight: 10,
                    }}
                  >
                    <Text style={{ color: palette.accent, fontSize: 11, fontWeight: '800' }}>PB</Text>
                  </View>
                ) : null}
                <Text style={{ color: palette.text, fontWeight: '700' }}>
                  {p.value} {unit}
                </Text>
              </View>
            ))}
        </View>
      ) : null}
    </ScrollView>
  );
}