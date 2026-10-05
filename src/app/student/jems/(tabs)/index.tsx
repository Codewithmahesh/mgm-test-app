// Placeholder: Home isn't designed yet. It shows where the student is in the JEMS journey and the next step.
import { router } from 'expo-router'
import { ArrowRight, Check } from 'lucide-react-native'
import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { NavyBanner } from '@/components/brand'
import { enter, JemsMark, Meter, Pulse, Tap, useFloat } from '@/components/jems'
import { Alert, Badge, Button, Card, CardHeader, Divider, Eyebrow, PageLoader, Row, Screen, ScreenHeader, Text } from '@/components/ui'
import { getRoadmap, getStatus, nextLesson, type JemsStatus } from '@/lib/jems'
import { useJems, useJemsData } from '@/lib/jems-store'
import { useSession } from '@/lib/session'
import { useColors } from '@/theme'

type Step = { title: string; text: string; done: boolean; href: string; cta: string }

function stepsFor(status: JemsStatus): Step[] {
  return [
    { title: 'Profile and skills', text: 'Your target role, skills, GitHub and LeetCode', done: status.onboarded, href: '/student/jems/onboarding/profile', cta: 'Set up your profile' },
    { title: 'Skill assessment', text: '30 questions on the skills you added', done: status.assessed, href: '/student/jems/assessment', cta: 'Take the assessment' },
    { title: 'Skill gaps', text: `Compared with ${status.roleLabel} roles at MSMEs`, done: status.roadmapReady, href: '/student/jems/gaps', cta: 'See my skill gaps' },
    { title: 'Roadmap', text: 'Lessons and practice to close each gap', done: false, href: '/student/jems/roadmap', cta: 'Open my roadmap' },
  ]
}

export default function JemsHome() {
  const c = useColors()
  const { student } = useSession()
  const { claimOnboardingPrompt } = useJems()
  const { data: status, error, reload } = useJemsData(getStatus)
  const { data: roadmap, reload: reloadRoadmap } = useJemsData(getRoadmap)
  const float = useFloat(4, 2200)

  // First visit this session and nothing set up yet: open step 1 straight away.
  useEffect(() => {
    if (!status || status.onboarded) return
    if (claimOnboardingPrompt()) router.push('/student/jems/onboarding/profile')
  }, [status, claimOnboardingPrompt])

  const steps = status ? stepsFor(status) : []
  const nextIndex = steps.findIndex(s => !s.done)
  const next = steps[nextIndex]
  const progress = steps.length ? (steps.filter(s => s.done).length / steps.length) * 100 : 0
  const current = roadmap?.modules.find(m => m.status === 'in_progress')
  const first = student?.name?.split(' ')[0]

  return (
    <Screen header={<ScreenHeader title="Home" back={false} />} onRefresh={() => Promise.all([reload(), reloadRoadmap()])}>
      <Animated.View entering={enter(0)}>
        <NavyBanner emblem={false} glow="left">
          <Row gap={14}>
            <View style={{ flex: 1 }}>
              <Eyebrow tone="brand">JEMS · for students</Eyebrow>
              <Text serif size={28} leading={34} color={c.primaryForeground} style={{ marginTop: 8 }}>{`Hi${first ? `, ${first}` : ''}`}</Text>
              <Text size={14} leading={20} color="rgba(255,255,255,0.65)" style={{ marginTop: 4 }}>See where you stand. Close the gap.</Text>
            </View>
            <Animated.View style={float}><JemsMark size={56} /></Animated.View>
          </Row>
          <Row gap={12} style={{ marginTop: 18 }}>
            <Meter value={progress} color={c.brand} track="rgba(255,255,255,0.14)" delay={250} style={{ flex: 1 }} label="Journey progress" />
            <Text size={13} color="rgba(255,255,255,0.7)" tabular>{`${steps.filter(s => s.done).length} of ${steps.length || 4}`}</Text>
          </Row>
        </NavyBanner>
      </Animated.View>

      {error ? <Alert>{error}</Alert> : !status ? <PageLoader /> : (
        <>
          {current && (
            <Animated.View entering={enter(1)}>
              <Tap onPress={() => router.push(`/student/jems/module/${current.id}`)} scaleTo={0.98} accessibilityRole="button">
                <Card style={{ borderColor: c.primary }}>
                  <View style={{ padding: 16, gap: 8 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Text mono size={13} tone="primaryInk">{`Module ${current.index} · ${current.weeks}`}</Text>
                      <Badge tone="blue">Up next</Badge>
                    </Row>
                    <Text size={18} weight="semibold">{current.title}</Text>
                    <Text size={14} tone="mutedForeground">{nextLesson(current) ? `Next lesson: ${nextLesson(current)?.title}` : 'Practice and mini-assessment left'}</Text>
                  </View>
                </Card>
              </Tap>
            </Animated.View>
          )}

          <Animated.View entering={enter(2)}>
            <Card>
              <CardHeader flush title={<Text size={17} weight="semibold">Your journey</Text>} description="Four steps from sign-in to job-ready" />
              {steps.map((step, i) => {
                const isNext = i === nextIndex
                return (
                  <View key={step.title}>
                    {i > 0 && <Divider />}
                    <Tap onPress={() => router.push(step.href)} scaleTo={0.985} accessibilityRole="button"
                      accessibilityLabel={`${step.title}${step.done ? ', done' : isNext ? ', next step' : ''}`} style={[styles.step, isNext && { backgroundColor: c.primarySoft }]}>
                      <View style={styles.dotWrap}>
                        <Pulse color={c.primary} size={32} active={isNext} />
                        <View style={[styles.dot, { backgroundColor: step.done ? c.success : isNext ? c.primary : c.muted, borderColor: step.done ? c.success : isNext ? c.primary : c.border }]}>
                          {step.done ? <Check size={16} color={c.primaryForeground} strokeWidth={3} /> : <Text size={14} weight="semibold" color={isNext ? c.primaryForeground : c.mutedForeground}>{i + 1}</Text>}
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text size={16} weight="semibold" color={isNext ? c.primaryInk : undefined}>{step.title}</Text>
                        <Text size={13} tone="mutedForeground">{step.text}</Text>
                      </View>
                    </Tap>
                  </View>
                )
              })}
            </Card>
          </Animated.View>

          {next && (
            <Animated.View entering={enter(3)}>
              <Button size="lg" full iconRight={ArrowRight} onPress={() => router.push(next.href)}>{next.cta}</Button>
            </Animated.View>
          )}
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12, minHeight: 64 },
  dotWrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
})
