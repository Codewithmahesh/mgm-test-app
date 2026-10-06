import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ChevronLeft } from 'lucide-react-native'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLLEGE_CITY, COLLEGE_NAME, Emblem, GridBackground, MadeBy } from './brand'
import { Eyebrow, Heading, Text } from './ui'
import { useColors } from '@/theme'

/**
 * Sign-in layout: the grid canvas fills the whole screen behind the college band (status bar
 * included); the form sits on a cream sheet that slides up over it.
 */
export function AuthShell({ role, title, subtitle, children, footer, brand, eyebrow, headline, blurb }: {
  role: 'Faculty' | 'Student'
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  /** Replaces the college emblem row, for products inside the app (e.g. JEMS). */
  brand?: React.ReactNode
  eyebrow?: string
  /** Optional serif headline and blurb under the eyebrow. */
  headline?: string
  blurb?: string
}) {
  const c = useColors()
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, backgroundColor: c.navy }}>
      <StatusBar style="light" />
      <GridBackground />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={[styles.band, { paddingTop: insets.top + 6 }]}>
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={10} accessibilityLabel="Back"
              style={({ pressed }) => [styles.back, { backgroundColor: pressed ? 'rgba(255,255,255,0.1)' : 'transparent' }]}>
              <ChevronLeft size={24} color="#ffffff" />
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 }}>
              {brand ?? (
                <>
                  <Emblem size={56} />
                  <View style={{ flex: 1 }}>
                    <Text size={17} weight="semibold" color="#ffffff" leading={22}>{COLLEGE_NAME}</Text>
                    <Text size={13} color="rgba(255,255,255,0.55)">{COLLEGE_CITY}</Text>
                  </View>
                </>
              )}
            </View>
            <Eyebrow tone="brand" style={{ marginTop: 22 }}>{eyebrow ?? (role === 'Faculty' ? '// faculty workspace' : '// student portal')}</Eyebrow>
            {headline ? <Text serif size={34} leading={40} tracking={-0.6} color={c.primaryForeground} style={{ marginTop: 12 }}>{headline}</Text> : null}
            {blurb ? <Text size={15} leading={23} color="rgba(255,255,255,0.65)" style={{ marginTop: 12 }}>{blurb}</Text> : null}
          </View>
          <View style={[styles.sheet, { backgroundColor: c.background, paddingBottom: insets.bottom + 20 }]}>
            <Heading>{title}</Heading>
            {subtitle ? <Text size={14} tone="mutedForeground" style={{ marginTop: 6 }}>{subtitle}</Text> : null}
            <View style={{ marginTop: 24 }}>{children}</View>
            {footer ? <View style={{ marginTop: 24, alignItems: 'center' }}>{footer}</View> : null}
            <View style={{ marginTop: 'auto', paddingTop: 28 }}><MadeBy /></View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

/** "First time here? Activate your account" style footer link. */
export function AuthLink({ text, link, onPress }: { text?: string; link: string; onPress: () => void }) {
  return (
    <Text size={14} tone="mutedForeground" center>
      {text ? `${text} ` : ''}<Text size={14} weight="medium" tone="primary" onPress={onPress} suppressHighlighting>{link}</Text>
    </Text>
  )
}

const styles = StyleSheet.create({
  band: { paddingHorizontal: 20, paddingBottom: 40 },
  back: { width: 38, height: 38, marginLeft: -8, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  sheet: { flexGrow: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -16, paddingHorizontal: 20, paddingTop: 28 },
})
