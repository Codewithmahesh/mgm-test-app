import { AlertTriangle, Award, CheckCircle2, Clock3, Code2, Lightbulb, ListChecks, MinusCircle, Target, TrendingDown, TrendingUp, Trophy, Users, XCircle, type LucideIcon } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg'
import { STRONG_AT, WEAK_BELOW, type AreaStat, type FocusArea, type MissedQuestion, type ResultAnalysis } from '@/lib/analysis-types'
import { radius, useColors, type Palette } from '@/theme'
import { Badge, Card, CardHeader, IconTile, Text } from './ui'

const fmt = (value: number) => String(Math.round(value * 100) / 100)
const duration = (seconds: number | null) => (seconds == null ? '—' : seconds >= 3600 ? `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`)
const toneFor = (c: Palette, percent: number) => (percent >= STRONG_AT ? c.success : percent >= WEAK_BELOW ? c.warning : c.danger)

/** The student's score analysis, same sections as the website's result page. */
export function ResultAnalysisView({ analysis: a, score, maxScore }: { analysis: ResultAnalysis; score: number; maxScore: number }) {
  const c = useColors()
  return (
    <View style={{ gap: 16 }}>
      <Overview a={a} score={score} maxScore={maxScore} />

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Metric icon={Target} tone="blue" label="Accuracy" value={a.accuracy == null ? '—' : `${a.accuracy}%`} hint={a.attempted ? `${a.correct} of ${a.attempted} attempted` : 'No MCQs attempted'} />
          <Metric icon={Clock3} tone="amber" label="Time taken" value={duration(a.timeTakenSeconds)} hint={a.durationMinutes ? `of ${a.durationMinutes} min` : undefined} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Metric icon={CheckCircle2} tone="green" label="Right · Wrong · Skip"
            value={<Text size={20} weight="semibold" tabular><Text size={20} weight="semibold" tone="success">{a.correct}</Text> · <Text size={20} weight="semibold" tone="danger">{a.wrong}</Text> · <Text size={20} weight="semibold" tone="mutedForeground">{a.skipped}</Text></Text>}
            hint={a.negativeLost ? `−${fmt(a.negativeLost)} negative marks` : 'No negative marks'} />
          <Metric icon={Users} tone="violet" label="Class rank" value={a.classStats ? `${a.classStats.rank}/${a.classStats.of}` : '—'} hint={a.classStats ? `Top ${Math.max(1, 100 - a.classStats.percentile)}% of class` : 'After others submit'} />
        </View>
      </View>

      <Card>
        <CardHeader title="Score breakdown" description="Multiple choice and coding marks" />
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 16 }}>
          <Bar icon={ListChecks} label="Multiple choice" earned={a.mcq.earned} possible={a.mcq.possible} detail={`${a.mcq.questions} question${a.mcq.questions === 1 ? '' : 's'}`} />
          {a.coding.questions > 0 && <Bar icon={Code2} label="Coding" earned={a.coding.earned} possible={a.coding.possible} detail={`${a.coding.questions} problem${a.coding.questions === 1 ? '' : 's'}${a.coding.pending ? ` · ${a.coding.pending} being graded` : ''}`} />}
        </View>
      </Card>

      <Card>
        <CardHeader title="You and your class" description={a.classStats ? `${a.classStats.of} students submitted` : 'Appears once more students submit'} />
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
          <Compare label="You" percent={a.percent} color={c.primary} bold />
          {a.classStats ? <>
            <Compare label="Class average" percent={a.classStats.average} color={c.borderStrong} />
            <Compare label="Top score" percent={a.classStats.highest} color={c.borderStrong} />
          </> : <Text size={13} tone="mutedForeground">You&apos;re the first to have a result in this exam.</Text>}
        </View>
      </Card>

      <AreaCard title="By topic" description="Marks earned in each topic" areas={a.byTopic} empty="Questions in this exam have no topics." />
      <AreaCard title="By Bloom's level" description="From recall (L1) to creating (L6)" areas={a.byLevel} empty="Questions in this exam have no Bloom's levels." />

      <Highlights good title="Strong areas" icon={TrendingUp} areas={a.strong} empty={`Areas where you score ${STRONG_AT}% or more show up here.`} />
      <Highlights title="Areas to improve" icon={TrendingDown} areas={a.weak} empty={`Nothing below ${WEAK_BELOW}%. Well done.`} />

      {a.focus.length > 0 && <FocusAreas focus={a.focus} />}

      {a.tips.length > 0 && (
        <Card>
          <CardHeader title={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Lightbulb size={16} color={c.brand} /><Text weight="semibold" size={15}>What to work on</Text></View>} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
            {a.tips.map(tip => (
              <View key={tip} style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.primary, marginTop: 8 }} />
                <Text size={14} leading={21} style={{ flex: 1 }}>{tip}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}
    </View>
  )
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

function Overview({ a, score, maxScore }: { a: ResultAnalysis; score: number; maxScore: number }) {
  const c = useColors()
  const r = 50
  const circumference = 2 * Math.PI * r
  const [progress] = useState(() => new Animated.Value(0))
  useEffect(() => { Animated.timing(progress, { toValue: a.percent / 100, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start() }, [a.percent, progress])
  return (
    <View style={[styles.hero, { backgroundColor: c.navy }]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <Pattern id="result-grid" width={28} height={28} patternUnits="userSpaceOnUse">
            <Path d="M 28 0 L 0 0 0 28" fill="none" stroke="#ffffff" strokeOpacity={0.07} strokeWidth={1} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#result-grid)" />
      </Svg>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        <View style={{ width: 120, height: 120 }}>
          <Svg width={120} height={120} viewBox="0 0 120 120" style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={60} cy={60} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={10} />
            <AnimatedCircle cx={60} cy={60} r={r} fill="none" stroke={toneFor(c, a.percent)} strokeWidth={10} strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] })} />
          </Svg>
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Text size={26} weight="semibold" color="#ffffff" tabular>{a.percent}%</Text>
            <Text size={10} uppercase tracking={1} color="rgba(255,255,255,0.55)">score</Text>
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text mono size={11} uppercase tracking={1.8} color={c.brand}>Result analysis</Text>
          <Text size={26} weight="semibold" color="#ffffff" tabular style={{ marginTop: 4 }}>{fmt(score)}<Text size={15} color="rgba(255,255,255,0.55)"> / {fmt(maxScore)}</Text></Text>
          <View style={{ marginTop: 8 }}><Badge tone={a.band.tone} icon={Award}>{a.band.label}</Badge></View>
        </View>
      </View>
      {a.classStats && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 }}>
          <Trophy size={15} color={c.brand} />
          <Text size={13} color="rgba(255,255,255,0.75)">Rank {a.classStats.rank} of {a.classStats.of} · better than {a.classStats.percentile}% of the class</Text>
        </View>
      )}
      {(a.strong[0] || a.weak[0]) && (
        <Text size={13} color="rgba(255,255,255,0.7)" leading={19} style={{ marginTop: 8 }}>
          {a.strong[0] ? <>Strongest: <Text size={13} weight="semibold" color="#ffffff">{a.strong[0].label}</Text> ({a.strong[0].percent}%). </> : null}
          {a.weak[0] ? <>Needs work: <Text size={13} weight="semibold" color="#ffffff">{a.weak[0].label}</Text> ({a.weak[0].percent}%).</> : null}
        </Text>
      )}
    </View>
  )
}

