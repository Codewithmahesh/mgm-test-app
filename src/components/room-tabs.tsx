import { router } from 'expo-router'
import { AlertTriangle, BookOpen, Check, CheckCircle2, ClipboardCheck, Clock3, Code2, DoorOpen, Eye, Layers, ListChecks, Pencil, Plus, Radio, Scale, Send, ShieldAlert, ShieldCheck, Shuffle, Trash2, Trophy, UserCheck, UserX, Users, X } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, Pressable, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { api, clock, errorMessage, formatDate, formatDuration, initials, paperKind, relativeTime, type BankQuestion, type Classroom, type DraftQuestion, type Room } from '@/lib/api'
import { BLOOM_INFO, paperMarks, setNames } from '@/lib/bloom'
import type { Flags, RiskLevel } from '@/lib/integrity'
import { radius, useColors } from '@/theme'
import { AttemptStatusBadge, CopyCode, IntegrityCell, RankBadge } from './common'
import { QuestionCard } from './question-card'
import { QuestionEditor } from './question-editor'
import { RoomForm, roomToValues, valuesToPayload } from './room-form'
import { Alert, Badge, Button, Card, CardHeader, Checkbox, DetailRow, Divider, EmptyState, IconButton, PageLoader, Progress, StatCard, Text, useFeedback } from './ui'

export type AttemptRow = {
  id: string; rank: number | null; studentName: string; studentEmail: string; rollNumber: string; className: string; set: string
  status: 'in_progress' | 'submitted'; answered: number; totalQuestions: number; correctCount: number; wrongCount: number
  mcqScore: number; codingScore: number; codingPending: number; score: number; maxScore: number; tabSwitches: number; autoSubmitted: boolean
  autoSubmitReason: string; flags: Flags; violations: number; risk: RiskLevel; riskScore: number; ipCount: number
  startedAt: string; endsAt: string; submittedAt: string | null; lastSeenAt: string; timeTakenSeconds: number | null
}

const studentLine = (row: Pick<AttemptRow, 'set' | 'rollNumber' | 'className' | 'studentEmail'>) => [row.set && `Set ${row.set}`, row.rollNumber && `Roll ${row.rollNumber}`, row.className].filter(Boolean).join(' · ') || row.studentEmail

/** Polls while the app is in the foreground. */
function usePoll(fn: () => void, ms: number, active: boolean) {
  const saved = useRef(fn)
  useEffect(() => { saved.current = fn }, [fn])
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => { if (AppState.currentState === 'active') saved.current() }, ms)
    return () => clearInterval(timer)
  }, [ms, active])
}

/* ---------------- Overview ---------------- */

