import type { LucideIcon } from 'lucide-react-native'
import { useEffect } from 'react'
import type { ColorValue } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated'
import { SPRING } from './motion'

function BouncyIcon({ icon: Icon, color, focused }: { icon: LucideIcon; color: ColorValue; focused: boolean }) {
  const scale = useSharedValue(1)
  const lift = useSharedValue(0)
  useEffect(() => {
    if (focused) {
      scale.set(withSequence(withTiming(1.22, { duration: 120 }), withSpring(1.06, SPRING)))
      lift.set(withSequence(withTiming(-4, { duration: 120 }), withSpring(0, SPRING)))
    } else {
      scale.set(withSpring(1, SPRING))
    }
  }, [focused, scale, lift])
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.get() }, { scale: scale.get() }] }))
  return (
    <Animated.View style={style}>
      <Icon size={22} color={color as string} strokeWidth={focused ? 2.3 : 1.9} />
    </Animated.View>
  )
}

/** Like `tabIcon` from the shared tab bar, but the icon hops when its tab is selected. */
export const bouncyTabIcon = (Icon: LucideIcon) => function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
  return <BouncyIcon icon={Icon} color={color} focused={focused} />
}
