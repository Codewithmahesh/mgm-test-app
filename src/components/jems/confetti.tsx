import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'
import { useColors } from '@/theme'

const COUNT = 42

// Deterministic "random" so rendering stays pure: the same burst for the same `run`.
const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

type Piece = { angle: number; speed: number; spin: number; color: string; w: number; h: number; delay: number; round: boolean }

function Bit({ piece }: { piece: Piece }) {
  const t = useSharedValue(0)
  useEffect(() => {
    t.set(withDelay(piece.delay, withTiming(1, { duration: 1700, easing: Easing.out(Easing.quad) })))
  }, [piece.delay, t])
  const style = useAnimatedStyle(() => {
    const p = t.get()
    return {
      opacity: p === 0 ? 0 : p < 0.75 ? 1 : (1 - p) * 4,
      transform: [
        { translateX: Math.cos(piece.angle) * piece.speed * p },
        { translateY: Math.sin(piece.angle) * piece.speed * p + 520 * p * p },
        { rotate: `${piece.spin * p}deg` },
      ],
    }
  })
  return <Animated.View style={[{ position: 'absolute', width: piece.w, height: piece.h, borderRadius: piece.round ? piece.w / 2 : 2, backgroundColor: piece.color }, style]} />
}

/** A burst of confetti from the upper middle of its parent. Change `run` to fire again; 0 shows nothing. */
export function Confetti({ run }: { run: number }) {
  const c = useColors()
  const reduce = useReducedMotion()
  if (!run || reduce) return null
  const colors = [c.primary, c.brand, c.success, c.violet, c.warning, c.danger]
  const pieces: Piece[] = Array.from({ length: COUNT }, (_, i) => {
    const r = (k: number) => rand(run * 97 + i * 13 + k)
    return {
      angle: -Math.PI * (0.08 + r(1) * 0.84),
      speed: 170 + r(2) * 240,
      spin: (r(3) - 0.5) * 900,
      color: colors[i % colors.length],
      w: 6 + r(4) * 6,
      h: 8 + r(5) * 8,
      delay: r(6) * 140,
      round: r(7) > 0.7,
    }
  })
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.origin}>
        {pieces.map((piece, i) => <Bit key={`${run}-${i}`} piece={piece} />)}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  origin: { position: 'absolute', top: '28%', left: '50%', width: 0, height: 0 },
})