export function OverviewTab({ room, onGo }: { room: Room; onGo: (tab: 'questions' | 'participants' | 'leaderboard') => void }) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  useEffect(() => { if (room.allowedClassrooms.length) api<{ classrooms: Classroom[] }>('/api/classrooms').then(d => setClassrooms(d.classrooms)).catch(() => {}) }, [room.allowedClassrooms.length])
  const writing = room.joined - room.submitted
  const marks = paperMarks(room)
  const mcqShort = room.questionsPerStudent > room.mcqPoolSize
  const tfShort = room.tfQuestions > room.tfPoolSize
  const codingShort = room.codingQuestions > room.codingPoolSize

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label="Joined" value={room.joined} icon={Users} tone="blue" style={{ flexBasis: '45%' }} />
        <StatCard label="Writing now" value={writing} icon={Radio} tone="green" style={{ flexBasis: '45%' }} hint={writing ? <Text size={12} weight="medium" tone="primary" onPress={() => onGo('participants')} style={{ marginTop: 4 }}>Watch live</Text> : undefined} />
        <StatCard label="Submitted" value={room.submitted} icon={CheckCircle2} tone="violet" style={{ flexBasis: '45%' }} hint={room.averagePercent != null ? `Average ${room.averagePercent}%` : undefined} />
        <StatCard label="To grade" value={room.pendingReview} icon={ClipboardCheck} tone={room.pendingReview ? 'amber' : 'blue'} style={{ flexBasis: '45%' }} hint={room.pendingReview ? <Text size={12} weight="medium" tone="primary" onPress={() => onGo('leaderboard')} style={{ marginTop: 4 }}>Grade coding answers</Text> : 'Coding answers'} />
      </View>

      {room.flagged > 0 && (
        <Alert icon={ShieldAlert}>
          <Text size={13} tone="dangerInk" leading={19}><Text size={13} weight="semibold" tone="dangerInk">{room.flagged} student{room.flagged === 1 ? '' : 's'} flagged</Text> for possible cheating (leaving the exam, pasting, a second device…). <Text size={13} weight="semibold" tone="dangerInk" onPress={() => onGo('participants')}>Review flags</Text></Text>
        </Alert>
      )}
      {(mcqShort || tfShort || codingShort || room.poolSize === 0) && (
        <Alert tone="amber" icon={AlertTriangle}>
          <Text size={13} tone="warningInk" leading={19}>
            {room.poolSize === 0 ? 'This room has no questions yet. ' : `The pool is smaller than one paper:${mcqShort ? ` ${room.mcqPoolSize}/${room.questionsPerStudent} MCQs` : ''}${tfShort ? ` ${room.tfPoolSize}/${room.tfQuestions} True/False` : ''}${codingShort ? ` ${room.codingPoolSize}/${room.codingQuestions} coding problems` : ''}. `}
            <Text size={13} weight="semibold" tone="warningInk" onPress={() => onGo('questions')}>Add questions</Text> before opening the room.
          </Text>
        </Alert>
      )}

      <Card>
        <CardHeader title="Share with students" description="Students sign in with their college email, then enter this code." />
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 14 }}>
          <CopyCode code={room.code} large />
          {['Student signs in (first time: activates with the OTP sent to their college email).', 'Enters the room code on their dashboard and reads the instructions.', 'Starts the test once the room is Live. Their timer starts then.'].map((step, i) => (
            <View key={step} style={{ flexDirection: 'row', gap: 10 }}>
              <Text mono size={12} tone="primary">0{i + 1}</Text>
              <Text size={13} tone="mutedForeground" leading={19} style={{ flex: 1 }}>{step}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <CardHeader title="Exam settings" />
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <DetailRow icon={Clock3} label="Duration" value={`${room.durationMinutes} minutes`} />
          <DetailRow icon={Trophy} label="Total marks" value={marks.total} />
          <DetailRow icon={ListChecks} label="MCQs per student" value={room.bloomPlan.length ? `${room.questionsPerStudent} · ${marks.mcq - room.tfQuestions * room.marksPerQuestion} marks` : `${room.questionsPerStudent} × ${room.marksPerQuestion}${room.negativeMarks ? ` (−${room.negativeMarks})` : ''}`} />
          {room.tfQuestions > 0 && <DetailRow icon={ListChecks} label="True / False per student" value={`${room.tfQuestions} × ${room.marksPerQuestion}${room.negativeMarks ? ` (−${room.negativeMarks})` : ''}`} />}
          <DetailRow icon={Code2} label="Coding per student" value={room.codingQuestions ? `${room.codingQuestions} × ${room.codingMarks}` : 'None'} />
          <DetailRow icon={room.paperMode === 'sets' ? Layers : Shuffle} label="Papers" value={room.paperMode === 'sets' ? `${room.setCount} sets (${setNames(room.setCount).join(', ')})` : 'Random from the pool'} />
          <DetailRow icon={Scale} label="Bloom's levels" value={room.bloomPlan.length ? room.bloomPlan.map(row => `L${BLOOM_INFO[row.level].n}×${row.count} @${row.marks}`).join(' · ') : 'Balanced automatically'} />
          <DetailRow icon={Clock3} label="Starts" value={room.startsAt ? `${formatDate(room.startsAt, true)}${room.autoOpen ? ' · auto' : ''}` : 'When opened'} />
          <DetailRow icon={Eye} label="Scores shown" value={{ after_end: 'After exam ends', after_submit: 'After submitting', never: 'Never' }[room.showResults]} />
          <DetailRow icon={ShieldCheck} label="Proctoring" value={[room.requireFullscreen && 'Fullscreen', room.blockCopyPaste && 'No copy/paste', 'Single device'].filter(Boolean).join(' · ')} />
          <DetailRow icon={ShieldAlert} label="Auto-submit" value={room.maxViolations ? `After ${room.maxViolations} violations` : 'Off (flag only)'} />
          <Divider style={{ marginVertical: 8 }} />
          <Text size={13} tone="mutedForeground">Open to</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {room.allowedClassrooms.length ? room.allowedClassrooms.map(id => <Badge key={id}>{classrooms.find(cl => cl.id === id)?.label ?? '…'}</Badge>) : <Badge tone="blue">All students</Badge>}
          </View>
        </View>
      </Card>

      {room.instructions ? (
        <Card>
          <CardHeader title="Instructions" description="Shown on the student's start screen." />
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 6 }}>
            {room.instructions.split('\n').filter(Boolean).map((line, i) => <Text key={i} size={13} leading={19}>•  {line}</Text>)}
          </View>
        </Card>
      ) : null}
    </View>
  )
}

