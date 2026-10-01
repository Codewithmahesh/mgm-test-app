import { router, useLocalSearchParams } from 'expo-router'
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, Code2, Hand, Laptop, ListChecks, PlayCircle, ShieldAlert, Trophy, UserRound, XCircle, type LucideIcon } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, View } from 'react-native'
import { Alert, Button, Card, CardHeader, Checkbox, PageLoader, Screen, ScreenHeader, Spinner, Text } from '@/components/ui'
import { api, errorMessage, formatDate } from '@/lib/api'
import { notify, remindAt } from '@/lib/notify'
import { useColors } from '@/theme'

type Lobby = {
  room: { code: string; title: string; description: string; instructions: string; teacher: string; department: string; durationMinutes: number; mcqCount: number; codingCount: number; marksPerQuestion: number; mcqMarks: number; totalMarks: number; marksVary: boolean; negativeMarks: number; codingMarks: number; startsAt: string | null; status: string; requireFullscreen: boolean; blockCopyPaste: boolean; maxViolations: number; requireApproval: boolean }
  request: { status: 'pending' | 'admitted' | 'rejected'; requestedAt: string; decidedAt: string | null } | null
  attempt: { id: string; status: string; endsAt: string } | null
  blocker: string | null
}

export default function RoomLobby() {
  const { code } = useLocalSearchParams<{ code: string }>()
  const c = useColors()
  const [data, setData] = useState<Lobby | null>(null)
  const [error, setError] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [starting, setStarting] = useState(false)
  const [requesting, setRequesting] = useState(false)

  const load = useCallback(() => api<Lobby>(`/api/student/rooms/${code}`).then(next => { setData(next); setError('') }).catch(err => setError(errorMessage(err))), [code])
  const waitingForFaculty = data?.request?.status === 'pending'
  const lastRequest = useRef<string | undefined>(undefined)

  // Tell the student the moment they're admitted (they may have switched to another app while waiting),
  // and remind them when a scheduled exam starts.
  useEffect(() => {
    if (!data) return
    const status = data.request?.status
    if (lastRequest.current === 'pending' && status === 'admitted') void notify('You have been admitted', `${data.room.title}: open the app and start your exam.`)
    if (lastRequest.current === 'pending' && status === 'rejected') void notify('Request declined', `${data.room.title}: your faculty declined your request to join.`)
    lastRequest.current = status
    if (data.room.startsAt && !data.attempt) void remindAt(`start-${data.room.code}`, new Date(data.room.startsAt), 'Your exam is starting', `${data.room.title} (room ${data.room.code}) starts now.`)
  }, [data])

  // Every 3 s while waiting to be admitted, otherwise every 15 s (e.g. waiting for the room to open).
  useEffect(() => {
    load()
    const timer = setInterval(() => { if (AppState.currentState === 'active') load() }, waitingForFaculty ? 3000 : 15_000)
    return () => clearInterval(timer)
  }, [load, waitingForFaculty])

  async function requestJoin() {
    setRequesting(true)
    setError('')
    try { await api(`/api/student/rooms/${code}/request`, { method: 'POST' }); await load() } catch (err) { setError(errorMessage(err)) } finally { setRequesting(false) }
  }
  async function cancelRequest() {
    setRequesting(true)
    try { await api(`/api/student/rooms/${code}/request`, { method: 'DELETE' }); await load() } catch (err) { setError(errorMessage(err)) } finally { setRequesting(false) }
  }
  async function start() {
    setStarting(true)
    try {
      const result = await api<{ attemptId: string }>(`/api/student/rooms/${code}/start`, { method: 'POST' })
      router.replace(`/student/exam/${result.attemptId}`)
    } catch (err) { setError(errorMessage(err)); setStarting(false) }
  }

  if (error && !data) return (
    <Screen header={<ScreenHeader title="Exam" />}>
      <View style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
        <AlertTriangle size={30} color={c.warning} />
        <Text weight="semibold" size={18} center>Can&apos;t open this exam</Text>
        <Text size={14} tone="mutedForeground" center>{error}</Text>
        <Button variant="outline" style={{ marginTop: 12 }} onPress={() => router.back()}>Back to dashboard</Button>
      </View>
    </Screen>
  )
  if (!data) return <Screen header={<ScreenHeader title="Exam" eyebrow={`Room ${code}`} />}><PageLoader /></Screen>

  const { room, attempt, blocker, request } = data
  const needsAdmission = room.requireApproval && request?.status !== 'admitted'
  const total = room.totalMarks ?? room.mcqCount * room.marksPerQuestion + room.codingCount * room.codingMarks
  const rules = room.instructions.split('\n').map(line => line.trim()).filter(Boolean)
  const hasCoding = room.codingCount > 0

  return (
    <Screen onRefresh={load} header={<ScreenHeader title={room.title} eyebrow={`Room ${room.code}`} />}>
      <View style={{ gap: 4 }}>
        <Text serif size={24} leading={30}>{room.title}</Text>
        {room.description ? <Text size={14} tone="mutedForeground">{room.description}</Text> : null}
        {room.teacher ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}><UserRound size={14} color={c.mutedForeground} /><Text size={13} tone="mutedForeground">{room.teacher}{room.department ? ` · ${room.department}` : ''}</Text></View> : null}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Fact icon={Clock3} label="Duration" value={`${room.durationMinutes} min`} />
        <Fact icon={ListChecks} label="MCQs" value={room.mcqCount ? (room.marksVary ? `${room.mcqCount} · ${room.mcqMarks} marks` : `${room.mcqCount} × ${room.marksPerQuestion}`) : 'None'} />
        <Fact icon={Code2} label="Coding" value={hasCoding ? `${room.codingCount} × ${room.codingMarks}` : 'None'} />
        <Fact icon={Trophy} label="Total marks" value={String(total)} />
      </View>

      <Card>
        <CardHeader title="Instructions" description="Read these carefully before you start." />
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
          {room.negativeMarks > 0 && <Bullet color={c.warning}><Text size={14} weight="medium" tone="warning" leading={21}>Negative marking: −{room.negativeMarks} for each wrong MCQ answer. Unanswered questions score 0.</Text></Bullet>}
          {rules.map((rule, i) => <Bullet key={i} color={c.subtle}><Text size={14} leading={21}>{rule}</Text></Bullet>)}
        </View>
      </Card>

      <Card tone="amber">
        <CardHeader title="This exam is proctored" description="The following are monitored and reported to your faculty." />
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
          {['Leaving the app or switching to another app is recorded.', 'Screenshots and screen recording are blocked.', room.blockCopyPaste && 'Copying question text is disabled.', 'The exam can be open on only one device at a time.', 'Your IP address and a watermark with your email are on the paper.'].filter(Boolean).map(rule => (
            <View key={rule as string} style={{ flexDirection: 'row', gap: 10 }}>
              <ShieldAlert size={16} color={c.warning} style={{ marginTop: 2 }} />
              <Text size={13} leading={19} style={{ flex: 1 }}>{rule}</Text>
            </View>
          ))}
          {room.maxViolations > 0 && <Alert tone="amber" style={{ marginTop: 4 }}>{`After ${room.maxViolations} violation${room.maxViolations === 1 ? '' : 's'} your exam is submitted automatically.`}</Alert>}
        </View>
      </Card>

      <Card padded>
        {attempt?.status === 'submitted' ? (
          <View style={{ gap: 12 }}>
            <Text size={14}>You&apos;ve already submitted this exam.</Text>
            <Button full onPress={() => router.replace(`/student/result/${attempt.id}`)}>View result</Button>
          </View>
        ) : attempt ? (
          <View style={{ gap: 12 }}>
            <Text size={14}>Your exam is in progress. The timer is still running.</Text>
            <Button variant="success" size="lg" icon={PlayCircle} full onPress={() => router.replace(`/student/exam/${attempt.id}`)}>Resume exam</Button>
          </View>
        ) : hasCoding ? (
          <Status icon={Laptop} color={c.primary} title="Please use a laptop or desktop for this exam" text={`It includes ${room.codingCount} coding problem${room.codingCount === 1 ? '' : 's'}, which need the code editor on the website. Open the examination portal on a computer and enter code ${room.code}.`} />
        ) : blocker ? (
          <Status icon={CalendarClock} color={c.warning} title={blocker}
            text={`${room.status === 'draft' || (room.startsAt && new Date(room.startsAt) > new Date()) ? 'This page checks again automatically every few seconds.' : 'Contact your faculty if you think this is a mistake.'}${room.startsAt ? ` Scheduled for ${formatDate(room.startsAt, true)}.` : ''}`} />
        ) : needsAdmission && request?.status === 'pending' ? (
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Spinner /></View>
              <View style={{ flex: 1 }}>
                <Text size={14} weight="medium">Waiting for your faculty to admit you…</Text>
                <Text size={13} tone="mutedForeground" leading={19} style={{ marginTop: 2 }}>Requested {new Date(request.requestedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}. Keep this screen open; it updates the moment you&apos;re admitted.</Text>
              </View>
            </View>
            <Button variant="ghost" loading={requesting} onPress={cancelRequest}>Cancel request</Button>
          </View>
        ) : needsAdmission && request?.status === 'rejected' ? (
          <View style={{ gap: 14 }}>
            <Status icon={XCircle} color={c.danger} title="Your faculty declined your request." text="If this is a mistake, speak to your faculty and request again." />
            <Button variant="outline" icon={Hand} loading={requesting} onPress={requestJoin}>{requesting ? 'Requesting…' : 'Request again'}</Button>
          </View>
        ) : needsAdmission ? (
          <View style={{ gap: 14 }}>
            <Status icon={Hand} color={c.primary} title="Ask to join this exam" text="Your faculty admits students from the waiting room. Once you're admitted you can start; your timer begins only when you press Start." />
            <Button size="lg" icon={Hand} full loading={requesting} onPress={requestJoin}>{requesting ? 'Requesting…' : 'Request to join'}</Button>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {room.requireApproval && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><CheckCircle2 size={16} color={c.success} /><Text size={14} weight="medium" tone="success">You&apos;ve been admitted. Start whenever you&apos;re ready.</Text></View>}
            <Checkbox checked={agreed} onChange={setAgreed} label={`I have read the instructions. I'm ready to start; the ${room.durationMinutes}-minute timer begins immediately.`} />
            <Button size="lg" icon={PlayCircle} full disabled={!agreed} loading={starting} onPress={start}>{starting ? 'Starting…' : 'Start exam'}</Button>
          </View>
        )}
        {error ? <Alert style={{ marginTop: 14 }}>{error}</Alert> : null}
      </Card>
    </Screen>
  )
}

function Fact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  const c = useColors()
  return (
    <Card padded style={{ flexGrow: 1, flexBasis: '45%', paddingVertical: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Icon size={13} color={c.mutedForeground} /><Text size={12} tone="mutedForeground">{label}</Text></View>
      <Text size={17} weight="semibold" tabular style={{ marginTop: 2 }}>{value}</Text>
    </Card>
  )
}

function Bullet({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, marginTop: 8 }} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  )
}

function Status({ icon: Icon, color, title, text }: { icon: LucideIcon; color: string; title: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <Icon size={20} color={color} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text size={14} weight="medium">{title}</Text>
        <Text size={13} tone="mutedForeground" leading={19} style={{ marginTop: 2 }}>{text}</Text>
      </View>
    </View>
  )
}
