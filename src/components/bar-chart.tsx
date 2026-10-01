import { useEffect, useState } from 'react'
import { Animated, Pressable, View } from 'react-native'
import { useColors } from '@/theme'
import { Text } from './ui/text'

export type BarDatum = { label: string; value: number; detail?: string }

/**
 * Same chart as the website: one series of percentages (0–100) in the chart colour, thin columns
 * with rounded tops, hairline grid, only the highest value labelled. Tap a column for its details.
 */
export function BarChart({ data, height = 200, empty = 'No data yet.' }: { data: BarDatum[]; height?: number; empty?: string }) {
  const c = useColors()
  const [active, setActive] = useState<number | null>(null)
  const [grow] = useState(() => new Animated.Value(0))
  useEffect(() => { Animated.timing(grow, { toValue: 1, duration: 700, useNativeDriver: false }).start() }, [grow, data.length])

  if (!data.length) return <View style={{ height, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}><Text size={13} tone="mutedForeground" center>{empty}</Text></View>
  const maxIndex = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0)
  const ticks = [100, 75, 50, 25, 0]
  const plot = height - 22
  const shown = active ?? maxIndex

  return (
    <View>
      <View style={{ minHeight: 34, justifyContent: 'center', marginBottom: 6 }}>
        <Text size={13} weight="semibold" numberOfLines={1}>{data[shown].label}</Text>
        <Text size={12} tone="mutedForeground" tabular>{data[shown].value}%{data[shown].detail ? ` · ${data[shown].detail}` : ''}{active == null ? ' · best' : ''}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, height }}>
        <View style={{ height: plot, justifyContent: 'space-between' }}>
          {ticks.map(t => <Text key={t} size={10} tone="subtle" tabular leading={12} style={{ textAlign: 'right' }}>{t}%</Text>)}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 6, height: plot - 12, justifyContent: 'space-between' }}>
            {ticks.map(t => <View key={t} style={{ height: 1, backgroundColor: c.border }} />)}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: plot - 6, marginTop: 6 }}>
            {data.map((d, i) => {
              const pct = Math.max(1, Math.min(100, d.value))
              const dim = active != null && active !== i
              return (
                <Pressable key={`${d.label}-${i}`} onPress={() => setActive(active === i ? null : i)} accessibilityLabel={`${d.label}: ${d.value}%`}
                  style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <Animated.View style={{ width: '62%', maxWidth: 22, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: c.chart, opacity: dim ? 0.35 : 1, height: grow.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${pct}%`] }) }} />
                </Pressable>
              )
            })}
          </View>
          <View style={{ flexDirection: 'row', height: 16, marginTop: 4 }}>
            {data.map((d, i) => <Text key={`${d.label}-x-${i}`} size={10} tone={i === shown ? 'foreground' : 'mutedForeground'} numberOfLines={1} center style={{ flex: 1, paddingHorizontal: 1 }}>{i + 1}</Text>)}
          </View>
        </View>
      </View>
    </View>
  )
}
