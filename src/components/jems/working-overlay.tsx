import { StatusBar } from 'expo-status-bar'
import { Check, Sparkles } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native'
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, ZoomIn } from 'react-native-reanimated'
import { GridBackground } from '@/components/brand'
import { Eyebrow, Text } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useColors } from '@/theme'
import { buzz, useFloat } from './motion'

const STEP_MS = 850

/**
 * Full-screen "we're working on it" moment: runs `task` while a checklist ticks through `steps`,
 * then calls `onDone` once both have finished (or `onError` if the task fails).
 */
export function WorkingOverlay({ eyebrow, title, steps, task, onDone, onError }: {
  eyebrow: string
  title: string
  steps: string[]
  task: () => Promise<void>
  onDone: () => void
  onError: (message: string) => void
}) {
  const c = useColors()
  const reduce = useReducedMotion()
  const [ticked, setTicked] = useState(0)
  const [taskDone, setTaskDone] = useState(false)
  const callbacks = useRef({ task, onDone, onError })
  useEffect(() => { callbacks.current = { task, onDone, onError } })

  useEffect(() => {
    let alive = true
    callbacks.current.task().then(() => { if (alive) setTaskDone(true) }).catch(err => { if (alive) callbacks.current.onError(errorMessage(err)) })
    let count = 0
    const timer = setInterval(() => {
      if (count >= steps.length) return
      count += 1
      buzz('light')
      setTicked(count)
    }, reduce ? 250 : STEP_MS)
    return () => { alive = false; clearInterval(timer) }
  }, [steps.length, reduce])

  const finished = taskDone && ticked >= steps.length
  useEffect(() => {
    if (!finished) return
    buzz('success')
    const timer = setTimeout(() => callbacks.current.onDone(), 450)
    return () => clearTimeout(timer)
  }, [finished])

  const spin = useSharedValue(0)
  useEffect(() => {
    if (reduce) return
    spin.set(withRepeat(withTiming(360, { duration: 2400, easing: Easing.linear }), -1, false))
  }, [reduce, spin])
  const orbit = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get()}deg` }] }))
  const float = useFloat(5)

  return (
    <Modal visible transparent={false} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: c.navy }}>
        <GridBackground />
        <View style={styles.center}>
          <Animated.View style={[styles.badgeWrap, float]}>
            <Animated.View style={[styles.orbit, { borderColor: c.brand }, orbit]} />
            <View style={[styles.badge, { backgroundColor: c.primary }]}>
              <Sparkles size={30} color={c.primaryForeground} />
            </View>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(100)}><Eyebrow tone="brand" center style={{ marginTop: 28 }}>{eyebrow}</Eyebrow></Animated.View>
          <Animated.View entering={FadeInDown.delay(120).duration(260)}>
            <Text serif size={28} leading={34} color={c.primaryForeground} center style={{ marginTop: 10 }}>{title}</Text>
          </Animated.View>
          <View style={styles.steps} accessibilityLiveRegion="polite">
            {steps.map((step, i) => {
              const done = i < ticked
              const active = i === ticked
              return (
                <Animated.View key={step} entering={FadeInDown.delay(180 + i * 60).duration(240)} style={styles.step}>
                  <View style={[styles.tick, { backgroundColor: done ? c.brand : 'rgba(255,255,255,0.08)', borderColor: done ? c.brand : 'rgba(255,255,255,0.18)' }]}>
                    {done ? <Animated.View entering={ZoomIn.duration(180)}><Check size={14} color={c.navy} strokeWidth={3} /></Animated.View>
                      : active ? <ActivityIndicator size="small" color={c.brand} /> : null}
                  </View>
                  <Text size={15} color={done ? c.primaryForeground : active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)'} style={{ flex: 1 }}>{step}</Text>
                </Animated.View>
              )
            })}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  badgeWrap: { alignSelf: 'center', width: 104, height: 104, alignItems: 'center', justifyContent: 'center' },
  orbit: { position: 'absolute', width: 104, height: 104, borderRadius: 52, borderWidth: 2, borderStyle: 'dashed', opacity: 0.6 },
  badge: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  steps: { marginTop: 32, gap: 14 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tick: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
})
