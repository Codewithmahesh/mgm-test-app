import { Check } from 'lucide-react-native'
import { View } from 'react-native'
import Animated, { ZoomIn } from 'react-native-reanimated'
import { radius, useColors } from '@/theme'

/** Checkbox visual whose tick springs in. The parent row handles the press. */
export function TickBox({ checked, tone = 'primary', size = 24 }: { checked: boolean; tone?: 'primary' | 'success'; size?: number }) {
  const c = useColors()
  const solid = tone === 'success' ? c.success : c.primary
  return (
    <View style={{ width: size, height: size, borderRadius: radius.sm, borderWidth: 1.5, borderColor: checked ? solid : c.borderStrong, backgroundColor: checked ? solid : c.card, alignItems: 'center', justifyContent: 'center' }}>
      {checked && <Animated.View entering={ZoomIn.duration(180)}><Check size={size * 0.62} color={c.primaryForeground} strokeWidth={3} /></Animated.View>}
    </View>
  )
}
