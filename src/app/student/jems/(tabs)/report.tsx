import { router, useLocalSearchParams } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { ArrowRight, ChartColumn, CodeXml, ExternalLink, RefreshCw } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { NavyBanner } from '@/components/brand'
import { Confetti, enter, Meter, ScoreRing, Tap, useCountUp } from '@/components/jems'
import { Alert, Badge, Button, Card, CardHeader, Divider, EmptyState, Eyebrow, IconButton, PageLoader, Row, Screen, ScreenHeader, StatCard, Text, useFeedback } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { getReport, getStatus, levelLabel, refreshSources, STRENGTH_TONE, VERDICT_META, type SkillReport } from '@/lib/jems'
import { useJemsData } from '@/lib/jems-store'
import { useColors, type Tone } from '@/theme'

const DIFFICULTY_TONE: Record<string, Tone> = { Easy: 'green', Medium: 'amber', Hard: 'red' }

export default function ReportTab() {
  const { celebrate } = useLocalSearchParams<{ celebrate?: string }>()
  const { data: report, error, reload } = useJemsData(getReport)
  const { data: status } = useJemsData(getStatus)
  const c = useColors()
  const { toast } = useFeedback()
  const [refreshing, setRefreshing] = useState(false)

  /** Fetches the GitHub and LeetCode profiles again now, whatever their age, and rebuilds the report. */
  const refreshProfiles = useCallback(async () => {
    setRefreshing(true)
    try {
      const { refreshed, failed } = await refreshSources({ force: true })
      await reload()
      if (failed.length) toast(`Couldn't update ${failed.join(' and ')}. Showing the last data.`, 'error')
      else if (refreshed) toast('Profiles updated.', 'success')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setRefreshing(false)
    }
  }, [reload, toast])

  // Fresh from the assessment: one confetti burst, then drop the flag so it doesn't replay.
  const burst = celebrate === '1' && report ? 1 : 0
  useEffect(() => {
    if (!burst) return
    const timer = setTimeout(() => router.setParams({ celebrate: undefined }), 2500)
    return () => clearTimeout(timer)
  }, [burst])

  return (
    <View style={{ flex: 1 }}>
      <Screen header={<ScreenHeader title="Skill report" back={false} right={report ? (
        <Row gap={2}>
          <Text size={13} tone="mutedForeground">{refreshing ? 'Updating…' : report.updatedLabel}</Text>
          {refreshing
            ? <View style={styles.refresh}><ActivityIndicator size="small" color={c.primary} /></View>
            : <IconButton icon={RefreshCw} label="Update GitHub and LeetCode data" size={44} onPress={refreshProfiles} />}
        </Row>
      ) : undefined} />} onRefresh={report ? refreshProfiles : reload}>
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
  const { toast } = useFeedback()
  const assessment = useCountUp(report.scores.assessment, 900, 300)
  const projects = useCountUp(report.scores.projects, 900, 400)
  const dsa = useCountUp(report.scores.dsa ?? 0, 900, 500)
  const solved = useCountUp(report.dsa?.solved ?? 0, 1100, 400)
  const open = (url: string) => { WebBrowser.openBrowserAsync(url, { toolbarColor: c.card, controlsColor: c.primary }).catch(() => toast("Couldn't open the link.", 'error')) }

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
        <StatCard label="DSA" value={report.scores.dsa === null ? '–' : dsa} suffix={report.scores.dsa === null ? undefined : '%'} style={styles.tile} />
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
        {report.dsa ? <Card>
          <CardHeader title={<Text size={17} weight="semibold">DSA</Text>} description={`From LeetCode · ${report.dsa.username}`}
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
        </Card> : (
          <Card>
            <EmptyState icon={CodeXml} title="DSA not checked" description="Add your LeetCode profile in onboarding and your problem-solving gets scored too."
              action={<Button variant="outline" onPress={() => router.push('/student/jems/onboarding/connect')}>Connect LeetCode</Button>} />
          </Card>
        )}
      </Animated.View>

      <Animated.View entering={enter(4)}>
        <Card>
          <CardHeader flush title={<Text size={17} weight="semibold">Projects</Text>} description={`${report.projects.length} repos reviewed from GitHub`} />
          {report.projects.map((project, i) => (
            <View key={project.name}>
              {i > 0 && <Divider />}
              <Tap scaleTo={0.985} onPress={() => open(project.url)} accessibilityRole="link" accessibilityLabel={`${project.name} on GitHub`}
                style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 10 }}>
                <Row gap={8} style={{ justifyContent: 'space-between' }}>
                  <Text mono size={16} weight="semibold" numberOfLines={1} style={{ flex: 1 }}>{project.name}</Text>
                  {project.language ? <Text size={14} tone="mutedForeground">{project.language}</Text> : null}
                  <ExternalLink size={16} color={c.subtle} />
                </Row>
                <Row gap={8} wrap>{project.tags.map(tag => <Badge key={tag.label} tone={tag.tone}>{tag.label}</Badge>)}</Row>
              </Tap>
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
  refresh: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
})