/* ---------------- Questions ---------------- */

export function QuestionsTab({ room, questions, onChanged }: { room: Room; questions: BankQuestion[]; onChanged: () => void }) {
  const { toast, confirm } = useFeedback()
  const [editing, setEditing] = useState<BankQuestion | null>(null)
  // On older rooms True/False questions are dealt as MCQs, so they're listed with them.
  const mcqs = questions.filter(q => paperKind(room, q.type) === 'mcq')
  const trueFalse = questions.filter(q => paperKind(room, q.type) === 'tf')
  const coding = questions.filter(q => q.type === 'coding')
  const add = (method: 'ai' | 'csv' | 'manual' | 'bank') => router.push(`/faculty/add-questions?roomId=${room.id}&method=${method}`)

  async function remove(question: BankQuestion) {
    const ok = await confirm({ title: 'Remove from this room?', description: room.joined ? "Students who already started keep their paper; new papers won't include it. It stays in your question bank." : 'It stays in your question bank.', confirmLabel: 'Remove' })
    if (!ok) return
    try { await api(`/api/questions/${question.id}`, { method: 'PATCH', body: { room: null } }); toast('Question removed from the room.') } catch (err) { toast(errorMessage(err), 'error') }
    onChanged()
  }
  async function save(question: DraftQuestion) {
    if (!editing) return
    await api(`/api/questions/${editing.id}`, { method: 'PATCH', body: question })
    toast('Question updated.')
    onChanged()
  }
  const actions = (q: BankQuestion) => <>
    <IconButton icon={Pencil} label="Edit" size={32} onPress={() => setEditing(q)} />
    <IconButton icon={Trash2} label="Remove from room" size={32} onPress={() => remove(q)} />
  </>

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <PoolMeter label="MCQ pool" have={mcqs.length} need={room.questionsPerStudent} icon={ListChecks} />
        {room.tfSeparate && <PoolMeter label="True / False" have={trueFalse.length} need={room.tfQuestions} icon={ListChecks} />}
        <PoolMeter label="Coding pool" have={coding.length} need={room.codingQuestions} icon={Code2} />
      </View>
      <Card padded style={{ gap: 10 }}>
        <Button icon={Plus} onPress={() => add('ai')}>Add questions with AI</Button>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button variant="outline" size="sm" style={{ flex: 1 }} onPress={() => add('csv')}>CSV</Button>
          <Button variant="outline" size="sm" style={{ flex: 1 }} onPress={() => add('manual')}>Write</Button>
          <Button variant="outline" size="sm" style={{ flex: 1 }} onPress={() => add('bank')}>Bank</Button>
        </View>
      </Card>
      {room.status === 'open' && room.joined > 0 && <Alert tone="blue">Students are already writing. Edits apply to new papers and to grading of MCQs that are changed.</Alert>}
      {questions.length === 0 ? (
        <Card><EmptyState icon={BookOpen} title="No questions in this room yet" description="Generate them with AI from a PDF or notes, import a CSV, write your own, or copy from your question bank." /></Card>
      ) : (
        <>
          {mcqs.length > 0 && (
            <Card>
              <CardHeader flush title={`Multiple choice · ${mcqs.length}`} description={room.paperMode === 'sets' ? `Each student gets ${room.questionsPerStudent} from their set, in random order.` : `Each student gets ${Math.min(room.questionsPerStudent, mcqs.length)} of these in random order.`} />
              {mcqs.map((q, i) => <View key={q.id}>{i > 0 && <Divider />}<QuestionCard question={q} index={i} actions={actions(q)} /></View>)}
            </Card>
          )}
          {trueFalse.length > 0 && (
            <Card>
              <CardHeader flush title={`True / False · ${trueFalse.length}`} description={`Each student gets ${room.paperMode === 'sets' ? room.tfQuestions : Math.min(room.tfQuestions, trueFalse.length)} of these, mixed in with the MCQs.`} />
              {trueFalse.map((q, i) => <View key={q.id}>{i > 0 && <Divider />}<QuestionCard question={q} index={i} actions={actions(q)} /></View>)}
            </Card>
          )}
          {coding.length > 0 && (
            <Card>
              <CardHeader flush title={`Coding problems · ${coding.length}`} description={`Each student gets ${Math.min(room.codingQuestions, coding.length)} of these (answered on a computer).`} />
              {coding.map((q, i) => <View key={q.id}>{i > 0 && <Divider />}<QuestionCard question={q} index={i} actions={actions(q)} /></View>)}
            </Card>
          )}
        </>
      )}
      <QuestionEditor open={Boolean(editing)} initial={editing} onClose={() => setEditing(null)} onSave={save} />
    </View>
  )
}

