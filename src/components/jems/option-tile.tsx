import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated from 'react-native-reanimated'
import { Text } from '@/components/ui'
import { radius, useColors } from '@/theme'
import { Tap, usePop } from './motion'

/** Selectable tile, e.g. the target-role grid. Bounces when picked. */
export function OptionTile({ label, selected, onPress, style }: { label: string; selected: boolean; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const c = useColors()
  const pop = usePop(selected)
  return (
    <Tap onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: selected }} style={style}>
      <Animated.View style={[styles.tile, { borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primarySoft : c.card }, pop]}>
        <Text size={15} weight={selected ? 'semibold' : 'medium'} color={selected ? c.primaryInk : c.foreground} center numberOfLines={2}>{label}</Text>
      </Animated.View>
    </Tap>
  )
}

/** Pill chip for filters such as skill categories. */
export function Chip({ label, active, onPress, count }: { label: string; active: boolean; onPress: () => void; count?: number }) {
  const c = useColors()
  return (
    <Tap onPress={onPress} hitSlop={{ top: 4, bottom: 4 }} accessibilityRole="tab" accessibilityState={{ selected: active }}
      style={[styles.chip, { backgroundColor: active ? c.primary : c.card, borderColor: active ? c.primary : c.border }]}>
      <Text size={14} weight={active ? 'semibold' : 'medium'} color={active ? c.primaryForeground : c.foreground}>{label}</Text>
      {count ? (
        <View style={[styles.count, { backgroundColor: active ? 'rgba(255,255,255,0.22)' : c.primarySoft }]}>
          <Text size={11} weight="semibold" color={active ? c.primaryForeground : c.primaryInk} tabular>{count}</Text>
        </View>
      ) : null}
    </Tap>
  )
}

const styles = StyleSheet.create({
  tile: { minHeight: 52, borderWidth: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 18 },
  count: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
})
