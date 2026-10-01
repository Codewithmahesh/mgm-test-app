import type { LucideIcon } from 'lucide-react-native'
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { radius, toneColors, useColors, useIsDark, type Tone } from '@/theme'
import { Text } from './text'

export function Card({ children, style, tone, padded }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; tone?: Tone; padded?: boolean }) {
  const c = useColors()
  const dark = useIsDark()
  const border = tone ? toneColors(c, tone).border : c.border
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: border }, !dark && styles.shadow, padded && { padding: 16 }, style]}>
      {children}
    </View>
  )
}

/**
 * Card title row with a hairline under it, like the website's CardHeader. Content below starts 14 px
 * under the line; pass `flush` for lists whose rows bring their own padding.
 */
export function CardHeader({ title, description, action, flush }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; flush?: boolean }) {
  const c = useColors()
  return (
    <View style={[styles.header, { borderBottomColor: c.border, marginBottom: flush ? 0 : 14 }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof title === 'string' ? <Text weight="semibold" size={15}>{title}</Text> : title}
        {description ? (typeof description === 'string' ? <Text size={13} tone="mutedForeground" leading={18} style={{ marginTop: 2 }}>{description}</Text> : description) : null}
      </View>
      {action ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{action}</View> : null}
    </View>
  )
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const c = useColors()
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }, style]} />
}

export function Badge({ children, tone = 'neutral', dot, icon: Icon }: { children: React.ReactNode; tone?: Tone; dot?: boolean; icon?: LucideIcon }) {
  const c = useColors()
  const t = toneColors(c, tone)
  return (
    <View style={[styles.badge, { backgroundColor: t.bg, borderColor: t.border }]}>
      {dot && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.fg }} />}
      {Icon && <Icon size={11} color={t.fg} strokeWidth={2.4} />}
      <Text size={11} weight="semibold" color={t.fg} leading={15} numberOfLines={1}>{children}</Text>
    </View>
  )
}

/** Rounded icon square used on KPI tiles and list rows. */
export function IconTile({ icon: Icon, tone = 'blue', size = 36 }: { icon: LucideIcon; tone?: Tone; size?: number }) {
  const c = useColors()
  const t = toneColors(c, tone)
  return (
    <View style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={Math.round(size * 0.5)} color={tone === 'neutral' ? c.mutedForeground : t.solid} strokeWidth={2} />
    </View>
  )
}

export function Alert({ children, tone = 'red', icon: Icon, style }: { children: React.ReactNode; tone?: 'red' | 'amber' | 'green' | 'blue'; icon?: LucideIcon; style?: StyleProp<ViewStyle> }) {
  const c = useColors()
  const t = toneColors(c, tone)
  return (
    <View style={[styles.alert, { backgroundColor: t.bg, borderColor: t.border }, style]} accessibilityRole="alert">
      {Icon && <Icon size={16} color={t.fg} style={{ marginTop: 2 }} />}
      <View style={{ flex: 1 }}>{typeof children === 'string' ? <Text size={13} color={t.fg} leading={19}>{children}</Text> : children}</View>
    </View>
  )
}

export function Progress({ value, tone = 'blue', height = 6, style }: { value: number; tone?: Tone; height?: number; style?: StyleProp<ViewStyle> }) {
  const c = useColors()
  const pct = Math.max(0, Math.min(100, value))
  return (
    <View style={[{ height, borderRadius: height, backgroundColor: c.muted, overflow: 'hidden' }, style]}>
      <View style={{ width: `${pct}%`, height: '100%', borderRadius: height, backgroundColor: toneColors(c, tone).solid }} />
    </View>
  )
}

export function StatCard({ label, value, suffix, hint, icon, tone = 'blue', style }: { label: string; value: React.ReactNode; suffix?: string; hint?: React.ReactNode; icon?: LucideIcon; tone?: Tone; style?: StyleProp<ViewStyle> }) {
  return (
    <Card padded style={[{ flex: 1, minWidth: 148 }, style]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text size={13} weight="medium" tone="mutedForeground" numberOfLines={1}>{label}</Text>
          <Text size={24} weight="semibold" tabular tracking={-0.4} leading={30} style={{ marginTop: 6 }} numberOfLines={1}>
            {value}{suffix ? <Text size={14} weight="medium" tone="mutedForeground">{suffix}</Text> : null}
          </Text>
        </View>
        {icon && <IconTile icon={icon} tone={tone} size={36} />}
      </View>
      {hint ? (typeof hint === 'string' ? <Text size={12} tone="mutedForeground" style={{ marginTop: 8 }} numberOfLines={2}>{hint}</Text> : hint) : null}
    </Card>
  )
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode }) {
  const c = useColors()
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingVertical: 40 }}>
      <View style={{ width: 44, height: 44, borderRadius: radius.lg, backgroundColor: c.muted, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={c.mutedForeground} />
      </View>
      <Text weight="semibold" size={15} center style={{ marginTop: 14 }}>{title}</Text>
      {description && <Text size={13} tone="mutedForeground" center style={{ marginTop: 4, maxWidth: 320 }}>{description}</Text>}
      {action && <View style={{ marginTop: 18 }}>{action}</View>}
    </View>
  )
}

export function Spinner({ size = 'small', color }: { size?: 'small' | 'large'; color?: string }) {
  const c = useColors()
  return <ActivityIndicator size={size} color={color ?? c.primary} />
}

export function PageLoader() {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}><Spinner size="large" /></View>
}

/** Label/value row used in detail cards. */
export function DetailRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: LucideIcon }) {
  const c = useColors()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {Icon && <Icon size={14} color={c.mutedForeground} />}
        <Text size={13} tone="mutedForeground">{label}</Text>
      </View>
      <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>{typeof value === 'string' || typeof value === 'number' ? <Text size={13} weight="medium" tabular style={{ textAlign: 'right' }}>{value}</Text> : value}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  shadow: { shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2.5 },
  alert: { flexDirection: 'row', gap: 8, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
})
