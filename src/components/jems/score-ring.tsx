import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import { Text } from '@/components/ui'
import { useColors } from '@/theme'
import { useCountUp } from './motion'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

/** Circular score that sweeps in while the number counts up. */
export function ScoreRing({ value, size = 128, stroke = 12, color, track, textColor, label, delay = 200 }: {
  value: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  textColor?: string
  label: string
  delay?: number
}) {
  const c = useColors()
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const progress = useSharedValue(0)
  useEffect(() => {
    progress.set(withDelay(delay, withTiming(Math.max(0, Math.min(100, value)) / 100, { duration: 800, easing: Easing.out(Easing.cubic) })))
  }, [value, delay, progress])
  const arc = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - progress.get()) }))
  const shown = useCountUp(value, 800, delay)

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: value }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? c.muted} strokeWidth={stroke} fill="none" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={color ?? c.primary} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`} animatedProps={arc} rotation={-90} origin={`${size / 2}, ${size / 2}`} />
      </Svg>
      <Text serif weight="medium" size={Math.round(size * 0.3)} leading={Math.round(size * 0.36)} color={textColor} tabular>{shown}</Text>
    </View>
  )
}
