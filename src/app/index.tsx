import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ArrowRight, CheckCircle2, GraduationCap, Presentation, Route, type LucideIcon } from 'lucide-react-native'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLLEGE_CITY, COLLEGE_NAME, Emblem, GridBackground, MadeBy, PORTAL_NAME } from '@/components/brand'
import { Eyebrow, Text } from '@/components/ui'
import { radius, useColors } from '@/theme'

export default function Welcome() {
  const c = useColors()
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, backgroundColor: c.navy }}>
      <StatusBar style="light" />
      <GridBackground />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
        <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
          <Text mono size={11} uppercase tracking={2.2} color="rgba(255,255,255,0.5)">{PORTAL_NAME}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 32 }}>
            <Emblem size={76} />
            <View style={{ flex: 1 }}>
              <Text size={21} weight="semibold" color="#ffffff" leading={26}>{COLLEGE_NAME}</Text>
              <Text size={14} color="rgba(255,255,255,0.55)" style={{ marginTop: 2 }}>{COLLEGE_CITY}</Text>
            </View>
          </View>
          <Eyebrow tone="brand" style={{ marginTop: 32 }}>{'// online examination'}</Eyebrow>
          <Text serif size={30} leading={36} tracking={-0.5} color="#ffffff" style={{ marginTop: 10 }}>Fair, timed exams, right from your phone.</Text>
          <View style={{ gap: 10, marginTop: 20 }}>
            {['Join exams with the room code from your faculty', 'Answers save automatically as you go', 'Faculty: create exams and questions with AI'].map(point => (
              <View key={point} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <CheckCircle2 size={17} color={c.brand} style={{ marginTop: 2 }} />
                <Text size={14} color="rgba(255,255,255,0.75)" style={{ flex: 1 }}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.panel, { backgroundColor: c.background, paddingBottom: insets.bottom + 20 }]}>
          <Text serif size={24} weight="medium">Sign in</Text>
          <Text size={14} tone="mutedForeground" style={{ marginTop: 4 }}>Choose how you use the portal.</Text>
          <View style={{ gap: 12, marginTop: 20 }}>
            <RoleCard icon={GraduationCap} title="I'm a student" text="Sign in with your college email to take exams and see results." onPress={() => router.push('/student-login')} />
            <RoleCard icon={Presentation} title="I'm faculty" text="Create exam rooms, add questions and watch results live." onPress={() => router.push('/faculty-login')} />
            <RoleCard icon={Route} title="JEMS for students" text="Check your skills against MSME jobs and follow a roadmap to close the gaps." onPress={() => router.push('/jems-login')} />
          </View>
          <View style={{ marginTop: 'auto', paddingTop: 28 }}><MadeBy /></View>
        </View>
      </ScrollView>
    </View>
  )
}

function RoleCard({ icon: Icon, title, text, onPress }: { icon: LucideIcon; title: string; text: string; onPress: () => void }) {
  const c = useColors()
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => [styles.card, { backgroundColor: pressed ? c.primarySoft : c.card, borderColor: pressed ? c.primaryBorder : c.border }]}>
      <View style={{ width: 44, height: 44, borderRadius: radius.lg, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={22} color={c.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text size={16} weight="semibold">{title}</Text>
        <Text size={13} tone="mutedForeground" leading={18} style={{ marginTop: 2 }}>{text}</Text>
      </View>
      <ArrowRight size={18} color={c.subtle} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 24, paddingBottom: 44 },
  panel: { flexGrow: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -16, paddingHorizontal: 20, paddingTop: 26 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: radius.xl, padding: 16 },
})
