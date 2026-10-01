import { Image } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { Check, ChevronDown, Code2, Minus, PlayCircle, Save, X } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { AttemptStatusBadge, EVENT_ICONS, FlagChips, RiskBadge } from '@/components/common'
import { Alert, Badge, Button, Card, CardHeader, DetailRow, Divider, Field, Input, NumberInput, PageLoader, Screen, ScreenHeader, Segmented, Sheet, Text, useFeedback } from '@/components/ui'
import { api, errorMessage, formatDate, formatDuration, languageLabel, letter, type Sample } from '@/lib/api'
import { INTEGRITY_EVENTS, type Flags, type IntegrityEvent, type RiskLevel } from '@/lib/integrity'
import { radius, useColors } from '@/theme'

type Item =
  | { index: number; questionId: string; type: 'mcq' | 'tf'; text: string; imageUrl?: string; options: string[]; correctIndex: number | null; selected: number | null; explanation: string; marks?: number }
  | { index: number; questionId: string; type: 'coding'; title: string; text: string; imageUrl?: string; points: number; samples: Sample[]; answer: { language: string; code: string } | null; marks: number | null; feedback: string }
  | { index: number; questionId: string; type: 'removed'; text: string }
type CodingItem = Extract<Item, { type: 'coding' }>

type Detail = {
  room: { id: string; title: string; code: string; status: string; marksPerQuestion: number; negativeMarks: number; maxViolations: number }
  integrity: { flags: Flags; violations: number; score: number; level: RiskLevel; events: { type: IntegrityEvent; at: string; detail: string }[]; ipAddresses: string[]; userAgent: string }
  attempt: { id: string; studentName: string; studentEmail: string; rollNumber: string; prn: string; className: string; set: string; status: 'in_progress' | 'submitted'; autoSubmitted: boolean; autoSubmitReason: string; startedAt: string; submittedAt: string | null; tabSwitches: number; mcqScore: number; codingScore: number; codingPending: number; correctCount: number; wrongCount: number; score: number; maxScore: number }
  items: Item[]
}