function Metric({ icon, tone, label, value, hint }: { icon: LucideIcon; tone: 'blue' | 'green' | 'amber' | 'violet'; label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card padded style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
        <Text size={12} weight="medium" tone="mutedForeground" style={{ flex: 1 }} numberOfLines={2}>{label}</Text>
        <IconTile icon={icon} tone={tone} size={30} />
      </View>
      {typeof value === 'string' ? <Text size={20} weight="semibold" tabular style={{ marginTop: 4 }}>{value}</Text> : <View style={{ marginTop: 4 }}>{value}</View>}
      {hint ? <Text size={11} tone="mutedForeground" style={{ marginTop: 4 }} numberOfLines={2}>{hint}</Text> : null}
    </Card>
  )
}

function Track({ percent, color, height = 10, faded }: { percent: number; color: string; height?: number; faded?: boolean }) {
  const c = useColors()
  return (
    <View style={{ height, borderRadius: height, backgroundColor: c.muted, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(2, Math.min(100, percent))}%`, height, borderRadius: height, backgroundColor: color, opacity: faded ? 0.35 : 1 }} />
    </View>
  )
}

function Bar({ icon: Icon, label, earned, possible, detail }: { icon: LucideIcon; label: string; earned: number; possible: number; detail: string }) {
  const c = useColors()
  const percent = possible ? Math.max(0, Math.min(100, Math.round((earned / possible) * 100))) : 0
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon size={15} color={c.mutedForeground} />
        <Text size={14} weight="medium" style={{ flex: 1 }}>{label}</Text>
        <Text size={13} tabular><Text size={13} weight="semibold">{fmt(earned)}</Text><Text size={13} tone="mutedForeground"> / {fmt(possible)}</Text>  <Text size={13} weight="semibold" color={toneFor(c, percent)}>{percent}%</Text></Text>
      </View>
      <Track percent={percent} color={toneFor(c, percent)} />
      <Text size={12} tone="mutedForeground">{detail}</Text>
    </View>
  )
}

function Compare({ label, percent, color, bold }: { label: string; percent: number; color: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text size={13} weight={bold ? 'semibold' : 'regular'} tone={bold ? 'foreground' : 'mutedForeground'} style={{ width: 96 }}>{label}</Text>
      <View style={{ flex: 1 }}><Track percent={percent} color={color} /></View>
      <Text size={13} weight={bold ? 'semibold' : 'regular'} tabular style={{ width: 42, textAlign: 'right' }}>{percent}%</Text>
    </View>
  )
}

function AreaCard({ title, description, areas, empty }: { title: string; description: string; areas: AreaStat[]; empty: string }) {
  const c = useColors()
  const shown = areas.filter(x => x.questions > 0)
  return (
    <Card>
      <CardHeader title={title} description={description} />
      {shown.length === 0 ? <Text size={13} tone="mutedForeground" style={{ paddingHorizontal: 16, paddingBottom: 16 }}>{empty}</Text> : (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 14 }}>
          {shown.map(area => (
            <View key={area.key} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                <Text size={14} weight="medium" numberOfLines={1} style={{ flex: 1 }}>{area.label}</Text>
                <Text size={13} weight="semibold" tabular color={area.possible ? toneFor(c, area.percent) : c.violet}>{area.possible ? `${area.percent}%` : 'Grading'}</Text>
              </View>
              <Track percent={area.possible ? area.percent : 100} color={area.possible ? toneFor(c, area.percent) : c.violet} height={8} faded={!area.possible} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                <Text size={12} tone="mutedForeground" tabular>{fmt(area.earned)} / {fmt(area.possible)} marks</Text>
                <Stat icon={CheckCircle2} color={c.success} value={area.correct} />
                <Stat icon={XCircle} color={c.danger} value={area.wrong} />
                {area.skipped > 0 && <Stat icon={MinusCircle} color={c.mutedForeground} value={area.skipped} suffix=" skipped" />}
                {area.pending > 0 && <Text size={12} tone="violet">{area.pending} being graded</Text>}
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  )
}

function Stat({ icon: Icon, color, value, suffix = '' }: { icon: LucideIcon; color: string; value: number; suffix?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Icon size={12} color={color} />
      <Text size={12} tone="mutedForeground" tabular>{value}{suffix}</Text>
    </View>
  )
}

function Highlights({ good, title, icon: Icon, areas, empty }: { good?: boolean; title: string; icon: LucideIcon; areas: AreaStat[]; empty: string }) {
  const c = useColors()
  const t = good ? { bg: c.successSoft, ink: c.successInk, border: c.successBorder } : { bg: c.dangerSoft, ink: c.dangerInk, border: c.dangerBorder }
  return (
    <Card style={{ borderColor: t.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: t.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }}>
        <Icon size={16} color={t.ink} />
        <Text size={14} weight="semibold" color={t.ink}>{title}</Text>
      </View>
      {areas.length === 0 ? <Text size={13} tone="mutedForeground" style={{ padding: 16 }}>{empty}</Text> : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 }}>
          {areas.map(area => (
            <View key={area.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.full, borderWidth: 1, borderColor: t.border, backgroundColor: t.bg, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text size={13} weight="medium" color={t.ink}>{area.label}</Text>
              <Text size={12} tabular color={t.ink} style={{ opacity: 0.8 }}>{area.percent}%</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  )
}

/** Weak areas of this test, each with the exact questions the student missed there. */
function FocusAreas({ focus }: { focus: FocusArea[] }) {
  const c = useColors()
  return (
    <View style={{ gap: 12 }}>
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={18} color={c.danger} />
          <Text size={17} weight="semibold">What to improve from this test</Text>
        </View>
        <Text size={13} tone="mutedForeground" style={{ marginTop: 2 }}>Your weakest areas, with the questions you missed in each.</Text>
      </View>
      {focus.map(f => (
        <Card key={f.area.key} style={{ borderColor: c.dangerBorder }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, backgroundColor: c.dangerSoft, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.dangerBorder }}>
            <View style={{ flex: 1 }}>
              <Text size={15} weight="semibold" tone="dangerInk">You need to improve in {f.area.label}</Text>
              <Text size={13} tone="dangerInk" leading={19} style={{ marginTop: 4 }}>{f.advice}</Text>
            </View>
            <View style={{ borderRadius: radius.full, backgroundColor: c.danger, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text size={12} weight="semibold" color="#ffffff" tabular>{f.area.percent}%</Text>
            </View>
          </View>
          {f.missed.length === 0
            ? <Text size={13} tone="mutedForeground" style={{ padding: 14 }}>No individual questions to show for this area.</Text>
            : f.missed.map((m, i) => <Missed key={m.number} m={m} first={i === 0} />)}
        </Card>
      ))}
    </View>
  )
}

function Missed({ m, first }: { m: MissedQuestion; first: boolean }) {
  const c = useColors()
  const status = m.result === 'skipped' ? { label: 'Skipped', tone: 'neutral' as const } : m.result === 'partial' ? { label: 'Partly solved', tone: 'amber' as const } : { label: 'Wrong', tone: 'red' as const }
  return (
    <View style={{ padding: 14, gap: 8, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderTopColor: c.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text mono size={12} tone="subtle">Q{m.number}</Text>
        <Badge tone={status.tone}>{status.label}</Badge>
        {m.marksLost > 0 ? <Text size={12} weight="semibold" tone="danger" tabular>−{fmt(m.marksLost)}</Text> : null}
      </View>
      <Text size={14} leading={21}>{m.text}</Text>
      {m.type === 'coding' ? (
        <>
          <Text size={13} tone="mutedForeground">{m.marks ? `Marks: ${fmt(m.marks.earned)} / ${fmt(m.marks.possible)}` : 'Not attempted'}</Text>
          {m.feedback ? <View style={{ borderRadius: radius.md, backgroundColor: c.muted, padding: 10 }}><Text size={13}><Text size={13} weight="medium">Feedback: </Text>{m.feedback}</Text></View> : null}
        </>
      ) : (
        <View style={{ gap: 6 }}>
          <View style={{ borderRadius: radius.md, borderWidth: 1, padding: 10, borderColor: m.yourAnswer ? c.dangerBorder : c.border, backgroundColor: m.yourAnswer ? c.dangerSoft : 'transparent' }}>
            <Text size={10} weight="semibold" uppercase tracking={0.6} color={m.yourAnswer ? c.dangerInk : c.mutedForeground}>Your answer</Text>
            <Text size={13} color={m.yourAnswer ? c.dangerInk : c.mutedForeground}>{m.yourAnswer ?? 'Not answered'}</Text>
          </View>
          <View style={{ borderRadius: radius.md, borderWidth: 1, padding: 10, borderColor: c.successBorder, backgroundColor: c.successSoft }}>
            <Text size={10} weight="semibold" uppercase tracking={0.6} color={c.successInk}>Correct answer</Text>
            <Text size={13} color={c.successInk}>{m.correctAnswer ?? '—'}</Text>
          </View>
        </View>
      )}
      {m.explanation ? <Text size={12} tone="mutedForeground" leading={18}><Text size={12} weight="medium">Why: </Text>{m.explanation}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, overflow: 'hidden', padding: 18 },
})
