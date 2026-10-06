import { Check, type LucideIcon } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { Text } from '@/components/ui'
import { useColors } from '@/theme'
import { enter, Pulse } from './motion'

export type TimelineState = 'current' | 'done' | 'locked'
const NODE = 36

/** One stop on a vertical timeline: numbered node + rail on the left, content on the right. */
export function TimelineItem({ index, state, last, order = 0, children }: { index: number; state: TimelineState; last?: boolean; order?: number; children: React.ReactNode }) {
  const c = useColors()
  const node = state === 'current' ? { bg: c.primary, border: c.primary, fg: c.primaryForeground }
    : state === 'done' ? { bg: c.success, border: c.success, fg: c.primaryForeground }
    : { bg: c.muted, border: c.border, fg: c.mutedForeground }
  return (
    <Animated.View entering={enter(order)} style={styles.row}>
      <View style={styles.rail}>
        <View style={styles.nodeWrap}>
          <Pulse color={c.primary} size={NODE} active={state === 'current'} />
          <View style={[styles.node, { backgroundColor: node.bg, borderColor: node.border }]}
            accessibilityLabel={`Module ${index}, ${state === 'current' ? 'in progress' : state}`}>
            {state === 'done' ? <Check size={18} color={node.fg} strokeWidth={2.6} /> : <Text size={16} weight="semibold" color={node.fg}>{index}</Text>}
          </View>
        </View>
        {!last && <View style={[styles.line, { backgroundColor: state === 'done' ? c.successBorder : c.border }]} />}
      </View>
      <View style={styles.body}>{children}</View>
    </Animated.View>
  )
}

/** The final marker of a timeline (e.g. "Reassess at week 8"). */
export function TimelineEnd({ icon: Icon, order = 0, children }: { icon: LucideIcon; order?: number; children: React.ReactNode }) {
  const c = useColors()
  return (
    <Animated.View entering={enter(order)} style={[styles.row, { alignItems: 'center' }]}>
      <View style={[styles.rail, { justifyContent: 'center' }]}>
        <View style={[styles.node, { backgroundColor: c.violetSoft, borderColor: c.violetBorder }]}>
          <Icon size={18} color={c.violet} />
        </View>
      </View>
      <View style={[styles.body, { paddingBottom: 0 }]}>{children}</View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14 },
  rail: { width: NODE, alignItems: 'center' },
  nodeWrap: { width: NODE, height: NODE, alignItems: 'center', justifyContent: 'center' },
  node: { width: NODE, height: NODE, borderRadius: NODE / 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, width: 2, marginTop: 4, borderRadius: 1 },
  body: { flex: 1, minWidth: 0, paddingBottom: 14 },
})
