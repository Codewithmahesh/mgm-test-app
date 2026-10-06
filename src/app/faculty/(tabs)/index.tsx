import { router, useFocusEffect } from 'expo-router'
import { AlertTriangle, ArrowRight, BookOpen, ClipboardCheck, DoorOpen, Plus, Radio, ShieldAlert, Users, type LucideIcon } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, Pressable, View } from 'react-native'
import { AppHeader } from '@/components/app-shell'
import { BarChart } from '@/components/bar-chart'
import { NavyBanner } from '@/components/brand'
import { RoomRow } from '@/components/room-row'
import { Alert, Button, Card, CardHeader, Divider, EmptyState, IconTile, PageLoader, Progress, Screen, StatCard, Text } from '@/components/ui'
import { api, cached, errorMessage, relativeTime, type Room } from '@/lib/api'
import { notify } from '@/lib/notify'
import { useSession } from '@/lib/session'
import { radius, useColors, type Tone } from '@/theme'

type Dashboard = {
  stats: { questionTotal: number; questionsThisWeek: number; openRooms: number; studentsTakingNow: number; studentsTotal: number; studentsActive: number; pendingReview: number; totalRooms: number; completionPercent: number | null; studentsThisMonth: number }
  rooms: Room[]
  activity: { kind: 'ai' | 'import' | 'manual' | 'attempt'; title: string; detail: string; at: string }[]
}

