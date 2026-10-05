import { router } from 'expo-router'
import { ArrowRight, ChevronDown, CircleCheck, CircleX, Route, TriangleAlert, type LucideIcon } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, { FadeIn, LinearTransition, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { buzz, enter, FlowScreen, Meter, SPRING, StickyFooter, useCountUp, WorkingOverlay } from '@/components/jems'
import { Alert, Badge, Button, Card, Divider, PageLoader, Row, ScreenHeader, Text, useFeedback } from '@/components/ui'
import { generateRoadmap, getGapAnalysis, getStatus, PRIORITY_META, type Gap } from '@/lib/jems'
import { useJemsData } from '@/lib/jems-store'
import { toneColors, useColors, type Tone } from '@/theme'

export default function GapsScreen() {
  const { toast } = useFeedback()
  const { data: gaps, error, reload } = useJemsData(getGapAnalysis)
  const { data: status } = useJemsData(getStatus)
  const [working, setWorking] = useState(false)
  const match = useCountUp(gaps?.match ?? 0, 1100, 250)

  const cta = status?.roadmapReady
    ? <Button size="lg" full iconRight={ArrowRight} onPress={() => router.dismissTo('/student/jems/roadmap')}>Open my roadmap</Button>
    : <Button size="lg" full icon={Route} disabled={!gaps} onPress={() => setWorking(true)}>Generate my roadmap</Button>

  return (
    <FlowScreen header={<ScreenHeader title="Skill gaps" />} onRefresh={reload}
      footer={<StickyFooter caption="We'll order the gaps by priority and build a plan around them.">{cta}</StickyFooter>}>
      {error ? <Alert>{error}</Alert> : !gaps ? <PageLoader /> : (
        <>
          <Animated.View entering={enter(0)}>
            <Card padded>
              <Row style={{ alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text size={12} weight="semibold" tone="mutedForeground" uppercase tracking={1.4}>Target role</Text>
                  <Text size={18} weight="semibold" style={{ marginTop: 4 }}>{gaps.roleLabel}</Text>
                  <Text size={14} tone="mutedForeground" style={{ marginTop: 2 }}>Compared with MSME job requirements</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text serif size={40} leading={44} tone="primary" tabular>{match}<Text serif size={20} tone="primary">%</Text></Text>
                  <Text size={14} tone="mutedForeground">match</Text>
                </View>
              </Row>
              <Meter value={gaps.match} delay={250} height={7} style={{ marginTop: 16 }} label={`${gaps.match} percent match`} />
            </Card>
          </Animated.View>

          <Animated.View entering={enter(1)}>
            <GapGroup title="Missing" icon={CircleX} tone="red" count={gaps.missing.length}>
              {gaps.missing.map((gap, i) => <GapRow key={gap.id} gap={gap} first={i === 0} />)}
            </GapGroup>
          </Animated.View>
          <Animated.View entering={enter(2)}>
            <GapGroup title="Weak" icon={TriangleAlert} tone="amber" count={gaps.weak.length}>
              {gaps.weak.map((gap, i) => <GapRow key={gap.id} gap={gap} first={i === 0} />)}
            </GapGroup>
          </Animated.View>
          <Animated.View entering={enter(3)}>
            <GapGroup title="Matched" icon={CircleCheck} tone="green" count={gaps.matched.length}>
              {gaps.matched.map((m, i) => (
                <View key={m.skill}>
                  {i > 0 && <Divider />}
                  <Row style={styles.row}>
                    <Text size={16} style={{ flex: 1 }}>{m.skill}</Text>
                    <Text size={14} tone="mutedForeground">{m.level}</Text>
                  </Row>
                </View>
              ))}
            </GapGroup>
          </Animated.View>
        </>
      )}

      {working && (
        <WorkingOverlay eyebrow="Your roadmap" title="Building a plan around your gaps"
          steps={['Ranking gaps by priority', 'Picking lessons and resources', 'Scheduling your 8-week plan']}
          task={generateRoadmap}
          onDone={() => { setWorking(false); router.dismissTo('/student/jems/roadmap?fresh=1') }}
          onError={message => { setWorking(false); toast(message, 'error') }} />
      )}
    </FlowScreen>
  )
}

/** A tinted, collapsible group of gaps. */
function GapGroup({ title, icon: Icon, tone, count, children }: { title: string; icon: LucideIcon; tone: Tone; count: number; children: React.ReactNode }) {
  const c = useColors()
  const t = toneColors(c, tone)
  const [open, setOpen] = useState(true)
  const turn = useSharedValue(0)
  useEffect(() => { turn.set(withSpring(open ? 0 : -90, SPRING)) }, [open, turn])
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get()}deg` }] }))
  return (
    <Card tone={tone}>
      <Pressable onPress={() => { buzz('light'); setOpen(v => !v) }} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${title}, ${count} skills`}
        style={[styles.groupHead, { backgroundColor: t.bg, borderBottomColor: open ? t.border : 'transparent' }]}>
        <Icon size={20} color={t.fg} />
        <Text size={17} weight="semibold" color={t.fg} style={{ flex: 1 }}>{title}</Text>
        <Text size={14} weight="semibold" color={t.fg}>{`${count} skills`}</Text>
        <Animated.View style={chevron}><ChevronDown size={18} color={t.fg} /></Animated.View>
      </Pressable>
      {open && <Animated.View entering={FadeIn.duration(220)} layout={LinearTransition}>{children}</Animated.View>}
    </Card>
  )
}

function GapRow({ gap, first }: { gap: Gap; first: boolean }) {
  const priority = PRIORITY_META[gap.priority]
  return (
    <View>
      {!first && <Divider />}
      <Row style={styles.row} gap={10}>
        <View style={{ flex: 1 }}>
          <Text size={16} weight="semibold">{gap.skill}</Text>
          <Text size={14} tone="mutedForeground" style={{ marginTop: 2 }}>{`Needs ${gap.needs} · You: ${gap.you}`}</Text>
        </View>
        <Badge tone={priority.tone}>{priority.label}</Badge>
      </Row>
    </View>
  )
}

const styles = StyleSheet.create({
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, minHeight: 52, borderBottomWidth: 1 },
  row: { paddingHorizontal: 16, paddingVertical: 13, minHeight: 52 },
})
