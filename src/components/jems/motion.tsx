import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated'
import { toneColors, useColors, type Tone } from '@/theme'

// Motion for the JEMS screens. Reanimated respects the system "reduce motion" setting for every
// animation here (their default), and the loops below switch off entirely when it's on.
// Shared values use .get()/.set() because the React Compiler is enabled.

export const SPRING = { damping: 16, stiffness: 220, mass: 0.8 }

/** Staggered entrance for cards and rows: `entering={enter(i)}`. */
export const enter = (i = 0) => FadeInDown.delay(Math.min(i, 10) * 60).springify().damping(18).stiffness(160)

type Buzz = 'selection' | 'light' | 'medium' | 'success' | 'warning' | 'error'

/** Haptic feedback that never throws (web, simulators). */
export function buzz(kind: Buzz = 'selection') {
  const run = kind === 'selection' ? Haptics.selectionAsync()
    : kind === 'light' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    : kind === 'medium' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    : Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : kind === 'warning' ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Error)
  run.catch(() => {})
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

/** A Pressable that springs down a little under the finger, with a haptic tick on press. */
export function Tap({ style, scaleTo = 0.97, haptic = 'selection', onPressIn, onPressOut, onPress, ...props }: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scaleTo?: number; haptic?: Buzz | false }) {
  const scale = useSharedValue(1)
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }))
  return (
    <AnimatedPressable
      {...props}
      onPressIn={e => { scale.set(withSpring(scaleTo, SPRING)); onPressIn?.(e) }}
      onPressOut={e => { scale.set(withSpring(1, SPRING)); onPressOut?.(e) }}
      onPress={e => { if (haptic) buzz(haptic); onPress?.(e) }}
      style={[style, animated]}
    />
  )
}

/** A number that counts up to `target` (from where it was) with an ease-out. */
export function useCountUp(target: number, duration = 900, delay = 0) {
  const reduce = useReducedMotion()
  const [value, setValue] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    if (reduce) return
    const start = from.current
    let frame = 0
    let startedAt = 0
    const step = (t: number) => {
      if (!startedAt) startedAt = t
      const p = Math.min(1, (t - startedAt) / duration)
      const next = Math.round(start + (target - start) * (1 - Math.pow(1 - p, 3)))
      from.current = next
      setValue(next)
      if (p < 1) frame = requestAnimationFrame(step)
    }
    const timer = setTimeout(() => { frame = requestAnimationFrame(step) }, delay)
    return () => { clearTimeout(timer); cancelAnimationFrame(frame) }
  }, [target, duration, delay, reduce])
  return reduce ? target : value
}

/** A quick horizontal shake with a warning buzz, for "not yet" taps. */
export function useShake() {
  const x = useSharedValue(0)
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }))
  const shake = useCallback(() => {
    buzz('warning')
    x.set(withSequence(withTiming(-9, { duration: 45 }), withTiming(9, { duration: 60 }), withTiming(-6, { duration: 60 }), withTiming(6, { duration: 60 }), withTiming(0, { duration: 45 })))
  }, [x])
  return { style, shake }
}

/** A little bounce whenever `trigger` changes (selection, newly verified, etc). */
export function usePop(trigger: unknown, amount = 1.06) {
  const scale = useSharedValue(1)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    scale.set(withSequence(withTiming(amount, { duration: 110 }), withSpring(1, SPRING)))
  }, [trigger, amount, scale])
  return useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }))
}

/** Animated progress bar. Fills from empty on mount (or from `from`), then follows `value`. */
export function Meter({ value, tone = 'blue', color, track, height = 6, delay = 0, from = 0, rounded = true, style, label }: {
  value: number
  tone?: Tone
  color?: string
  track?: string
  height?: number
  delay?: number
  from?: number
  rounded?: boolean
  style?: StyleProp<ViewStyle>
  label?: string
}) {
  const c = useColors()
  const pct = Math.max(0, Math.min(100, value))
  const width = useSharedValue(from)
  useEffect(() => {
    width.set(withDelay(delay, withTiming(pct, { duration: 900, easing: Easing.out(Easing.cubic) })))
  }, [pct, delay, width])
  const fill = useAnimatedStyle(() => ({ width: `${width.get()}%` }))
  const r = rounded ? height : 0
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[{ height, borderRadius: r, backgroundColor: track ?? c.muted, overflow: 'hidden' }, style]}>
      <Animated.View style={[{ height: '100%', borderRadius: r, backgroundColor: color ?? toneColors(c, tone).solid }, fill]} />
    </View>
  )
}

/** A soft ring that keeps radiating out from behind an element (current step, running timer). */
export function Pulse({ color, size, radius, active = true }: { color: string; size: number; radius?: number; active?: boolean }) {
  const reduce = useReducedMotion()
  const t = useSharedValue(0)
  useEffect(() => {
    if (!active || reduce) return
    t.set(withRepeat(withTiming(1, { duration: 1700, easing: Easing.out(Easing.quad) }), -1, false))
  }, [active, reduce, t])
  const style = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - t.get()), transform: [{ scale: 1 + t.get() * 0.55 }] }))
  if (!active || reduce) return null
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: radius ?? size / 2, backgroundColor: color }, style]} />
}

/** Gentle floating loop, used for illustrations and badges that should feel alive. */
export function useFloat(distance = 4, duration = 1800) {
  const reduce = useReducedMotion()
  const y = useSharedValue(0)
  useEffect(() => {
    if (reduce) return
    y.set(withRepeat(withSequence(withTiming(-distance, { duration, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration, easing: Easing.inOut(Easing.sin) })), -1, false))
  }, [reduce, distance, duration, y])
  return useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }))
}