const firstName = (name: string) => name.replace(/^(prof|dr|mr|mrs|ms|miss)\.?\s+/i, '').split(' ')[0]
const greeting = () => { const hour = new Date().getHours(); return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening' }

export default function FacultyDashboard() {
  const { teacher } = useSession()
  const c = useColors()
  const [data, setData] = useState<Dashboard | null>(() => cached<Dashboard>('/api/dashboard') ?? null)
  const [error, setError] = useState('')
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const load = useCallback(() => api<Dashboard>('/api/dashboard').then(d => { setData(d); setError('') }).catch(err => setError(errorMessage(err))), [])
  // Live while this tab is on screen, like the website's 10-second refresh.
  useFocusEffect(useCallback(() => {
    load()
    timer.current = setInterval(() => { if (AppState.currentState === 'active') load() }, 30_000)
    return () => clearInterval(timer.current)
  }, [load]))

  // A notification when more students start waiting to be admitted.
  const waitingBefore = useRef<number | null>(null)
  useEffect(() => {
    if (!data) return
    const rooms = data.rooms.filter(r => (r.waiting ?? 0) > 0)
    const total = rooms.reduce((sum, r) => sum + r.waiting, 0)
    if (waitingBefore.current !== null && total > waitingBefore.current) {
      void notify(`${total} student${total === 1 ? ' is' : 's are'} waiting to join`, rooms.length === 1 ? `${rooms[0].title}: admit them from the waiting room.` : `Across ${rooms.length} rooms: admit them from the waiting room.`)
    }
    waitingBefore.current = total
  }, [data])

  const derived = useMemo(() => {
    if (!data) return null
    const rooms = data.rooms
    const live = rooms.filter(r => r.status === 'open')
    const flagged = rooms.reduce((sum, r) => sum + (r.flagged ?? 0), 0)
    const notReady = rooms.filter(r => r.status !== 'closed' && (r.mcqPoolSize < r.questionsPerStudent || r.tfPoolSize < r.tfQuestions || r.codingPoolSize < r.codingQuestions || r.poolSize === 0))
    const drafts = rooms.filter(r => r.status === 'draft')
    const chart = rooms.filter(r => r.averagePercent != null && r.submitted > 0).slice(0, 10).reverse().map(r => ({ label: r.title, value: r.averagePercent ?? 0, detail: `${r.submitted} submitted` }))
    const overallAvg = chart.length ? Math.round(chart.reduce((s, d) => s + d.value, 0) / chart.length) : null
    return { live, flagged, notReady, drafts, chart, overallAvg }
  }, [data])

  const header = <AppHeader title="Dashboard" />
  if (error && !data) return <Screen edges={[]} header={header} onRefresh={load}><Alert>{error}</Alert></Screen>
  if (!data || !derived) return <Screen edges={[]} header={header}><PageLoader /></Screen>
  const { stats, rooms, activity } = data
  const writing = stats.studentsTakingNow

  const waitingRooms = rooms.filter(r => (r.waiting ?? 0) > 0)
  const waitingTotal = waitingRooms.reduce((sum, r) => sum + r.waiting, 0)
  const attention = [
    waitingTotal > 0 && { key: 'waiting', icon: Users, tone: 'red', title: `${waitingTotal} student${waitingTotal === 1 ? '' : 's'} waiting to join`, text: waitingRooms.length === 1 ? `In ${waitingRooms[0].title}. Admit them from the waiting room.` : `Across ${waitingRooms.length} rooms. Admit them from the waiting room.`, href: `/faculty/room/${waitingRooms[0]?.id}?tab=participants` },
    stats.pendingReview > 0 && { key: 'grading', icon: ClipboardCheck, tone: 'violet', title: `${stats.pendingReview} paper${stats.pendingReview === 1 ? '' : 's'} to grade`, text: 'Coding answers are waiting for marks.', href: `/faculty/room/${rooms.find(r => r.pendingReview > 0)?.id}?tab=leaderboard` },
    derived.flagged > 0 && { key: 'flagged', icon: ShieldAlert, tone: 'red', title: `${derived.flagged} student${derived.flagged === 1 ? '' : 's'} flagged`, text: 'Possible cheating: tab switches, pasting, second device…', href: `/faculty/room/${rooms.find(r => r.flagged > 0)?.id}?tab=participants` },
    ...derived.notReady.slice(0, 3).map(r => ({ key: `not-ready-${r.id}`, icon: AlertTriangle, tone: 'amber', title: `${r.title} isn't ready`, text: `Pool has ${r.mcqPoolSize}/${r.questionsPerStudent} MCQs${r.tfQuestions ? `, ${r.tfPoolSize}/${r.tfQuestions} True/False` : ''}${r.codingQuestions ? `, ${r.codingPoolSize}/${r.codingQuestions} coding` : ''}.`, href: `/faculty/room/${r.id}?tab=questions` })),
    derived.drafts.length > 0 && { key: 'drafts', icon: DoorOpen, tone: 'blue', title: `${derived.drafts.length} draft room${derived.drafts.length === 1 ? '' : 's'}`, text: 'Open a room when you are ready for students to join.', href: '/faculty/exams' },
  ].filter(Boolean) as { key: string; icon: LucideIcon; tone: Tone; title: string; text: string; href: string }[]

  return (
    <Screen edges={[]} header={header} onRefresh={load}>
      <NavyBanner>
        <Text size={13} color="rgba(255,255,255,0.6)">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        <Text size={25} weight="medium" color="#ffffff" tracking={-0.4} style={{ marginTop: 2 }}>{greeting()}{teacher ? `, ${firstName(teacher.name)}` : ''}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
          {derived.live.length > 0 && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80' }} />}
          <Text size={14} color="rgba(255,255,255,0.7)">{derived.live.length > 0 ? `${derived.live.length} room${derived.live.length === 1 ? '' : 's'} live · ${writing} writing` : 'No exams running right now.'}{stats.pendingReview > 0 ? `  ·  ${stats.pendingReview} to grade` : ''}</Text>
        </View>
      </NavyBanner>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Tap onPress={() => router.navigate('/faculty/exams')}><StatCard label="Live exam rooms" value={stats.openRooms} icon={Radio} tone="green" hint={writing ? `${writing} writing now` : `${stats.totalRooms} rooms in total`} /></Tap>
        <Tap onPress={() => router.navigate('/faculty/students')}>
          <StatCard label="Students activated" value={stats.studentsActive} suffix={` / ${stats.studentsTotal}`} icon={Users} tone="blue"
            hint={<><Progress value={stats.studentsTotal ? (stats.studentsActive / stats.studentsTotal) * 100 : 0} tone="green" style={{ marginTop: 8 }} /><Text size={12} tone="mutedForeground" style={{ marginTop: 6 }}>{stats.studentsTotal ? `${Math.round((stats.studentsActive / stats.studentsTotal) * 100)}% of the list` : 'Add students to begin'}</Text></>} />
        </Tap>
        <Tap onPress={() => router.navigate('/faculty/questions')}><StatCard label="Question bank" value={stats.questionTotal} icon={BookOpen} tone="violet" hint={stats.questionsThisWeek ? `+${stats.questionsThisWeek} this week` : 'Across all rooms'} /></Tap>
        <Tap onPress={() => router.navigate('/faculty/exams')}><StatCard label="Average score" value={derived.overallAvg ?? '—'} suffix={derived.overallAvg != null ? '%' : ''} icon={ClipboardCheck} tone="amber" hint={`Across ${derived.chart.length} exam${derived.chart.length === 1 ? '' : 's'}`} /></Tap>
      </View>

      <Card>
        <CardHeader flush title="Needs attention" description={attention.length ? `${attention.length} item${attention.length === 1 ? '' : 's'}` : 'All caught up'} />
        {attention.length === 0 ? (
          <View style={{ alignItems: 'center', paddingHorizontal: 16, paddingVertical: 24 }}>
            <IconTile icon={ClipboardCheck} tone="green" size={44} />
            <Text size={14} weight="medium" style={{ marginTop: 10 }}>Nothing needs you right now</Text>
            <Text size={12} tone="mutedForeground" style={{ marginTop: 2 }}>Grading, flags and unready rooms show up here.</Text>
          </View>
        ) : (
          <View style={{ padding: 6 }}>
            {attention.map(item => (
              <Pressable key={item.key} onPress={() => router.push(item.href as never)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 10, borderRadius: radius.lg, backgroundColor: pressed ? c.muted : 'transparent' })}>
                <IconTile icon={item.icon} tone={item.tone} />
                <View style={{ flex: 1 }}>
                  <Text size={14} weight="medium">{item.title}</Text>
                  <Text size={12} tone="mutedForeground" leading={17}>{item.text}</Text>
                </View>
                <ArrowRight size={16} color={c.subtle} style={{ marginTop: 10 }} />
              </Pressable>
            ))}
          </View>
        )}
      </Card>

      <Card>
        <CardHeader title="Exam performance" description="Average score of students who submitted, per exam room" />
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}><BarChart data={derived.chart} empty="Scores appear here after students submit their first exam." /></View>
      </Card>

      <Card>
        <CardHeader flush title="Exam rooms" description="Most recent first" action={<Text size={13} weight="medium" tone="primary" onPress={() => router.navigate('/faculty/exams')}>View all</Text>} />
        {rooms.length === 0 ? (
          <EmptyState icon={DoorOpen} title="No exam rooms yet" description="Create a room, add questions from a CSV, a PDF or AI, then share the code with your students." action={<Button icon={Plus} onPress={() => router.push('/faculty/room/new')}>Create your first room</Button>} />
        ) : rooms.slice(0, 5).map((room, i) => <View key={room.id}>{i > 0 && <Divider />}<RoomRow room={room} /></View>)}
      </Card>


      <Card>
        <CardHeader title="Recent activity" />
        {activity.length === 0 ? <Text size={14} tone="mutedForeground" center style={{ paddingVertical: 24 }}>Nothing yet.</Text> : (
          <View style={{ marginHorizontal: 20, marginBottom: 16, borderLeftWidth: 1, borderLeftColor: c.border }}>
            {activity.map((item, index) => (
              <View key={index} style={{ paddingLeft: 16, paddingBottom: index === activity.length - 1 ? 0 : 14 }}>
                <View style={{ position: 'absolute', left: -5, top: 6, width: 9, height: 9, borderRadius: 5, backgroundColor: item.kind === 'attempt' ? c.success : item.kind === 'ai' ? c.violet : c.primary, borderWidth: 2, borderColor: c.card }} />
                <Text size={13} weight="medium" leading={19}>{item.title}</Text>
                <Text size={12} tone="mutedForeground" numberOfLines={1}>{item.detail} · {relativeTime(item.at)}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </Screen>
  )
}

function Tap({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => ({ flexGrow: 1, flexBasis: '45%', opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>{children}</Pressable>
}
