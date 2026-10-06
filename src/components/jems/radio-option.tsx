import { StyleSheet, View } from 'react-native'
import Animated, { ZoomIn } from 'react-native-reanimated'
import { Text } from '@/components/ui'
import { radius, useColors } from '@/theme'
import { Tap, usePop } from './motion'

/** Answer card with a radio dot that springs in when picked. */
export function RadioOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const c = useColors()
  const pop = usePop(selected, 1.03)
  return (
    <Tap onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={label}>
      <Animated.View style={[styles.card, { borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primarySoft : c.card }, pop]}>
        <View style={[styles.radio, { borderColor: selected ? c.primary : c.borderStrong, backgroundColor: selected ? c.primary : c.card }]}>
          {selected && <Animated.View entering={ZoomIn.duration(180)} style={[styles.dot, { backgroundColor: c.primaryForeground }]} />}
        </View>
        <Text size={16} weight={selected ? 'medium' : 'regular'} color={selected ? c.primaryInk : c.foreground} style={{ flex: 1 }}>{label}</Text>
      </Animated.View>
    </Tap>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 12 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5 },
})