function PoolMeter({ label, have, need, icon: Icon }: { label: string; have: number; need: number; icon: typeof ListChecks }) {
  const c = useColors()
  const ok = have >= need
  return (
    <Card padded style={{ flex: 1, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon size={14} color={c.mutedForeground} /><Text size={12} weight="medium" tone="mutedForeground">{label}</Text></View>
      <Text size={24} weight="semibold" tabular>{have}<Text size={12} tone="mutedForeground">{need ? ` / ${need}` : ' · not used'}</Text></Text>
      {need > 0 && <Progress value={(have / need) * 100} tone={ok ? 'green' : 'amber'} />}
      {need > 0 && <Text size={11} weight="medium" tone={ok ? 'success' : 'warning'}>{ok ? 'Ready' : `${need - have} more needed`}</Text>}
    </Card>
  )
}

/* ---------------- Waiting room ---------------- */

type JoinRow = { id: string; studentName: string; studentEmail: string; rollNumber: string; className: string; status: 'pending' | 'admitted' | 'rejected'; started: boolean; requestedAt: string; decidedAt: string | null }
type WaitingData = { requireApproval: boolean; pending: JoinRow[]; admittedWaiting: JoinRow[]; rejected: JoinRow[]; counts: { pending: number; admitted: number } }

/** Checks the waiting room every 3 seconds; buzzes when someone new asks to join. */
export function useWaitingRoom(roomId: string, active: boolean) {
  const { toast } = useFeedback()
  const [data, setData] = useState<WaitingData | null>(null)
  const seen = useRef<Set<string> | null>(null)

  const load = useCallback(() => api<WaitingData>(`/api/rooms/${roomId}/requests`).then(next => {
    if (seen.current) {
      const fresh = next.pending.filter(r => !seen.current!.has(r.id))
      if (fresh.length) {
        toast(fresh.length === 1 ? `${fresh[0].studentName} is asking to join.` : `${fresh.length} students are asking to join.`, 'info')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
      }
    }
    seen.current = new Set(next.pending.map(r => r.id))
    setData(next)
  }).catch(() => {}), [roomId, toast])

  useEffect(() => { if (active) load() }, [active, load])
  usePoll(load, 3000, active)

  const act = useCallback(async (action: 'admit' | 'reject', target: { ids: string[] } | { all: true }) => {
    setData(current => {
      if (!current) return current
      const chosen = new Set('all' in target ? current.pending.map(r => r.id) : target.ids)
      const moved = [...current.pending, ...current.rejected].filter(r => chosen.has(r.id)).map(r => ({ ...r, status: action === 'admit' ? 'admitted' as const : 'rejected' as const }))
      const pendingLeft = current.pending.filter(r => !chosen.has(r.id))
      return {
        ...current,
        pending: pendingLeft,
        rejected: action === 'reject' ? [...current.rejected, ...moved] : current.rejected.filter(r => !chosen.has(r.id)),
        admittedWaiting: action === 'admit' ? [...current.admittedWaiting, ...moved] : current.admittedWaiting,
        counts: { ...current.counts, pending: pendingLeft.length },
      }
    })
    try {
      const result = await api<{ updated: number }>(`/api/rooms/${roomId}/requests`, { method: 'PATCH', body: { action, ...target } })
      toast(action === 'admit' ? `${result.updated} student${result.updated === 1 ? '' : 's'} admitted.` : `${result.updated} request${result.updated === 1 ? '' : 's'} declined.`)
    } catch (err) { toast(errorMessage(err), 'error') }
    load()
  }, [roomId, toast, load])

  return { data, act }
}

export function WaitingRoomCard({ code, data, act }: { code: string; data: WaitingData | null; act: ReturnType<typeof useWaitingRoom>['act'] }) {
  const c = useColors()
  const [showDeclined, setShowDeclined] = useState(false)
  if (!data) return null
  const { pending, admittedWaiting, rejected } = data
  return (
    <Card tone={pending.length ? 'blue' : undefined}>
      <CardHeader title="Waiting room" description={pending.length ? `${pending.length} student${pending.length === 1 ? ' is' : 's are'} asking to join · updates automatically` : 'Students who request to join appear here instantly'} />
      {pending.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
          <Button variant="outline" size="sm" icon={UserX} style={{ flex: 1 }} onPress={() => act('reject', { all: true })}>Decline all</Button>
          <Button variant="success" size="sm" icon={UserCheck} style={{ flex: 1.3 }} onPress={() => act('admit', { all: true })}>{`Admit all (${pending.length})`}</Button>
        </View>
      )}
      {pending.length === 0 ? (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 }}>
          <DoorOpen size={18} color={c.mutedForeground} />
          <Text size={13} tone="mutedForeground" style={{ flex: 1 }}>No one is waiting. Students enter code <Text mono size={13} weight="semibold">{code}</Text> and tap Request to join.</Text>
        </View>
      ) : pending.map(row => (
        <View key={row.id}>
          <Divider />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Text size={12} weight="semibold" tone="primaryInk">{initials(row.studentName)}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text size={14} weight="medium" numberOfLines={1}>{row.studentName}</Text>
              <Text size={12} tone="mutedForeground" numberOfLines={1}>{[row.rollNumber && `Roll ${row.rollNumber}`, row.className].filter(Boolean).join(' · ') || row.studentEmail} · {relativeTime(row.requestedAt)}</Text>
            </View>
            <IconButton icon={X} label={`Decline ${row.studentName}`} onPress={() => act('reject', { ids: [row.id] })} />
            <Pressable onPress={() => act('admit', { ids: [row.id] })} accessibilityLabel={`Admit ${row.studentName}`} style={({ pressed }) => ({ width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.successInk : c.success })}>
              <Check size={18} color="#fff" />
            </Pressable>
          </View>
        </View>
      ))}
      {(admittedWaiting.length > 0 || rejected.length > 0) && (
        <View style={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.muted }}>
          {admittedWaiting.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <Text size={12} weight="medium" tone="mutedForeground">Admitted, not started:</Text>
              {admittedWaiting.map(r => <Badge key={r.id} tone="green">{r.studentName}</Badge>)}
            </View>
          )}
          {rejected.length > 0 && (
            <>
              <Text size={12} weight="medium" tone="mutedForeground" onPress={() => setShowDeclined(v => !v)}>{showDeclined ? 'Hide' : 'Show'} declined ({rejected.length})</Text>
              {showDeclined && rejected.map(r => (
                <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text size={13}>{r.studentName} <Text size={12} tone="mutedForeground">· {relativeTime(r.decidedAt)}</Text></Text>
                  <Text size={13} weight="medium" tone="success" onPress={() => act('admit', { ids: [r.id] })}>Admit</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </Card>
  )
}

/* ---------------- Participants and leaderboard ---------------- */

export function useAttempts(roomId: string, live: boolean) {
  const [rows, setRows] = useState<AttemptRow[] | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(() => api<{ attempts: AttemptRow[] }>(`/api/rooms/${roomId}/attempts`).then(d => { setRows(d.attempts); setError('') }).catch(err => setError(errorMessage(err))), [roomId])
  useEffect(() => { load() }, [load])
  usePoll(load, 10_000, live)
  return { rows, error, reload: load }
}

export function ParticipantsTab({ room, onChanged }: { room: Room; onChanged: () => void }) {
  const c = useColors()
  const { toast, confirm } = useFeedback()
  const { rows, error, reload } = useAttempts(room.id, room.status === 'open')
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  async function forceSubmit(row: AttemptRow) {
    if (!(await confirm({ title: `Submit ${row.studentName}'s exam now?`, description: "Their current answers will be graded and they won't be able to continue.", confirmLabel: 'Submit now', tone: 'danger' }))) return
    setSubmitting(row.id)
    try { await api(`/api/rooms/${room.id}/attempts/${row.id}`, { method: 'PATCH', body: { action: 'submit' } }); toast('Exam submitted.'); reload(); onChanged() } catch (err) { toast(errorMessage(err), 'error') } finally { setSubmitting(null) }
  }

  if (error) return <Alert>{error}</Alert>
  if (!rows) return <PageLoader />
  const writing = rows.filter(r => r.status === 'in_progress')
  const flaggedCount = rows.filter(r => r.risk !== 'clean').length
  const riskRank: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2, clean: 3 }
  const ordered = [...writing.sort((a, b) => riskRank[a.risk] - riskRank[b.risk] || a.studentName.localeCompare(b.studentName)), ...rows.filter(r => r.status === 'submitted').sort((a, b) => riskRank[a.risk] - riskRank[b.risk])]
    .filter(r => !flaggedOnly || r.risk !== 'clean')

  return (
    <Card>
      <CardHeader flush title="Participants" description={room.status === 'open' ? `${writing.length} writing · ${rows.length - writing.length} submitted · refreshes every 10 s` : `${rows.length} participant${rows.length === 1 ? '' : 's'}`} />
      {flaggedCount > 0 && <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}><Checkbox checked={flaggedOnly} onChange={setFlaggedOnly} label={`Flagged only (${flaggedCount})`} /></View>}
      {rows.length === 0 ? <EmptyState icon={Users} title="No one has joined yet" description={room.status === 'open' ? `Share the code ${room.code} with your students.` : 'Open the room so students can join.'} /> : ordered.map((row, i) => {
        const left = Math.round((new Date(row.endsAt).getTime() - now) / 1000)
        return (
          <View key={row.id}>
            {(i > 0 || flaggedCount > 0) && <Divider />}
            <Pressable onPress={() => router.push(`/faculty/attempt/${room.id}/${row.id}`)} style={({ pressed }) => ({ padding: 14, gap: 8, backgroundColor: pressed ? c.muted : row.risk === 'high' ? c.dangerSoft : row.risk === 'medium' ? c.warningSoft : 'transparent' })}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text size={14} weight="medium" numberOfLines={1}>{row.studentName}</Text>
                  <Text size={12} tone="mutedForeground" numberOfLines={1}>{studentLine(row)}</Text>
                </View>
                <AttemptStatusBadge {...row} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Progress value={(row.answered / Math.max(1, row.totalQuestions)) * 100} style={{ flex: 1 }} />
                <Text size={12} tone="mutedForeground" tabular>{row.answered}/{row.totalQuestions}</Text>
                <Text mono size={12} tabular color={row.status === 'in_progress' && left < 300 ? c.danger : c.mutedForeground}>{row.status === 'in_progress' ? `${clock(left)} left` : formatDuration(row.timeTakenSeconds)}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
                <IntegrityCell flags={row.flags} />
                {row.status === 'in_progress' && <Button variant="destructive-outline" size="sm" icon={Send} loading={submitting === row.id} onPress={() => forceSubmit(row)}>Submit</Button>}
              </View>
              <Text size={11} tone="subtle">Last active {relativeTime(row.lastSeenAt)}</Text>
            </Pressable>
          </View>
        )
      })}
    </Card>
  )
}

export function LeaderboardTab({ room }: { room: Room }) {
  const c = useColors()
  const { rows, error } = useAttempts(room.id, room.status === 'open')
  const [pendingOnly, setPendingOnly] = useState(false)
  const shown = useMemo(() => (rows ?? []).filter(r => r.status === 'submitted' && (!pendingOnly || r.codingPending > 0)), [rows, pendingOnly])
  if (error) return <Alert>{error}</Alert>
  if (!rows) return <PageLoader />
  const submitted = rows.filter(r => r.status === 'submitted')
  const top = submitted[0]
  const avg = submitted.length ? submitted.reduce((sum, r) => sum + (r.maxScore ? r.score / r.maxScore : 0), 0) / submitted.length : null
  const pending = submitted.filter(r => r.codingPending > 0).length

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label="Top score" value={top ? `${top.score}/${top.maxScore}` : '—'} icon={Trophy} tone="amber" hint={top?.studentName} style={{ flexBasis: '45%' }} />
        <StatCard label="Class average" value={avg == null ? '—' : `${Math.round(avg * 100)}%`} icon={Users} hint={`${submitted.length} submitted`} style={{ flexBasis: '45%' }} />
        {pending > 0 && <StatCard label="Awaiting grading" value={pending} icon={ClipboardCheck} tone="violet" hint="Papers with ungraded coding answers" style={{ flexBasis: '100%' }} />}
      </View>
      <Card>
        <CardHeader flush title="Leaderboard" description="Ranked by total score, then by time taken." />
        {pending > 0 && <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}><Checkbox checked={pendingOnly} onChange={setPendingOnly} label="Needs grading only" /></View>}
        {shown.length === 0 ? <EmptyState icon={Trophy} title={submitted.length ? 'Nothing to grade' : 'No submissions yet'} description={submitted.length ? 'All coding answers have marks.' : 'Scores appear here as students submit.'} /> : shown.map((row, i) => (
          <View key={row.id}>
            {(i > 0 || pending > 0) && <Divider />}
            <Pressable onPress={() => router.push(`/faculty/attempt/${room.id}/${row.id}`)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: pressed ? c.muted : row.risk === 'high' ? c.dangerSoft : 'transparent' })}>
              <RankBadge rank={row.rank} />
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text size={14} weight="medium" numberOfLines={1}>{row.studentName}</Text>
                <Text size={12} tone="mutedForeground" numberOfLines={1}>{studentLine(row)}</Text>
                <Text size={12} tone="mutedForeground" tabular><Text size={12} tone="success">{row.correctCount}✓</Text> <Text size={12} tone="danger">{row.wrongCount}✗</Text> · {formatDuration(row.timeTakenSeconds)}</Text>
                {row.codingPending > 0 && <Badge tone="violet">{`${row.codingPending} to grade`}</Badge>}
                {row.risk !== 'clean' && <IntegrityCell flags={row.flags} />}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text size={16} weight="semibold" tabular>{row.score}<Text size={12} tone="mutedForeground">/{row.maxScore}</Text></Text>
                <Text size={12} tone="mutedForeground" tabular>{row.maxScore ? Math.round((row.score / row.maxScore) * 100) : 0}%</Text>
              </View>
            </Pressable>
          </View>
        ))}
      </Card>
    </View>
  )
}

