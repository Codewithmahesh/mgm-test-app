import { router, useLocalSearchParams } from 'expo-router'
import { ArrowRight, Lock, Route, Target } from 'lucide-react-native'
import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { NavyBanner } from '@/components/brand'
import { Confetti, enter, Meter, Tap, TimelineEnd, TimelineItem, useShake } from '@/components/jems'
import { Alert, Badge, Button, Card, EmptyState, Eyebrow, PageLoader, Row, Screen, ScreenHeader, Text, useFeedback } from '@/components/ui'
import { getRoadmap, getStatus, PRIORITY_META, type Roadmap, type RoadmapModule } from '@/lib/jems'
import { useJemsData } from '@/lib/jems-store'
import { radius, useColors } from '@/theme'

export default function RoadmapTab() {
  const { fresh } = useLocalSearchParams<{ fresh?: string }>()
  const { data: roadmap, error, reload } = useJemsData(getRoadmap)
  const { data: status } = useJemsData(getStatus)

  // Just generated: celebrate once, then clear the flag.
  const burst = fresh === '1' && roadmap ? 1 : 0
  useEffect(() => {
    if (!burst) return
    const timer = setTimeout(() => router.setParams({ fresh: undefined }), 2500)
    return () => clearTimeout(timer)
  }, [burst])

  return (
    <View style={{ flex: 1 }}>
      <Screen onRefresh={reload}
        header={<ScreenHeader title="Roadmap" back={false} right={roadmap ? <Text size={14} tone="mutedForeground" style={{ paddingRight: 8 }}>{`${roadmap.roleShort} · ${roadmap.weeks} weeks`}</Text> : undefined} />}>
        {error ? <Alert>{error}</Alert> : roadmap === undefined ? <PageLoader /> : roadmap === null ? (
          <Card>
            <EmptyState icon={Route} title="No roadmap yet" description="Once you've taken the assessment, we turn your skill gaps into a week-by-week plan."
              action={<Button iconRight={ArrowRight} onPress={() => router.push(status?.assessed ? '/student/jems/gaps' : status?.onboarded ? '/student/jems/assessment' : '/student/jems/onboarding/profile')}>
                {status?.assessed ? 'See my skill gaps' : 'Get started'}
              </Button>} />
          </Card>
        ) : <Plan roadmap={roadmap} />}
      </Screen>
      <Confetti run={burst} />
    </View>
  )
}

function Plan({ roadmap }: { roadmap: Roadmap }) {
  const c = useColors()
  const modules = roadmap.modules
  const currentIndex = Math.max(0, modules.findIndex(m => m.status === 'in_progress'))
  const current = modules[currentIndex]
  const doneCount = modules.filter(m => m.status === 'done').length
  const lessonShare = current && current.status === 'in_progress' ? current.lessons.filter(l => l.done).length / current.lessons.length : 0
  const overall = ((doneCount + lessonShare) / modules.length) * 100

  return (
    <>
      <Animated.View entering={enter(0)}>
        <NavyBanner emblem={false}>
          <Eyebrow tone="brand">Your plan</Eyebrow>
          <Text serif size={28} leading={34} tracking={-0.4} color={c.primaryForeground} style={{ marginTop: 10 }}>
            {`${roadmap.weeks} weeks to close ${roadmap.gapCount} priority gaps`}
          </Text>
          <Row gap={14} style={{ marginTop: 18 }}>
            <Meter value={overall} color={c.brand} track="rgba(255,255,255,0.14)" delay={300} style={{ flex: 1 }} label="Roadmap progress" />
            <Text size={14} color="rgba(255,255,255,0.7)">{doneCount === modules.length ? 'All done' : `Module ${currentIndex + 1} of ${modules.length}`}</Text>
          </Row>
        </NavyBanner>
      </Animated.View>

      <View>
        {modules.map((m, i) => (
          <TimelineItem key={m.id} index={m.index} order={i + 1} state={m.status === 'in_progress' ? 'current' : m.status === 'done' ? 'done' : 'locked'}>
            <ModuleCard module={m} previous={modules[i - 1]} />
          </TimelineItem>
        ))}
        <TimelineEnd icon={Target} order={modules.length + 1}>
          <View style={[styles.reassess, { backgroundColor: c.violetSoft, borderColor: c.violetBorder }]}>
            <Text size={15} leading={22} color={c.violet}>
              <Text size={15} weight="semibold" color={c.violet}>{`Reassess at week ${roadmap.reassessWeek}.`}</Text> See how far your score moved.
            </Text>
          </View>
        </TimelineEnd>
      </View>
    </>
  )
}

