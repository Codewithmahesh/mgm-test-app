import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { CirclePause, Clock3, Play, RotateCcw, Square } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { CopyCode, RoomStatusBadge } from '@/components/common'
import { LeaderboardTab, OverviewTab, ParticipantsTab, QuestionsTab, SettingsTab, WaitingRoomCard, useWaitingRoom } from '@/components/room-tabs'
import { Alert, Button, Field, NumberInput, PageLoader, Screen, ScreenHeader, Sheet, Text, useFeedback } from '@/components/ui'
import { api, errorMessage, formatDate, type BankQuestion, type Room } from '@/lib/api'
import { cancelReminder, remindAt } from '@/lib/notify'
import { radius, useColors } from '@/theme'

type Tab = 'overview' | 'questions' | 'participants' | 'leaderboard' | 'settings'
const TABS: Tab[] = ['overview', 'questions', 'participants', 'leaderboard', 'settings']

export default function RoomScreen() {
  const params = useLocalSearchParams<{ id: string; tab?: Tab }>()
  const id = params.id
  const c = useColors()
  const { toast, confirm } = useFeedback()
  const [room, setRoom] = useState<Room | null>(null)
  const [questions, setQuestions] = useState<BankQuestion[]>([])
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>(TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'overview')
  const [extendOpen, setExtendOpen] = useState(false)
  const [extendBy, setExtendBy] = useState('10')
  const [busy, setBusy] = useState<Room['status'] | 'extend' | null>(null)

  const load = useCallback(() => api<{ room: Room; questions: BankQuestion[] }>(`/api/rooms/${id}`).then(d => { setRoom(d.room); setQuestions(d.questions); setError('') }).catch(err => setError(errorMessage(err))), [id])
  // Reload when coming back from adding questions or reviewing a student.
  useFocusEffect(useCallback(() => { load() }, [load]))

  useEffect(() => {
    if (!room) return
    const key = `room-${room.id}`
    if (room.startsAt && room.status !== 'closed') void remindAt(key, new Date(new Date(room.startsAt).getTime() - 20 * 60_000), 'Exam starts in 20 minutes', `${room.title} (${room.code})${room.status === 'draft' && !room.autoOpen ? ' — open the room when you are ready.' : '.'}`)
    else void cancelReminder(key)
  }, [room])

  const waiting = useWaitingRoom(id, room?.status === 'open' && (room?.requireApproval ?? true))
  const pendingCount = waiting.data?.counts.pending ?? 0

  async function setStatus(status: Room['status']) {
    if (!room) return
    if (status === 'closed' && !(await confirm({ title: 'End this exam?', description: 'Everyone still writing is submitted immediately and no one else can join.', confirmLabel: 'End exam', tone: 'danger' }))) return
    const early = status === 'open' && room.startsAt && new Date(room.startsAt).getTime() > Date.now() + 60_000
    if (early && !(await confirm({ title: 'Open this exam before its scheduled time?', description: `This exam is scheduled for ${formatDate(room.startsAt, true)}${room.autoOpen ? ' and opens automatically then' : ''}. Opening it now starts the exam right away: the start time changes to now and students can join immediately.`, confirmLabel: 'Yes, open now', cancelLabel: 'Keep the schedule', tone: 'danger' }))) return
    setBusy(status)
    try {
      const data = await api<{ room: Room }>(`/api/rooms/${id}`, { method: 'PATCH', body: early ? { status, startsAt: new Date().toISOString() } : { status } })
      setRoom(data.room)
      toast(status === 'open' ? `Room is live. Students can join with ${data.room.code}.` : status === 'closed' ? 'Exam ended. All papers are submitted.' : 'Room paused; no new students can join.')
    } catch (err) { toast(errorMessage(err), 'error') } finally { setBusy(null) }
  }

  async function extend() {
    setBusy('extend')
    try {
      await api(`/api/rooms/${id}`, { method: 'PATCH', body: { extendMinutes: Number(extendBy) } })
      toast(`Added ${extendBy} minutes for everyone still writing.`)
      setExtendOpen(false)
    } catch (err) { toast(errorMessage(err), 'error') } finally { setBusy(null) }
  }

  const header = <ScreenHeader title={room?.title ?? 'Exam room'} eyebrow="Exam room" onBack={() => (router.canGoBack() ? router.back() : router.replace('/faculty/exams'))} />
  if (error && !room) return <Screen header={header}><Alert>{error}</Alert></Screen>
  if (!room) return <Screen header={header}><PageLoader /></Screen>

  const tabs: { value: Tab; label: string; badge?: number }[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'questions', label: `Questions ${room.poolSize}` },
    { value: 'participants', label: `Participants ${room.joined}`, badge: pendingCount },
    { value: 'leaderboard', label: 'Leaderboard' },
    { value: 'settings', label: 'Settings' },
  ]

  return (
    <Screen header={header} onRefresh={load}>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Text serif size={24} leading={30} style={{ flexShrink: 1 }}>{room.title}</Text>
          <RoomStatusBadge status={room.status} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <CopyCode code={room.code} />
          <Text size={13} tone="mutedForeground">{room.durationMinutes} min · {room.questionsPerStudent} MCQ{room.codingQuestions ? ` + ${room.codingQuestions} coding` : ''} per student</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {room.status === 'draft' && <Button icon={Play} loading={busy === 'open'} disabled={busy !== null} style={{ flex: 1 }} onPress={() => setStatus('open')}>{busy === 'open' ? 'Opening…' : 'Open room'}</Button>}
          {room.status === 'open' && <>
            <Button variant="outline" icon={Clock3} size="sm" onPress={() => setExtendOpen(true)}>Extend</Button>
            <Button variant="outline" icon={CirclePause} size="sm" disabled={busy !== null} loading={busy === 'draft'} onPress={() => setStatus('draft')}>Pause</Button>
            <Button variant="destructive" icon={Square} size="sm" style={{ flex: 1 }} loading={busy === 'closed'} disabled={busy !== null} onPress={() => setStatus('closed')}>{busy === 'closed' ? 'Ending…' : 'End exam'}</Button>
          </>}
          {room.status === 'closed' && <Button variant="outline" icon={RotateCcw} loading={busy === 'open'} disabled={busy !== null} onPress={() => setStatus('open')}>{busy === 'open' ? 'Reopening…' : 'Reopen'}</Button>}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginHorizontal: -16 }}>
        <View style={{ width: 10 }} />
        {tabs.map(t => {
          const active = tab === t.value
          return (
            <Pressable key={t.value} onPress={() => setTab(t.value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7, borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primarySoft : c.card }}>
              <Text size={13} weight="medium" color={active ? c.primaryInk : c.mutedForeground}>{t.label}</Text>
              {t.badge ? <View style={{ borderRadius: 10, backgroundColor: c.primary, paddingHorizontal: 6 }}><Text size={11} weight="semibold" color="#fff">{t.badge} waiting</Text></View> : null}
            </Pressable>
          )
        })}
        <View style={{ width: 10 }} />
      </ScrollView>

      {pendingCount > 0 && tab !== 'participants' && (
        <Pressable onPress={() => setTab('participants')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderRadius: radius.lg, borderWidth: 1, borderColor: c.primaryBorder, backgroundColor: c.primarySoft, padding: 12 }}>
          <Text size={13} weight="semibold" tone="primaryInk" style={{ flex: 1 }}>{pendingCount} student{pendingCount === 1 ? ' is' : 's are'} waiting to be admitted.</Text>
          <Text size={13} weight="medium" tone="primaryInk">Open</Text>
        </Pressable>
      )}

      {tab === 'participants' && room.status === 'open' && (room.requireApproval ?? true) && <WaitingRoomCard code={room.code} data={waiting.data} act={waiting.act} />}
      {tab === 'overview' && <OverviewTab room={room} onGo={setTab} />}
      {tab === 'questions' && <QuestionsTab room={room} questions={questions} onChanged={load} />}
      {tab === 'participants' && <ParticipantsTab room={room} onChanged={load} />}
      {tab === 'leaderboard' && <LeaderboardTab room={room} />}
      {tab === 'settings' && <SettingsTab room={room} onSaved={next => { setRoom(next); load() }} />}

      <Sheet open={extendOpen} onClose={() => setExtendOpen(false)} title="Extend time" description="Adds time for every student who is still writing."
        footer={<>
          <Button variant="outline" style={{ flex: 1 }} onPress={() => setExtendOpen(false)}>Cancel</Button>
          <Button style={{ flex: 1 }} loading={busy === 'extend'} onPress={extend}>{`Add ${extendBy || 0} minutes`}</Button>
        </>}>
        <Field label="Minutes to add"><NumberInput keyboardType="number-pad" value={extendBy} onChangeText={setExtendBy} /></Field>
      </Sheet>
    </Screen>
  )
}
