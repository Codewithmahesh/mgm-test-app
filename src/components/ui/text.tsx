import { Text as RNText, type TextProps, type TextStyle } from 'react-native'
import { fonts, useColors, type Palette } from '@/theme'

type Weight = 'regular' | 'medium' | 'semibold' | 'bold'
type Tone = keyof Pick<Palette, 'foreground' | 'mutedForeground' | 'subtle' | 'primary' | 'primaryInk' | 'success' | 'successInk' | 'warning' | 'warningInk' | 'danger' | 'dangerInk' | 'violet' | 'brand' | 'primaryForeground'>

export type TextOptions = {
  size?: number
  weight?: Weight
  tone?: Tone
  color?: string
  mono?: boolean
  serif?: boolean
  center?: boolean
  uppercase?: boolean
  tracking?: number
  leading?: number
  /** Tabular digits for scores, timers and counts. */
  tabular?: boolean
}

export function Text({ size = 15, weight = 'regular', tone = 'foreground', color, mono, serif, center, uppercase, tracking, leading, tabular, style, ...props }: TextProps & TextOptions) {
  const c = useColors()
  const family = mono ? (weight === 'semibold' || weight === 'bold' ? fonts.monoSemibold : fonts.mono)
    : serif ? (weight === 'semibold' || weight === 'bold' ? fonts.serifSemibold : fonts.serif)
    : fonts[weight]
  const base: TextStyle = {
    fontFamily: family,
    fontSize: size,
    lineHeight: leading ?? Math.round(size * 1.45),
    color: color ?? c[tone],
    ...(center ? { textAlign: 'center' } : null),
    ...(uppercase ? { textTransform: 'uppercase' } : null),
    ...(tracking != null ? { letterSpacing: tracking } : null),
    ...(tabular ? { fontVariant: ['tabular-nums'] } : null),
  }
  return <RNText {...props} style={[base, style]} />
}

/** Page heading: Source Serif, like the website's auth titles. */
export function Heading({ children, size = 26, ...props }: TextProps & TextOptions) {
  return <Text serif weight="medium" size={size} leading={Math.round(size * 1.2)} tracking={-0.3} {...props}>{children}</Text>
}

/** Small uppercase mono label, e.g. "// student portal" or "ROOM K3B2FM". */
export function Eyebrow({ children, tone = 'primary', ...props }: TextProps & TextOptions) {
  return <Text mono size={11} uppercase tracking={1.8} tone={tone} {...props}>{children}</Text>
}