function ModuleCard({ module: m, previous }: { module: RoadmapModule; previous?: RoadmapModule }) {
  const c = useColors()
  const { toast } = useFeedback()
  const { style: shakeStyle, shake } = useShake()
  const open = () => router.push(`/student/jems/module/${m.id}`)
  const lessonsDone = m.lessons.filter(l => l.done).length
  const locked = m.status === 'locked'
  const current = m.status === 'in_progress'
  const lastFail = current ? m.mini.lastFail ?? null : null

  const gapBadges = (
    <Row gap={8} wrap>
      {m.gaps.map(g => <Badge key={g.label} tone={PRIORITY_META[g.priority].tone}>{`Gap: ${g.label}`}</Badge>)}
      {current && <Badge>{`About ${m.hours} hrs`}</Badge>}
    </Row>
  )

  return (
    <Animated.View style={shakeStyle}>
      <Tap haptic={locked ? false : 'selection'} scaleTo={0.98}
        onPress={() => {
          if (!locked) return open()
          shake()
          toast(previous ? `Finish Module ${previous.index}: ${previous.title} to unlock this one.` : 'This module is locked.', 'info')
        }}
        accessibilityRole="button" accessibilityLabel={`Module ${m.index}, ${m.title}, ${m.weeks}${locked ? ', locked' : current ? ', in progress' : ', done'}`}>
        <Card style={current ? { borderColor: c.primary } : m.status === 'done' ? { borderColor: c.successBorder } : undefined}>
          <View style={{ padding: 16, gap: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text mono size={14} color={current ? c.primaryInk : c.mutedForeground}>{m.weeks}</Text>
              {current ? <Badge tone="blue">In progress</Badge> : m.status === 'done' ? <Badge tone="green">Done</Badge> : <Lock size={18} color={c.mutedForeground} />}
            </Row>
            <Text size={18} weight="semibold">{m.title}</Text>
            {gapBadges}
            {current && (
              <>
                <Row gap={12} style={{ marginTop: 4 }}>
                  <Meter value={(lessonsDone / m.lessons.length) * 100} delay={500} style={{ flex: 1 }} label="Lessons done" />
                  <Text size={14} tone="mutedForeground">{`${lessonsDone} of ${m.lessons.length} lessons`}</Text>
                </Row>
                {lastFail && lastFail.relearn.length > 0 && (
                  <View style={[styles.relearn, { backgroundColor: c.warningSoft, borderColor: c.warningBorder }]}>
                    <Text size={14} weight="semibold" tone="warningInk">{`Mini-assessment: ${lastFail.percent}% · ${lastFail.relearn.length} topic${lastFail.relearn.length === 1 ? '' : 's'} to relearn`}</Text>
                    <Text size={14} leading={20} tone="warningInk">{lastFail.relearn.slice(0, 3).map(t => t.topic).join(', ') + (lastFail.relearn.length > 3 ? '…' : '')}</Text>
                  </View>
                )}
                <Button size="lg" full iconRight={ArrowRight} onPress={open} style={{ marginTop: 4 }}>{lastFail ? 'Relearn and retake' : 'Continue'}</Button>
              </>
            )}
          </View>
        </Card>
      </Tap>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  reassess: { borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 14 },
  relearn: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
})
