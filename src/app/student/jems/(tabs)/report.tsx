import { router, useLocalSearchParams } from 'expo-router'
import { ArrowRight, ChartColumn } from 'lucide-react-native'
import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { NavyBanner } from '@/components/brand'
import { Confetti, enter, Meter, ScoreRing, useCountUp } from '@/components/jems'
import { Alert, Badge, Button, Card, CardHeader, Divider, EmptyState, Eyebrow, PageLoader, Row, Screen, ScreenHeader, StatCard, Text } from '@/components/ui'
import { getReport, getStatus, levelLabel, STRENGTH_TONE, VERDICT_META, type SkillReport } from '@/lib/jems'
import { useJemsData } from '@/lib/jems-store'
import { useColors, type Tone } from '@/theme'

const DIFFICULTY_TONE: Record<string, Tone> = { Easy: 'green', Medium: 'amber', Hard: 'red' }

export default function ReportTab() {
  const { celebrate } = useLocalSearchParams<{ celebrate?: string }>()
  const { data: report, error, reload } = useJemsData(getReport)
  const { data: status } = useJemsData(getStatus)

  // Fresh from the assessment: one confetti burst, then drop the flag so it doesn't replay.
  const burst = celebrate === '1' && report ? 1 : 0
  useEffect(() => {
    if (!burst) return
    const timer = setTimeout(() => router.setParams({ celebrate: undefined }), 2500)
    return () => clearTimeout(timer)
  }, [burst])

  return (
    <View style={{ flex: 1 }}>
      <Screen header={<ScreenHeader title="Skill report" back={false} right={report ? <Text size={14} tone="mutedForeground" style={{ paddingRight: 8 }}>{report.updatedLabel}</Text> : undefined} />} onRefresh={reload}>
        {error ? <Alert>{error}</Alert> : report === undefined ? <PageLoader /> : report === null ? (
          <Card>
            <EmptyState icon={ChartColumn} title="No report yet" description="Take the skill assessment and your verified skill report shows up here."
              action={<Button iconRight={ArrowRight} onPress={() => router.push(status?.onboarded ? '/student/jems/assessment' : '/student/jems/onboarding/profile')}>
                {status?.onboarded ? 'Take the assessment' : 'Get started'}
              </Button>} />
          </Card>
        ) : <ReportBody report={report} />}
      </Screen>
      <Confetti run={burst} />
    </View>
  )
}

function ReportBody({ report }: { report: SkillReport }) {
  const c = useColors()
  const assessment = useCountUp(report.scores.assessment, 900, 300)
  const projects = useCountUp(report.scores.projects, 900, 400)
  const dsa = useCountUp(report.scores.dsa, 900, 500)
  const solved = useCountUp(report.dsa.solved, 1100, 400)

  return (
    <>
      <Animated.View entering={enter(0)}>
        <NavyBanner emblem={false} glow="left">
          <Row gap={18}>
            <ScoreRing value={report.readiness} size={112} stroke={11} color={c.brand} track="rgba(255,255,255,0.12)" textColor={c.primaryForeground} label={`Overall readiness ${report.readiness} out of 100`} />
            <View style={{ flex: 1 }}>
              <Eyebrow tone="brand">Overall readiness</Eyebrow>
              <Text serif size={22} leading={27} color={c.primaryForeground} style={{ marginTop: 6 }}>{report.headline}</Text>
              <Text size={14} leading={20} color="rgba(255,255,255,0.65)" style={{ marginTop: 6 }}>{report.summary}</Text>
            </View>
          </Row>
        </NavyBanner>
      </Animated.View>

      <Animated.View entering={enter(1)} style={styles.tiles}>
        <StatCard label="Assessment" value={assessment} suffix="%" style={styles.tile} />
        <StatCard label="Projects" value={projects} suffix="%" style={styles.tile} />
        <StatCard label="DSA" value={dsa} suffix="%" style={styles.tile} />
      </Animated.View>

      <Animated.View entering={enter(2)}>
        <Card>
          <CardHeader flush title={<Text size={17} weight="semibold">Self-rated vs verified</Text>} description="What you said against what the assessment found" />
          {report.skills.map((skill, i) => {
            const verdict = VERDICT_META[skill.verdict]
            return (
              <Animated.View key={skill.name} entering={enter(i + 3)}>
                {i > 0 && <Divider />}
                <View style={styles.row} accessible accessibilityLabel={`${skill.name}: you said ${levelLabel(skill.selfRated)}, verified ${levelLabel(skill.verified)}. ${verdict.label}.`}>
                  <Text size={16} numberOfLines={1} style={{ flexShrink: 0, maxWidth: '38%' }}>{skill.name}</Text>
                  <Text size={13} tone="mutedForeground" numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>{`${levelLabel(skill.selfRated)} → ${levelLabel(skill.verified)}`}</Text>
                  <Badge tone={verdict.tone}>{verdict.label}</Badge>
                </View>
              </Animated.View>
            )
          })}
        </Card>
      </Animated.View>

      <Animated.View entering={enter(3)}>
        <Card>
          <CardHeader title={<Text size={17} weight="semibold">DSA</Text>} description="From your LeetCode profile"
            action={<Text size={28} weight="semibold" tabular tracking={-0.5}>{solved}<Text size={14} tone="mutedForeground"> solved</Text></Text>} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 14 }}>
            {report.dsa.byDifficulty.map((d, i) => (
              <Row key={d.label} gap={12}>
                <Text size={15} tone="mutedForeground" style={{ width: 70 }}>{d.label}</Text>
                <Meter value={(d.solved / d.target) * 100} tone={DIFFICULTY_TONE[d.label]} delay={350 + i * 150} style={{ flex: 1 }} label={`${d.label}: ${d.solved} solved`} />
                <Text size={15} weight="semibold" tabular style={{ width: 34, textAlign: 'right' }}>{d.solved}</Text>
              </Row>
            ))}
            <Row gap={8} wrap style={{ marginTop: 2 }}>
              {report.dsa.topics.map(topic => <Badge key={topic.name} tone={STRENGTH_TONE[topic.strength]}>{topic.name}</Badge>)}
            </Row>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={enter(4)}>
        <Card>
          <CardHeader flush title={<Text size={17} weight="semibold">Projects</Text>} description={`${report.projects.length} repos reviewed from GitHub`} />
          {report.projects.map((project, i) => (
            <View key={project.name}>
              {i > 0 && <Divider />}
              <View style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 10 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text mono size={16} weight="semibold" numberOfLines={1} style={{ flex: 1 }}>{project.name}</Text>
                  <Text size={14} tone="mutedForeground">{project.language}</Text>
                </Row>
                <Row gap={8} wrap>{project.tags.map(tag => <Badge key={tag.label} tone={tag.tone}>{tag.label}</Badge>)}</Row>
              </View>
            </View>
          ))}
        </Card>
      </Animated.View>

      <Animated.View entering={enter(5)}>
        <Button size="lg" full iconRight={ArrowRight} onPress={() => router.push('/student/jems/gaps')}>See my skill gaps</Button>
      </Animated.View>
    </>
  )
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13, minHeight: 52 },
})
