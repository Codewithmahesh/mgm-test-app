import { router } from 'expo-router'
import { CircleCheck, CirclePlay } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { NavyBanner } from '@/components/brand'
import { enter, FlowScreen, StickyFooter, useCountUp, useFloat } from '@/components/jems'
import { Alert, Button, Card, CardHeader, Eyebrow, PageLoader, Row, ScreenHeader, StatCard, Text } from '@/components/ui'
import { getAssessmentInfo } from '@/lib/jems'
import { useJems, useJemsData } from '@/lib/jems-store'
import { radius, useColors } from '@/theme'

export default function AssessmentIntro() {
  const c = useColors()
  const { draft, attempts } = useJems()
  const { data: info, error, reload } = useJemsData(getAssessmentInfo)
  const questions = useCountUp(info?.questionCount ?? 0)
  const minutes = useCountUp(info?.minutes ?? 0, 900, 120)
  const float = useFloat(3)
  const skills = Object.keys(draft.ratings).length || info?.skillCount || 0
  const resuming = Boolean(attempts.main)

  return (
    <FlowScreen
      header={<ScreenHeader title="Skill assessment" />}
      onRefresh={reload}
      footer={(
        <StickyFooter>
          <Animated.View style={float}>
            <Button size="lg" full icon={CirclePlay} disabled={!info} onPress={() => router.push('/student/jems/assessment/question')}>
              {resuming ? 'Resume assessment' : 'Start assessment'}
            </Button>
          </Animated.View>
        </StickyFooter>
      )}>
      <Animated.View entering={enter(0)}>
        <NavyBanner emblem={false} glow="left">
          <Eyebrow tone="brand">{`Based on your ${skills} skills`}</Eyebrow>
          <Text serif size={30} leading={36} tracking={-0.4} color={c.primaryForeground} style={{ marginTop: 10 }}>Let&apos;s check what you really know</Text>
          <Text size={14} leading={21} color="rgba(255,255,255,0.65)" style={{ marginTop: 10 }}>One sitting, no wrong turns. Your result feeds the skill report and your roadmap.</Text>
        </NavyBanner>
      </Animated.View>

      {error ? <Alert>{error}</Alert> : !info ? <PageLoader /> : (
        <>
          <Animated.View entering={enter(1)} style={styles.tiles}>
            <StatCard label="Questions" value={questions} style={styles.tile} />
            <StatCard label="Time" value={minutes} suffix=" min" style={styles.tile} />
            <StatCard label="Format" value="MCQ" hint={`+ ${info.codeCount} code`} style={styles.tile} />
          </Animated.View>

          <Animated.View entering={enter(2)}>
            <Card>
              <CardHeader title="What's covered" />
              <View style={styles.grid}>
                {info.coverage.map((item, i) => (
                  <Animated.View key={item.skill} entering={enter(i + 3)} style={[styles.cell, { backgroundColor: c.muted }]}>
                    <Text size={15} weight="medium" numberOfLines={1} style={{ flex: 1 }}>{item.skill}</Text>
                    <Text mono size={13} tone="mutedForeground">{`${item.count} Q`}</Text>
                  </Animated.View>
                ))}
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={enter(3)}>
            <Card>
              <CardHeader title="Before you start" />
              <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
                {info.rules.map(rule => (
                  <Row key={rule} gap={10} style={{ alignItems: 'flex-start' }}>
                    <CircleCheck size={17} color={c.success} style={{ marginTop: 2 }} />
                    <Text size={14} tone="mutedForeground" leading={20} style={{ flex: 1 }}>{rule}</Text>
                  </Row>
                ))}
              </View>
            </Card>
          </Animated.View>
        </>
      )}
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { minWidth: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingBottom: 16 },
  cell: { flexDirection: 'row', alignItems: 'center', gap: 8, flexBasis: '46%', flexGrow: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12 },
})
