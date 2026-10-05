import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { Text } from '@/components/ui'
import { radius, useColors } from '@/theme'
import { buzz, SPRING } from './motion'

const PAD = 4

/**
 * Three-level segmented control with a highlight that slides between options. Tapping the
 * selected option again clears it (the skill goes back to "Not added").
 */
export function LevelPicker<T extends string>({ value, options, onChange, label }: { value: T | null; options: { value: T; label: string }[]; onChange: (value: T | null) => void; label: string }) {
  const c = useColors()
  const [width, setWidth] = useState(0)
  const segment = width ? (width - PAD * 2) / options.length : 0
  const index = value ? options.findIndex(o => o.value === value) : -1

  const x = useSharedValue(0)
  const shown = useSharedValue(index >= 0 ? 1 : 0)
  useEffect(() => {
    if (index < 0) { shown.set(withTiming(0, { duration: 160 })); return }
    // Slide when moving between levels; appear in place when picking the first level.
    x.set(shown.get() > 0.5 ? withSpring(index * segment, SPRING) : index * segment)
    shown.set(withSpring(1, SPRING))
  }, [index, segment, x, shown])
  const pill = useAnimatedStyle(() => ({ width: segment, opacity: shown.get(), transform: [{ translateX: x.get() }, { scale: 0.86 + 0.14 * shown.get() }] }))

  return (
    <View onLayout={e => setWidth(e.nativeEvent.layout.width)} accessibilityRole="radiogroup" accessibilityLabel={label}
      style={[styles.track, { backgroundColor: c.muted, borderColor: c.border }]}>
      {segment > 0 && <Animated.View pointerEvents="none" style={[styles.pill, { backgroundColor: c.primarySoft, borderColor: c.primaryBorder }, pill]} />}
      {options.map((option, i) => {
        const active = i === index
        return (
          <Pressable key={option.value} hitSlop={{ top: 4, bottom: 4 }} onPress={() => { buzz(active ? 'light' : 'selection'); onChange(active ? null : option.value) }}
            accessibilityRole="radio" accessibilityState={{ checked: active }} accessibilityLabel={`${label}: ${option.label}`} style={styles.segment}>
            <Text size={14} weight={active ? 'semibold' : 'medium'} color={active ? c.primaryInk : c.mutedForeground} numberOfLines={1}>{option.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: radius.md, borderWidth: 1, padding: PAD },
  pill: { position: 'absolute', top: PAD, bottom: PAD, left: PAD, borderRadius: radius.sm, borderWidth: 1 },
  segment: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
})
