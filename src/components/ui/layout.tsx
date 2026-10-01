import { router } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useColors } from '@/theme'
import { Eyebrow, Text } from './text'

/** A scrolling page on the cream canvas. Pass `onRefresh` for pull-to-refresh. */
export function Screen({ children, onRefresh, header, contentStyle, scroll = true, edges = ['top'] }: {
  children: React.ReactNode
  onRefresh?: () => Promise<unknown> | void
  header?: React.ReactNode
  contentStyle?: StyleProp<ViewStyle>
  scroll?: boolean
  edges?: ('top' | 'bottom')[]
}) {
  const c = useColors()
  const [refreshing, setRefreshing] = useState(false)
  const refresh = useCallback(async () => {
    if (!onRefresh) return
    setRefreshing(true)
    try { await onRefresh() } finally { setRefreshing(false) }
  }, [onRefresh])
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.background }}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} colors={[c.primary]} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : <View style={[{ flex: 1 }, contentStyle]}>{children}</View>}
    </SafeAreaView>
  )
}

/** Top bar for pushed screens: back, eyebrow + title, optional actions. */
export function ScreenHeader({ title, eyebrow, back = true, right, onBack }: { title: string; eyebrow?: string; back?: boolean; right?: React.ReactNode; onBack?: () => void }) {
  const c = useColors()
  return (
    <View style={[styles.header, { borderBottomColor: c.border, backgroundColor: c.background }]}>
      {back && (
        <Pressable onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} hitSlop={10} accessibilityLabel="Back"
          style={({ pressed }) => [styles.back, { backgroundColor: pressed ? c.muted : 'transparent' }]}>
          <ChevronLeft size={24} color={c.foreground} />
        </Pressable>
      )}
      <View style={{ flex: 1, minWidth: 0, paddingLeft: back ? 0 : 6 }}>
        {eyebrow && <Eyebrow numberOfLines={1}>{eyebrow}</Eyebrow>}
        <Text weight="semibold" size={17} numberOfLines={1}>{title}</Text>
      </View>
      {right && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>{right}</View>}
    </View>
  )
}

/** Large title at the top of a tab screen. */
export function PageTitle({ title, description, right }: { title: string; description?: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text serif weight="medium" size={28} leading={34} tracking={-0.4}>{title}</Text>
        {description && <Text size={13} tone="mutedForeground" style={{ marginTop: 4 }}>{description}</Text>}
      </View>
      {right}
    </View>
  )
}

export function Row({ children, gap = 12, style, wrap }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, wrap && { flexWrap: 'wrap' }, style]}>{children}</View>
}

export function Stack({ children, gap = 12, style }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap }, style]}>{children}</View>
}

/** A section label above a group of cards. */
export function SectionLabel({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
      <Text size={12} weight="semibold" tone="subtle" uppercase tracking={0.8}>{children}</Text>
      {right}
    </Row>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 56 },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
})