export default function AttemptReview() {
  const { roomId, attemptId } = useLocalSearchParams<{ roomId: string; attemptId: string }>()
  const c = useColors()
  const { toast } = useFeedback()
  const [data, setData] = useState<Detail | null>(null)
  const [error, setError] = useState('')
  const [grades, setGrades] = useState<Record<string, { marks: string; feedback: string }>>({})
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'all' | 'wrong' | 'coding'>('all')
  const [reopenOpen, setReopenOpen] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [reopenMinutes, setReopenMinutes] = useState('15')

  const apply = useCallback((detail: Detail) => {
    setData(detail)
    setGrades(Object.fromEntries(detail.items.filter((i): i is CodingItem => i.type === 'coding').map(i => [i.questionId, { marks: i.marks?.toString() ?? '', feedback: i.feedback }])))
  }, [])
  const load = useCallback(() => api<Detail>(`/api/rooms/${roomId}/attempts/${attemptId}`).then(apply).catch(err => setError(errorMessage(err))), [roomId, attemptId, apply])
  useEffect(() => { load() }, [load])

  const coding = useMemo(() => (data?.items.filter((i): i is CodingItem => i.type === 'coding') ?? []), [data])
  const dirty = coding.some(i => (grades[i.questionId]?.marks ?? '') !== (i.marks?.toString() ?? '') || (grades[i.questionId]?.feedback ?? '') !== i.feedback)

  async function save() {
    setSaving(true)
    try {
      const marks = coding.map(i => ({ questionId: i.questionId, marks: grades[i.questionId]?.marks === '' ? null : Number(grades[i.questionId]?.marks), feedback: grades[i.questionId]?.feedback ?? '' }))
      apply(await api<Detail>(`/api/rooms/${roomId}/attempts/${attemptId}`, { method: 'PATCH', body: { marks } }))
      toast('Marks saved. The leaderboard is updated.')
    } catch (err) { toast(errorMessage(err), 'error') } finally { setSaving(false) }
  }
  async function reopen() {
    setReopening(true)
    try {
      apply(await api<Detail>(`/api/rooms/${roomId}/attempts/${attemptId}`, { method: 'PATCH', body: { action: 'reopen', minutes: Number(reopenMinutes) } }))
      setReopenOpen(false)
      toast(`${data?.attempt.studentName} can continue for ${reopenMinutes} minutes.`)
    } catch (err) { toast(errorMessage(err), 'error') } finally { setReopening(false) }
  }

  const header = <ScreenHeader title={data?.attempt.studentName ?? 'Student paper'} eyebrow={data?.room.title ?? 'Review'} />
  if (error) return <Screen header={header}><Alert>{error}</Alert></Screen>
  if (!data) return <Screen header={header}><PageLoader /></Screen>
  const { attempt, room, integrity } = data
  const items = data.items.filter(i => filter === 'all' || (filter === 'coding' ? i.type === 'coding' : (i.type === 'mcq' || i.type === 'tf') && i.selected !== i.correctIndex))
  const taken = attempt.submittedAt ? Math.round((new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000) : null

  return (
    <Screen header={header} onRefresh={load}>
      <View>
        <Text serif size={24} leading={30}>{attempt.studentName}</Text>
        <Text size={13} tone="mutedForeground" style={{ marginTop: 2 }}>{[attempt.set && `Set ${attempt.set}`, attempt.rollNumber && `Roll ${attempt.rollNumber}`, attempt.prn && `PRN ${attempt.prn}`, attempt.className, attempt.studentEmail].filter(Boolean).join(' · ')}</Text>
      </View>

      <Card padded>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Text size={34} weight="semibold" tabular leading={40}>{attempt.score}<Text size={16} tone="mutedForeground"> / {attempt.maxScore}</Text></Text>
          <AttemptStatusBadge {...attempt} />
        </View>
        <Divider style={{ marginVertical: 10 }} />
        <DetailRow label="MCQ score" value={attempt.mcqScore} />
        <DetailRow label="Correct / wrong" value={<Text size={13} weight="medium"><Text size={13} tone="success">{attempt.correctCount}</Text> / <Text size={13} tone="danger">{attempt.wrongCount}</Text></Text>} />
        <DetailRow label="Coding score" value={attempt.codingScore} />
        {attempt.codingPending > 0 && <DetailRow label="Still to grade" value={<Badge tone="violet">{attempt.codingPending}</Badge>} />}
        <DetailRow label="Started" value={formatDate(attempt.startedAt, true)} />
        <DetailRow label="Time taken" value={formatDuration(taken)} />
      </Card>

      {(attempt.status === 'submitted' && room.status !== 'closed') || coding.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {attempt.status === 'submitted' && room.status !== 'closed' && <Button variant="outline" icon={PlayCircle} style={{ flex: 1 }} onPress={() => setReopenOpen(true)}>Allow to continue</Button>}
          {coding.length > 0 && <Button icon={Save} style={{ flex: 1 }} disabled={!dirty} loading={saving} onPress={save}>{saving ? 'Saving…' : 'Save marks'}</Button>}
        </View>
      ) : null}

      <IntegrityReport integrity={integrity} maxViolations={room.maxViolations} autoSubmitReason={attempt.autoSubmitReason} />

      <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: `All ${data.items.length}` }, { value: 'wrong', label: 'Wrong/skipped' }, { value: 'coding', label: `Coding ${coding.length}` }]} />

      {items.length === 0 ? <Card padded><Text size={14} tone="mutedForeground" center>Nothing in this filter.</Text></Card> : items.map(item => (
        <Card key={item.index}>
          {item.type === 'removed' ? <Text size={14} tone="mutedForeground" style={{ padding: 16 }}>Q{item.index + 1}. {item.text}</Text> : item.type === 'coding' ? (
            <CodingReview item={item} grade={grades[item.questionId] ?? { marks: '', feedback: '' }} onGrade={value => setGrades(g => ({ ...g, [item.questionId]: value }))} />
          ) : (
            <View style={{ padding: 16, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <Text size={14} leading={21} style={{ flex: 1 }}><Text mono size={12} tone="subtle">Q{item.index + 1}  </Text>{item.text}</Text>
                {item.selected === null ? <Badge icon={Minus}>Skipped</Badge> : item.selected === item.correctIndex ? <Badge tone="green" icon={Check}>{`+${item.marks ?? room.marksPerQuestion}`}</Badge> : <Badge tone="red" icon={X}>{room.negativeMarks ? `−${room.negativeMarks}` : '0'}</Badge>}
              </View>
              {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: 170, borderRadius: radius.md }} contentFit="contain" /> : null}
              {item.options.map((option, i) => {
                const correct = i === item.correctIndex
                const chosen = i === item.selected
                return (
                  <View key={i} style={{ flexDirection: 'row', gap: 8, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 7, borderColor: correct ? c.successBorder : chosen ? c.dangerBorder : c.border, backgroundColor: correct ? c.successSoft : chosen ? c.dangerSoft : 'transparent' }}>
                    <Text mono size={12} weight="semibold" color={correct ? c.successInk : chosen ? c.dangerInk : c.mutedForeground}>{letter(i)}</Text>
                    <Text size={13} style={{ flex: 1 }} color={correct ? c.successInk : chosen ? c.dangerInk : c.mutedForeground}>{option}</Text>
                    {chosen && <Text size={10} weight="semibold" uppercase color={correct ? c.successInk : c.dangerInk}>Chosen</Text>}
                  </View>
                )
              })}
            </View>
          )}
        </Card>
      ))}

      <Sheet open={reopenOpen} onClose={() => setReopenOpen(false)} title={`Let ${attempt.studentName} continue?`}
        description="Use this after a wrongful auto-submit or a technical problem. The student keeps their answers and flags, and gets a new end time."
        footer={<>
          <Button variant="outline" style={{ flex: 1 }} onPress={() => setReopenOpen(false)}>Cancel</Button>
          <Button style={{ flex: 1 }} loading={reopening} onPress={reopen}>{`Allow ${reopenMinutes || 0} min`}</Button>
        </>}>
        <Field label="Minutes from now"><NumberInput keyboardType="number-pad" value={reopenMinutes} onChangeText={setReopenMinutes} /></Field>
      </Sheet>
    </Screen>
  )
}

