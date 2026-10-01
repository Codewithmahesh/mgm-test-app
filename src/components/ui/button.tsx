import * as Haptics from 'expo-haptics'
import type { LucideIcon } from 'lucide-react-native'
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { radius, useColors } from '@/theme'
import { Text } from './text'

export type ButtonVariant = 'default' | 'outline' | 'ghost' | 'success' | 'destructive' | 'destructive-outline' | 'secondary' | 'on-dark'
type Size = 'sm' | 'md' | 'lg'

const HEIGHT: Record<Size, number> = { sm: 34, md: 42, lg: 50 }
const FONT: Record<Size, number> = { sm: 13, md: 14, lg: 15 }

export function Button({ children, onPress, variant = 'default', size = 'md', icon: Icon, iconRight: IconRight, loading, disabled, full, style, haptic = true, accessibilityLabel }: {
  children?: React.ReactNode
  onPress?: () => void
  variant?: ButtonVariant
  size?: Size
  icon?: LucideIcon
  iconRight?: LucideIcon
  loading?: boolean
  disabled?: boolean
  full?: boolean
  style?: StyleProp<ViewStyle>
  haptic?: boolean
  accessibilityLabel?: string
}) {
  const c = useColors()
  const palette = {
    default: { bg: c.primary, pressed: c.primaryHover, fg: c.primaryForeground, border: c.primary },
    success: { bg: c.success, pressed: c.successInk, fg: '#ffffff', border: c.success },
    destructive: { bg: c.danger, pressed: c.dangerInk, fg: '#ffffff', border: c.danger },
    'destructive-outline': { bg: c.card, pressed: c.dangerSoft, fg: c.danger, border: c.dangerBorder },
    outline: { bg: c.card, pressed: c.muted, fg: c.foreground, border: c.borderStrong },
    secondary: { bg: c.secondary, pressed: c.muted, fg: c.foreground, border: c.secondary },
    ghost: { bg: 'transparent', pressed: c.muted, fg: c.foreground, border: 'transparent' },
    'on-dark': { bg: 'rgba(255,255,255,0.06)', pressed: 'rgba(255,255,255,0.12)', fg: '#ffffff', border: 'rgba(255,255,255,0.2)' },
  }[variant]
  const off = disabled || loading
  const iconSize = size === 'sm' ? 15 : 17
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(off), busy: Boolean(loading) }}
      disabled={off}
      onPress={() => { if (haptic) Haptics.selectionAsync().catch(() => {}); onPress?.() }}
      style={({ pressed }) => [
        styles.base,
        { height: HEIGHT[size], paddingHorizontal: size === 'sm' ? 12 : 16, backgroundColor: pressed ? palette.pressed : palette.bg, borderColor: palette.border, opacity: off && !loading ? 0.5 : 1 },
        full && styles.full,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={palette.fg} /> : Icon ? <Icon size={iconSize} color={palette.fg} strokeWidth={2} /> : null}
      {children != null && <Text weight="medium" size={FONT[size]} color={palette.fg} numberOfLines={1}>{children}</Text>}
      {IconRight && !loading && <IconRight size={iconSize} color={palette.fg} strokeWidth={2} />}
    </Pressable>
  )
}

/** Square icon-only button (toolbar actions, close). */
export function IconButton({ icon: Icon, onPress, label, tone, size = 38, disabled }: { icon: LucideIcon; onPress: () => void; label: string; tone?: string; size?: number; disabled?: boolean }) {
  const c = useColors()
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={6} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [{ width: size, height: size, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.muted : 'transparent', opacity: disabled ? 0.4 : 1 }]}>
      <Icon size={19} color={tone ?? c.mutedForeground} strokeWidth={2} />
    </Pressable>
  )
}

/** Tappable row used for links inside cards. */
export function PressRow({ children, onPress, style }: { children: React.ReactNode; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const c = useColors()
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ backgroundColor: pressed ? c.muted : 'transparent' }, style]}>
      <View>{children}</View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.md, borderWidth: 1 },
  full: { alignSelf: 'stretch' },
})
