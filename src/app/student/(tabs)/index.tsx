import { router, useFocusEffect } from 'expo-router'
import { ArrowRight, Award, CheckCircle2, ChevronRight, ClipboardList, Clock3, KeyRound, PlayCircle, ShieldCheck, TrendingUp } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { AppHeader } from '@/components/app-shell'
import { BarChart } from '@/components/bar-chart'
import { NavyBanner } from '@/components/brand'
import { Alert, Badge, Button, Card, CardHeader, Divider, EmptyState, Eyebrow, PageLoader, Screen, StatCard, Text } from '@/components/ui'
import { api, cached, errorMessage, formatDate, relativeTime, type MyAttempt } from '@/lib/api'
import { useSession } from '@/lib/session'
import { fonts, radius, useColors } from '@/theme'

export default function StudentHome() {
  const { student } = useSession()
  const c = useColors()
  const [code, setCode] = useState('')
  const [attempts, setAttempts] = useState<MyAttempt[] | null>(() => cached<{ attempts: MyAttempt[] }>('/api/student/attempts')?.attempts ?? null)
  const [error, setError] = useState('')

  const load = useCallback(() => api<{ attempts: MyAttempt[] }>('/api/student/attempts').then(d => { setAttempts(d.attempts); setError('') }).catch(err => setError(errorMessage(err))), [])
  useFocusEffect(useCallback(() => { load() }, [load]))

  const stats = useMemo(() => {
    const list = attempts ?? []
    const done = list.filter(a => a.status === 'submitted')
    const scored = done.filter(a => a.resultVisible && a.maxScore)
    const percents = scored.map(a => Math.round(((a.score ?? 0) / (a.maxScore || 1)) * 100))
    return {
      ongoing: list.filter(a => a.status === 'in_progress'),
      done,
      average: percents.length ? Math.round(percents.reduce((s, p) => s + p, 0) / percents.length) : null,
      best: percents.length ? Math.max(...percents) : null,
      chart: scored.slice(0, 10).reverse().map(a => ({ label: a.room.title, value: Math.round(((a.score ?? 0) / (a.maxScore || 1)) * 100), detail: `${a.score} / ${a.maxScore}` })),
    }
  }, [attempts])

  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const first = student?.name?.split(' ')[0]
  const join = () => { if (clean.length >= 4) { setCode(''); router.push(`/student/room/${clean}`) } }
  const value = (v: string | number) => (attempts ? v : '…')

  return (
    <Screen edges={[]} header={<AppHeader title="Dashboard" />} onRefresh={load}>
      {/* Join */}
      <NavyBanner glow="left">
        <Text size={13} color="rgba(255,255,255,0.6)" numberOfLines={1}>{[student?.classLabel, student?.rollNumber && `Roll ${student.rollNumber}`].filter(Boolean).join(' · ') || 'Welcome'}</Text>
        <Text size={24} weight="medium" color="#ffffff" tracking={-0.4} style={{ marginTop: 2 }}>Hi{first ? `, ${first}` : ''}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20 }}>
          <KeyRound size={13} color={c.brand} />
          <Eyebrow tone="brand">Join an exam</Eyebrow>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <TextInput value={code} onChangeText={v => setCode(v.toUpperCase())} placeholder="Room code, e.g. K3B2FM" placeholderTextColor="rgba(255,255,255,0.4)" maxLength={12}
            autoCapitalize="characters" autoCorrect={false} returnKeyType="go" onSubmitEditing={join} accessibilityLabel="Room code"
            style={{ flex: 1, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.1)', color: '#ffffff', paddingHorizontal: 14, fontFamily: clean ? fonts.monoSemibold : fonts.regular, fontSize: clean ? 18 : 14, letterSpacing: clean ? 3 : 0 }} />
          <Button size="lg" iconRight={ArrowRight} disabled={clean.length < 4} onPress={join} style={{ height: 48 }}>Go</Button>
        </View>
        <Text size={12} color="rgba(255,255,255,0.5)" style={{ marginTop: 10 }}>Your faculty shares a six-character code when the exam opens.</Text>
      </NavyBanner>

      {stats.ongoing.map(a => (
        <Card key={a.id} tone="green">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: c.successSoft }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.success }} />
            <Text size={13} weight="semibold" tone="success">Exam in progress — your timer is running</Text>
          </View>
          <View style={{ padding: 16, gap: 12 }}>
            <View>
              <Text weight="semibold">{a.room.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}><Clock3 size={13} color={c.mutedForeground} /><Text size={13} tone="mutedForeground">Ends {relativeTime(a.endsAt)}</Text></View>
            </View>
            <Button variant="success" icon={PlayCircle} full onPress={() => router.push(`/student/exam/${a.id}`)}>Resume exam</Button>
          </View>
        </Card>
      ))}

      {/* 2 × 2 stats */}
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatCard label="Exams taken" value={value(stats.done.length)} icon={ClipboardList} tone="blue" />
          <StatCard label="Average" value={value(stats.average == null ? '—' : `${stats.average}%`)} icon={TrendingUp} tone="green" />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatCard label="Best score" value={value(stats.best == null ? '—' : `${stats.best}%`)} icon={Award} tone="amber" />
          <StatCard label="In progress" value={value(stats.ongoing.length)} icon={PlayCircle} tone="violet" />
        </View>
      </View>

      <Card>
        <CardHeader title="Your recent scores" description="Percentage in exams whose results are published" />
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          {attempts ? <BarChart data={stats.chart} empty="Your scores appear here once results are published." /> : <PageLoader />}
        </View>
      </Card>

      <Card>
        <CardHeader flush title="Recent exams" description="Your latest submissions" action={stats.done.length > 3 ? <Text size={13} weight="medium" tone="primary" onPress={() => router.navigate('/student/results')}>View all</Text> : undefined} />
        {error ? <Alert style={{ margin: 16 }}>{error}</Alert> : !attempts ? <PageLoader /> : stats.done.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No exams yet" description="When you finish an exam it shows up here with your result." />
        ) : stats.done.slice(0, 3).map((a, i) => {
          const percent = a.resultVisible && a.maxScore ? Math.round(((a.score ?? 0) / a.maxScore) * 100) : null
          return (
            <View key={a.id}>
              {i > 0 && <Divider />}
              <Pressable onPress={() => router.push(`/student/result/${a.id}`)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, backgroundColor: pressed ? c.muted : 'transparent' })}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text weight="medium" numberOfLines={1}>{a.room.title}</Text>
                  <Text size={12} tone="mutedForeground" numberOfLines={1}>{formatDate(a.submittedAt, true)}</Text>
                </View>
                {a.resultVisible ? (
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text weight="semibold" tabular>{a.score}<Text size={13} tone="mutedForeground"> / {a.maxScore}</Text></Text>
                    {percent != null && <Badge tone={percent >= 60 ? 'green' : percent >= 35 ? 'amber' : 'red'}>{`${percent}%`}</Badge>}
                  </View>
                ) : <Badge>Result pending</Badge>}
                <ChevronRight size={17} color={c.subtle} />
              </Pressable>
            </View>
          )
        })}
      </Card>

      <Card>
        <CardHeader title="Before you start" />
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
          {['Use a charged phone with a stable connection.', 'Stay in the app. Leaving it or switching apps is recorded.', 'Screenshots and screen recording are blocked during exams.', 'Answers save automatically; the exam submits itself when time runs out.'].map(tip => (
            <View key={tip} style={{ flexDirection: 'row', gap: 10 }}>
              <CheckCircle2 size={16} color={c.success} style={{ marginTop: 2 }} />
              <Text size={13} tone="mutedForeground" leading={19} style={{ flex: 1 }}>{tip}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, borderRadius: radius.md, backgroundColor: c.muted, paddingHorizontal: 12, paddingVertical: 10 }}>
            <ShieldCheck size={16} color={c.primary} />
            <Text size={12} tone="mutedForeground" style={{ flex: 1 }}>Exams are proctored and one device at a time.</Text>
          </View>
        </View>
      </Card>
    </Screen>
  )
}
