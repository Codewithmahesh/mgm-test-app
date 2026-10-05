import { useCallback, useState } from 'react'
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { SlideInDown } from 'react-native-reanimated'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { ScreenHeader, Text } from '@/components/ui'
import { useColors } from '@/theme'
import { Meter } from './motion'

/**
 * Pushed JEMS screen: header, keyboard-aware scrolling body and an optional sticky footer.
 * (The app's `Screen` has no footer slot, so this mirrors it with one.)
 */
export function FlowScreen({ header, footer, children, onRefresh, contentStyle, scrollRef }: {
  header?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  onRefresh?: () => Promise<unknown>
  contentStyle?: StyleProp<ViewStyle>
  scrollRef?: React.Ref<ScrollView>
}) {
  const c = useColors()
  const [refreshing, setRefreshing] = useState(false)
  const refresh = useCallback(async () => {
    if (!onRefresh) return
    setRefreshing(true)
    try { await onRefresh() } finally { setRefreshing(false) }
  }, [onRefresh])
  return (
    <SafeAreaView edges={footer ? ['top'] : ['top', 'bottom']} style={{ flex: 1, backgroundColor: c.background }}>
      {header}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} colors={[c.primary]} /> : undefined}>
          {children}
        </ScrollView>
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

/** Bottom action bar that slides up with the screen and clears the home indicator. */
export function StickyFooter({ children, caption, row }: { children: React.ReactNode; caption?: React.ReactNode; row?: boolean }) {
  const c = useColors()
  const insets = useSafeAreaInsets()
  return (
    <Animated.View entering={SlideInDown.springify().damping(20).stiffness(180)}
      style={[styles.footer, { backgroundColor: c.card, borderTopColor: c.border, paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
      {caption ? (typeof caption === 'string' ? <Text size={13} tone="mutedForeground" center>{caption}</Text> : caption) : null}
      <View style={row ? styles.row : undefined}>{children}</View>
    </Animated.View>
  )
}

/** Header for the onboarding steps: back · title · "Step n of 3". */
export function StepHeader({ title, step, total = 3 }: { title: string; step: number; total?: number }) {
  return <ScreenHeader title={title} right={<Text size={14} tone="mutedForeground" style={{ paddingRight: 8 }}>{`Step ${step} of ${total}`}</Text>} />
}

/** Segmented progress for onboarding: finished steps are full, the current one fills in. */
export function StepProgress({ step, total = 3 }: { step: number; total?: number }) {
  return (
    <View style={styles.steps} accessibilityRole="progressbar" accessibilityLabel={`Step ${step} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <Meter key={i} value={i < step ? 100 : 0} from={i < step - 1 ? 100 : 0} delay={i === step - 1 ? 150 : 0} height={5} style={{ flex: 1 }} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  steps: { flexDirection: 'row', gap: 6 },
})