/* ---------------- Settings ---------------- */

export function SettingsTab({ room, onSaved }: { room: Room; onSaved: (room: Room) => void }) {
  const { toast, confirm } = useFeedback()
  const [deleting, setDeleting] = useState(false)
  async function remove() {
    const ok = await confirm({ title: `Delete "${room.title}"?`, description: `This permanently deletes the room and all ${room.joined} student result${room.joined === 1 ? '' : 's'}. Its questions stay in your question bank.`, confirmLabel: 'Delete room', tone: 'danger' })
    if (!ok) return
    setDeleting(true)
    try { await api(`/api/rooms/${room.id}`, { method: 'DELETE' }); toast('Room deleted.'); router.replace('/faculty/exams') } catch (err) { toast(errorMessage(err), 'error'); setDeleting(false) }
  }
  return (
    <View style={{ gap: 16 }}>
      <RoomForm key={room.updatedAt} initial={roomToValues(room)} submitLabel="Save changes" pool={{ mcq: room.mcqPoolSize, tf: room.tfPoolSize, coding: room.codingPoolSize }}
        onSubmit={async values => {
          const data = await api<{ room: Room }>(`/api/rooms/${room.id}`, { method: 'PATCH', body: valuesToPayload(values) })
          toast('Settings saved.')
          onSaved(data.room)
        }} />
      <Card tone="red" padded style={{ gap: 10 }}>
        <Text size={14} weight="semibold" tone="danger">Delete this room</Text>
        <Text size={13} tone="mutedForeground">Removes the room and every student&apos;s result. This can&apos;t be undone.</Text>
        <Button variant="destructive-outline" icon={Trash2} loading={deleting} onPress={remove}>{deleting ? 'Deleting…' : 'Delete room'}</Button>
      </Card>
    </View>
  )
}
