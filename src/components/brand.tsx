import { Image } from 'expo-image'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Svg, { Defs, Pattern, Path, RadialGradient, Rect, Stop } from 'react-native-svg'
import { radius, useColors } from '@/theme'
import { Text } from './ui/text'

export const COLLEGE_NAME = "MGM's College of Engineering"
export const COLLEGE_CITY = 'Nanded'
export const PORTAL_NAME = 'Online Examination Portal'
export const COMPANY_NAME = 'Exponentor'

const logo = require('@/assets/images/mgm-logo.png')

export function Emblem({ size = 36, style }: { size?: number; style?: StyleProp<any> }) {
  return <Image source={logo} style={[{ width: size, height: size }, style]} contentFit="contain" accessibilityLabel={`${COLLEGE_NAME}, ${COLLEGE_CITY}`} />
}

export function Logo({ size = 40, dark, subtitle = `${COLLEGE_CITY} · ${PORTAL_NAME}` }: { size?: number; dark?: boolean; subtitle?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Emblem size={size} />
      <View style={{ flexShrink: 1 }}>
        <Text weight="semibold" size={15} color={dark ? '#ffffff' : undefined} numberOfLines={1} tracking={-0.2}>{COLLEGE_NAME}</Text>
        {subtitle ? <Text size={11} weight="medium" color={dark ? 'rgba(255,255,255,0.55)' : undefined} tone="mutedForeground" numberOfLines={1}>{subtitle}</Text> : null}
      </View>
    </View>
  )
}

/**
 * The website's navy banner: fine white grid at 7% and a soft amber glow,
 * with the emblem watermarked on the right.
 */
export function NavyBanner({ children, style, emblem = true, glow = 'right' }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; emblem?: boolean; glow?: 'left' | 'right' }) {
  const c = useColors()
  return (
    <View style={[styles.banner, { backgroundColor: c.navy }, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <Pattern id="grid" width={28} height={28} patternUnits="userSpaceOnUse">
            <Path d="M 28 0 L 0 0 0 28" fill="none" stroke="#ffffff" strokeOpacity={0.07} strokeWidth={1} />
          </Pattern>
          <RadialGradient id="glow" cx={glow === 'right' ? '100%' : '0%'} cy={glow === 'right' ? '0%' : '100%'} r="75%">
            <Stop offset="0" stopColor={c.brand} stopOpacity={0.22} />
            <Stop offset="1" stopColor={c.brand} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#grid)" />
        <Rect width="100%" height="100%" fill="url(#glow)" />
      </Svg>
      {emblem && <Emblem size={150} style={styles.watermark} />}
      {children}
    </View>
  )
}

/**
 * Full-bleed navy canvas for the sign-in screens: the website's fine grid across the whole screen
 * (under the status bar too) with the amber glow in the top-right corner. Place it first inside a
 * full-screen container; content sits on top.
 */
export function GridBackground() {
  const c = useColors()
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.navy }]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="auth-grid" width={32} height={32} patternUnits="userSpaceOnUse">
            <Path d="M 32 0 L 0 0 0 32" fill="none" stroke="#ffffff" strokeOpacity={0.07} strokeWidth={1} />
          </Pattern>
          <RadialGradient id="auth-glow" cx="100%" cy="0%" r="70%">
            <Stop offset="0" stopColor={c.brand} stopOpacity={0.2} />
            <Stop offset="1" stopColor={c.brand} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#auth-grid)" />
        <Rect width="100%" height="100%" fill="url(#auth-glow)" />
      </Svg>
    </View>
  )
}

export function MadeBy({ dark }: { dark?: boolean }) {
  return (
    <Text size={12} tone="mutedForeground" color={dark ? 'rgba(255,255,255,0.45)' : undefined} center>
      Designed & developed by <Text size={12} weight="semibold" color={dark ? 'rgba(255,255,255,0.85)' : undefined}>{COMPANY_NAME}</Text>
    </Text>
  )
}

const styles = StyleSheet.create({
  banner: { borderRadius: radius.xl, overflow: 'hidden', padding: 20 },
  watermark: { position: 'absolute', right: -28, top: '50%', marginTop: -75, opacity: 0.1 },
})