function IntegrityReport({ integrity, maxViolations, autoSubmitReason }: { integrity: Detail['integrity']; maxViolations: number; autoSubmitReason: string }) {
  const c = useColors()
  const [showAll, setShowAll] = useState(false)
  const events = showAll ? integrity.events : integrity.events.slice(0, 8)
  return (
    <Card tone={integrity.level === 'high' ? 'red' : integrity.level === 'medium' ? 'amber' : undefined}>
      <CardHeader title="Integrity report" action={<RiskBadge level={integrity.level} score={integrity.score} />} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
        {autoSubmitReason === 'violations' && <Alert>{`Auto-submitted after reaching ${maxViolations} violations.`}</Alert>}
        <DetailRow label="Violations" value={`${integrity.violations}${maxViolations ? ` / ${maxViolations} limit` : ''}`} />
        {integrity.level === 'clean' ? <Text size={13} tone="success">No suspicious activity was recorded.</Text> : <FlagChips flags={integrity.flags} />}
        {integrity.events.length > 0 && (
          <View>
            <Text size={11} weight="semibold" tone="subtle" uppercase tracking={0.6} style={{ marginBottom: 8 }}>Timeline</Text>
            <View style={{ borderLeftWidth: 1, borderLeftColor: c.border, paddingLeft: 12, gap: 10 }}>
              {events.map((event, i) => {
                const Icon = EVENT_ICONS[event.type] ?? Check
                return (
                  <View key={i}>
                    <View style={{ position: 'absolute', left: -16.5, top: 5, width: 8, height: 8, borderRadius: 4, backgroundColor: INTEGRITY_EVENTS[event.type]?.violation ? c.danger : c.borderStrong }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon size={12} color={c.mutedForeground} /><Text size={12} weight="medium">{INTEGRITY_EVENTS[event.type]?.label ?? event.type}</Text></View>
                    <Text size={12} tone="mutedForeground">{new Date(event.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}{event.detail ? ` · ${event.detail}` : ''}</Text>
                  </View>
                )
              })}
            </View>
            {integrity.events.length > 8 && <Text size={12} weight="medium" tone="primary" style={{ marginTop: 8 }} onPress={() => setShowAll(v => !v)}>{showAll ? 'Show less' : `Show all ${integrity.events.length}`}</Text>}
          </View>
        )}
        <Divider />
        <Text size={12} tone="mutedForeground"><Text size={12} weight="medium">IP address{integrity.ipAddresses.length === 1 ? '' : 'es'}: </Text>{integrity.ipAddresses.join(', ') || '—'}</Text>
        {integrity.userAgent ? <Text size={12} tone="mutedForeground"><Text size={12} weight="medium">Device: </Text>{integrity.userAgent}</Text> : null}
      </View>
    </Card>
  )
}

function CodingReview({ item, grade, onGrade }: { item: CodingItem; grade: { marks: string; feedback: string }; onGrade: (value: { marks: string; feedback: string }) => void }) {
  const c = useColors()
  const [showStatement, setShowStatement] = useState(false)
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 16 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Code2 size={15} color={c.violet} /><Text size={14} weight="semibold" style={{ flex: 1 }}><Text mono size={12} tone="subtle">Q{item.index + 1} </Text>{item.title}</Text></View>
          <Pressable onPress={() => setShowStatement(v => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Text size={12} tone="primary">{showStatement ? 'Hide' : 'Show'} problem</Text>
            <ChevronDown size={12} color={c.primary} style={{ transform: [{ rotate: showStatement ? '180deg' : '0deg' }] }} />
          </Pressable>
        </View>
        {item.marks == null ? (item.answer ? <Badge tone="violet">Needs grading</Badge> : <Badge>Not attempted</Badge>) : <Badge tone="green">{`${item.marks} / ${item.points}`}</Badge>}
      </View>
      {showStatement && <Text size={13} leading={19} style={{ paddingHorizontal: 16, paddingBottom: 12, backgroundColor: c.muted, paddingTop: 10 }}>{item.text}</Text>}
      {item.answer ? (
        <View style={{ backgroundColor: '#1e1e1e' }}>
          <Text size={11} color="rgba(255,255,255,0.65)" style={{ backgroundColor: '#252526', paddingHorizontal: 12, paddingVertical: 5 }}>{languageLabel(item.answer.language)} · {item.answer.code.split('\n').length} lines</Text>
          <Text mono size={12} color="#d4d4d4" selectable style={{ padding: 12 }}>{item.answer.code}</Text>
        </View>
      ) : <Text size={13} tone="mutedForeground" center style={{ paddingVertical: 16 }}>No code was written for this problem.</Text>}
      <View style={{ flexDirection: 'row', gap: 12, padding: 16 }}>
        <Field label={`Marks / ${item.points}`} style={{ width: 110 }}><NumberInput value={grade.marks} onChangeText={v => onGrade({ ...grade, marks: v })} placeholder="—" /></Field>
        <Field label="Feedback" style={{ flex: 1 }}><Input value={grade.feedback} onChangeText={v => onGrade({ ...grade, feedback: v })} placeholder="Optional, visible to student" /></Field>
      </View>
    </View>
  )
}
