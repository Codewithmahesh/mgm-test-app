import { Clock3, Code2, Layers, ListChecks, Scale, Shuffle, Trophy } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { api, type Classroom, type Room } from '@/lib/api'
import { paperMarks, setNames } from '@/lib/bloom'
import { BloomPlanEditor, draftCount, draftToPlan, emptyPlanDraft, planToDraft, type PlanDraft } from './bloom-plan'
import { DateTimeField } from './date-time-field'
import { Alert, Button, Card, CardHeader, Checkbox, Choice, DetailRow, Divider, Field, Input, NumberInput, Select, Text, Textarea, Toggle, useFeedback } from './ui'
import { useColors } from '@/theme'

export type RoomFormValues = {
  title: string
  description: string
  instructions: string
  durationMinutes: string
  questionsPerStudent: string
  /** Empty on older rooms that still count True/False questions as MCQs. */
  tfQuestions: string
  codingQuestions: string
  marksPerQuestion: string
  negativeMarks: string
  codingMarks: string
  startsAt: Date | null
  autoOpen: boolean
  showResults: Room['showResults']
  allowedClassrooms: string[]
  requireFullscreen: boolean
  blockCopyPaste: boolean
  maxViolations: string
  requireApproval: boolean
  paperMode: 'random' | 'sets'
  setCount: string
  bloomMode: 'auto' | 'plan'
  bloomPlan: PlanDraft
}

const DEFAULT_INSTRUCTIONS = [
  'Do not switch tabs or windows during the exam; every switch is recorded.',
  'Answers are saved automatically. You can move between questions freely.',
  'The exam submits itself when the timer reaches zero.',
  'Coding answers are reviewed and graded by your faculty after the exam.',
].join('\n')

export function emptyRoomValues(): RoomFormValues {
  return { title: '', description: '', instructions: DEFAULT_INSTRUCTIONS, durationMinutes: '60', questionsPerStudent: '20', tfQuestions: '0', codingQuestions: '0', marksPerQuestion: '1', negativeMarks: '0', codingMarks: '10', startsAt: null, autoOpen: true, showResults: 'after_end', allowedClassrooms: [], requireFullscreen: true, blockCopyPaste: true, maxViolations: '0', requireApproval: true, paperMode: 'random', setCount: '3', bloomMode: 'auto', bloomPlan: emptyPlanDraft() }
}

export function roomToValues(room: Room): RoomFormValues {
  return {
    title: room.title, description: room.description, instructions: room.instructions,
    durationMinutes: String(room.durationMinutes), questionsPerStudent: String(room.questionsPerStudent), tfQuestions: room.tfSeparate ? String(room.tfQuestions) : '', codingQuestions: String(room.codingQuestions),
    marksPerQuestion: String(room.marksPerQuestion), negativeMarks: String(room.negativeMarks), codingMarks: String(room.codingMarks),
    startsAt: room.startsAt ? new Date(room.startsAt) : null, autoOpen: room.autoOpen, showResults: room.showResults, allowedClassrooms: room.allowedClassrooms,
    requireFullscreen: room.requireFullscreen, blockCopyPaste: room.blockCopyPaste, maxViolations: String(room.maxViolations), requireApproval: room.requireApproval,
    paperMode: room.paperMode, setCount: String(room.setCount || 3),
    bloomMode: room.bloomPlan.length ? 'plan' : 'auto', bloomPlan: planToDraft(room.bloomPlan, room.marksPerQuestion),
  }
}

/** Same body the website sends to POST /api/rooms and PATCH /api/rooms/:id. */
export function valuesToPayload(values: RoomFormValues) {
  const { bloomMode, bloomPlan, tfQuestions, ...rest } = values
  return {
    ...rest,
    // Left empty on an older room: it keeps counting True/False questions as MCQs.
    ...(tfQuestions.trim() ? { tfQuestions: Number(tfQuestions) || 0 } : {}),
    durationMinutes: Number(values.durationMinutes), questionsPerStudent: Number(values.questionsPerStudent), codingQuestions: Number(values.codingQuestions),
    marksPerQuestion: Number(values.marksPerQuestion), negativeMarks: Number(values.negativeMarks), codingMarks: Number(values.codingMarks),
    maxViolations: Number(values.maxViolations) || 0,
    paperMode: values.paperMode,
    setCount: values.paperMode === 'sets' ? Number(values.setCount) || 0 : 0,
    bloomPlan: bloomMode === 'plan' ? draftToPlan(bloomPlan) : [],
    startsAt: values.startsAt ? values.startsAt.toISOString() : null,
    autoOpen: Boolean(values.startsAt) && values.autoOpen,
  }
}

export function RoomForm({ initial, submitLabel, onSubmit, pool }: { initial: RoomFormValues; submitLabel: string; onSubmit: (values: RoomFormValues) => Promise<void>; pool?: { mcq: number; tf?: number; coding: number } }) {
  const c = useColors()
  const { confirm } = useFeedback()
  const [values, setValues] = useState(initial)
  const [accessMode, setAccessMode] = useState<'specific' | 'all'>(() => (initial.title && initial.allowedClassrooms.length === 0 ? 'all' : 'specific'))
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { api<{ classrooms: Classroom[] }>('/api/classrooms').then(d => setClassrooms(d.classrooms)).catch(() => {}) }, [])

  const set = <K extends keyof RoomFormValues>(key: K, value: RoomFormValues[K]) => setValues(current => ({ ...current, [key]: value }))
  const text = (key: keyof RoomFormValues) => (value: string) => set(key, value as never)
  const usePlan = values.bloomMode === 'plan'
  const mcq = Number(values.questionsPerStudent) || 0
  const tf = Number(values.tfQuestions) || 0
  const coding = Number(values.codingQuestions) || 0
  const plan = usePlan ? draftToPlan(values.bloomPlan) : []
  const marks = paperMarks({ questionsPerStudent: mcq, tfQuestions: tf, marksPerQuestion: Number(values.marksPerQuestion) || 0, codingQuestions: coding, codingMarks: Number(values.codingMarks) || 0, bloomPlan: plan })
  const sets = values.paperMode === 'sets' ? Number(values.setCount) || 0 : 0
  const planOver = usePlan && draftCount(values.bloomPlan) > mcq
  const startChanged = values.startsAt?.getTime() !== initial.startsAt?.getTime()

  async function submit() {
    setError('')
    if (!values.title.trim()) return setError('Give the exam a name.')
    if (!values.startsAt) return setError('Choose when the exam starts.')
    if (startChanged && values.startsAt.getTime() < Date.now() - 60_000) return setError('The start time is in the past. Choose a time from now on.')
    if (mcq + coding === 0) return setError('Each student needs at least one MCQ or coding problem.')
    if (planOver) return setError(`The Bloom levels add up to ${draftCount(values.bloomPlan)} questions but each student gets ${mcq}. Increase the question count or lower a level.`)
    if (values.paperMode === 'sets' && (sets < 2 || sets > 26)) return setError('Choose between 2 and 26 sets, or switch to random papers.')
    if (accessMode === 'specific' && values.allowedClassrooms.length === 0) return setError('Please select at least one class for this exam, or choose "All students".')
    const assigned = usePlan ? draftCount(values.bloomPlan) : mcq
    if (usePlan && assigned < mcq && !(await confirm({
      title: 'Bloom plan has unassigned questions',
      description: `Your plan assigns ${assigned} of ${mcq} MCQs. The remaining ${mcq - assigned} will be balanced across Bloom's levels. Continue?`,
      confirmLabel: 'Continue',
      cancelLabel: 'Review plan',
    }))) return
    setSaving(true)
    try {
      await onSubmit({ ...values, allowedClassrooms: accessMode === 'all' ? [] : values.allowedClassrooms })
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save.') } finally { setSaving(false) }
  }

  return (
    <View style={{ gap: 16 }}>
      <Card>
        <CardHeader title="Details" description="What students see before they start." />
        <View style={{ gap: 14, paddingHorizontal: 16, paddingBottom: 16 }}>
          <Field label="Exam name" required><Input value={values.title} onChangeText={text('title')} placeholder="e.g. Data Structures — Mid-Semester Test" /></Field>
          <Field label="Short description"><Input value={values.description} onChangeText={text('description')} placeholder="Units 1–3: arrays, linked lists, stacks and queues" /></Field>
          <Field label="Instructions" hint="One rule per line. Shown on the start screen."><Textarea rows={5} value={values.instructions} onChangeText={text('instructions')} /></Field>
        </View>
      </Card>

      <Card>
        <CardHeader title="Paper and timing" description="How many questions each student gets, and how they're marked." />
        <View style={{ gap: 14, paddingHorizontal: 16, paddingBottom: 16 }}>
          <Pair>
            <Field label="Duration (min)" required style={{ flex: 1 }}><NumberInput keyboardType="number-pad" value={values.durationMinutes} onChangeText={text('durationMinutes')} /></Field>
            <Field label="MCQs per student" required style={{ flex: 1 }} hint={pool ? `${pool.mcq} in pool` : undefined}><NumberInput keyboardType="number-pad" value={values.questionsPerStudent} onChangeText={text('questionsPerStudent')} /></Field>
          </Pair>
          <Pair>
            <Field label="True / False per student" style={{ flex: 1 }} hint={values.tfQuestions.trim() === '' ? 'Empty: counted with MCQs, as before.' : pool ? `${pool.tf ?? 0} in pool` : undefined}><NumberInput keyboardType="number-pad" value={values.tfQuestions} placeholder="With MCQs" onChangeText={text('tfQuestions')} /></Field>
            <View style={{ flex: 1 }} />
          </Pair>
          <Pair>
            <Field label="Marks per MCQ / T-F" style={{ flex: 1 }} hint={usePlan ? 'For questions outside the Bloom plan.' : undefined}><NumberInput value={values.marksPerQuestion} onChangeText={text('marksPerQuestion')} /></Field>
            <Field label="Negative per wrong" style={{ flex: 1 }} hint="0 = no negative marking."><NumberInput value={values.negativeMarks} onChangeText={text('negativeMarks')} /></Field>
          </Pair>
          <Pair>
            <Field label="Coding per student" style={{ flex: 1 }} hint={pool ? `${pool.coding} in pool` : 'Answered on a computer.'}><NumberInput keyboardType="number-pad" value={values.codingQuestions} onChangeText={text('codingQuestions')} /></Field>
            <Field label="Marks per coding" style={{ flex: 1 }} hint="A problem can set its own."><NumberInput value={values.codingMarks} onChangeText={text('codingMarks')} /></Field>
          </Pair>
        </View>
      </Card>

      <Card>
        <CardHeader title="How each paper is made" description="Every student gets the same number of questions at each Bloom's level, so no one gets an easier or harder paper." />
        <View style={{ gap: 12, paddingHorizontal: 16, paddingBottom: 16 }}>
          <Choice selected={values.paperMode === 'random'} onSelect={() => set('paperMode', 'random')} icon={Shuffle} title="Random from the pool" text="Each student gets a different random paper drawn from all the room's questions." />
          <Choice selected={values.paperMode === 'sets'} onSelect={() => set('paperMode', 'sets')} icon={Layers} title="Question sets (A, B, C…)" text="You make a fixed number of sets; students get them in turn. Their set is revealed after they submit." />
          {values.paperMode === 'sets' && (
            <View style={{ gap: 8, borderRadius: 10, borderWidth: 1, borderColor: c.primaryBorder, backgroundColor: c.primarySoft, padding: 12 }}>
              <Field label="How many sets?" required style={{ width: 140 }}><NumberInput keyboardType="number-pad" value={values.setCount} onChangeText={text('setCount')} /></Field>
              <Text size={13} tone="mutedForeground" leading={19}>
                {sets >= 2 ? `Sets ${setNames(sets).join(', ')}, each with ${mcq} MCQs${coding ? ` + ${coding} coding` : ''}. The pool needs ${sets * mcq} MCQs${coding ? ` and ${sets * coding} coding problems` : ''} tagged by set, or generate them in sets with AI.` : 'Enter 2 or more.'}
              </Text>
            </View>
          )}
          <Text size={13} weight="medium" style={{ marginTop: 6 }}>Bloom&apos;s taxonomy levels (MCQs)</Text>
          <Choice selected={!usePlan} onSelect={() => set('bloomMode', 'auto')} icon={Scale} title="Balanced automatically" text="Every paper follows the pool's mix of levels, with the same counts for everyone and the same marks per MCQ." />
          <Choice selected={usePlan} onSelect={() => set('bloomMode', 'plan')} icon={ListChecks} title="Questions and marks per level" text="You choose how many questions of each level every student gets, and the marks for each level." />
          {usePlan && <BloomPlanEditor total={mcq} onTotalChange={total => set('questionsPerStudent', String(total))} draft={values.bloomPlan} onChange={draft => set('bloomPlan', draft)} defaultMarks={Number(values.marksPerQuestion) || 0} unit={values.paperMode === 'sets' ? 'set' : 'paper'} />}
        </View>
      </Card>

      <Card>
        <CardHeader title="Proctoring" description="Every rule break is recorded and shown to you as flags on the student's result." />
        <View style={{ gap: 16, paddingHorizontal: 16, paddingBottom: 16 }}>
          <Toggle value={values.requireApproval} onChange={v => set('requireApproval', v)} title="Waiting room — admit students yourself" text="Students request to join with the room code and wait until you admit them (one by one or all at once)." />
          <Toggle value={values.requireFullscreen} onChange={v => set('requireFullscreen', v)} title="Require fullscreen" text="On computers, students must stay in fullscreen; leaving it is flagged. On phones, the status bar is hidden and leaving the app is flagged." />
          <Toggle value={values.blockCopyPaste} onChange={v => set('blockCopyPaste', v)} title="Block copy, paste and right-click" text="Stops copying questions out and pasting answers in." />
          <Field label="Auto-submit after this many violations" hint="Leaving the exam, pasting, developer-tool shortcuts and opening a second device each count. 0 = never auto-submit (flag only).">
            <NumberInput keyboardType="number-pad" value={values.maxViolations} onChangeText={text('maxViolations')} style={{ width: 120 }} />
          </Field>
          <View style={{ borderRadius: 8, backgroundColor: c.muted, padding: 10 }}>
            <Text size={12} tone="mutedForeground" leading={17}>Always on: one active device per student, app and tab-switch tracking, screenshot blocking on phones, IP logging, a watermark with the student&apos;s email, server-side timer, and randomised papers.</Text>
          </View>
        </View>
      </Card>

      <Card>
        <CardHeader title="Schedule" description="When the exam starts, and whether the room opens by itself. We email you when it's scheduled and again 20 minutes before it starts." />
        <View style={{ gap: 16, paddingHorizontal: 16, paddingBottom: 16 }}>
          <Field label="Start time" required hint="Students can't start before this, even if the room is open.">
            <DateTimeField value={values.startsAt} onChange={date => set('startsAt', date)} minimumDate={startChanged || !initial.startsAt ? new Date() : undefined} />
          </Field>
          <Toggle value={Boolean(values.startsAt) && values.autoOpen} disabled={!values.startsAt} onChange={v => set('autoOpen', v)} title="Open the room automatically at the start time"
            text={!values.startsAt ? 'Set a start time above to use this.' : values.autoOpen ? "The room opens for students by itself at the start time. If it isn't ready (for example, too few questions), we email you instead." : "You'll open the room yourself; the 20-minute reminder email will ask you to."} />
        </View>
      </Card>

      <Card>
        <CardHeader title="Access and results" />
        <View style={{ gap: 12, paddingHorizontal: 16, paddingBottom: 16 }}>
          <Text size={13} weight="medium">Who can take this exam</Text>
          <Choice selected={accessMode === 'specific'} onSelect={() => setAccessMode('specific')} icon={ListChecks} title="Specific classes only" text="Restrict to selected departments & divisions" />
          <Choice selected={accessMode === 'all'} onSelect={() => { setAccessMode('all'); set('allowedClassrooms', []) }} icon={Shuffle} title="All students (open to all)" text="Any registered student with the room code can join" />
          {accessMode === 'specific' && (
            <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 12, gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text size={12} tone="mutedForeground">{values.allowedClassrooms.length} of {classrooms.length} classes selected</Text>
                <View style={{ flexDirection: 'row', gap: 14 }}>
                  <Text size={12} weight="medium" tone="primary" onPress={() => set('allowedClassrooms', classrooms.map(cl => cl.id))}>Select all</Text>
                  <Text size={12} weight="medium" tone="mutedForeground" onPress={() => set('allowedClassrooms', [])}>Clear</Text>
                </View>
              </View>
              <Divider />
              {classrooms.length === 0 ? <Text size={13} tone="mutedForeground">No classes created yet.</Text> : classrooms.map(classroom => {
                const checked = values.allowedClassrooms.includes(classroom.id)
                return (
                  <Checkbox key={classroom.id} checked={checked}
                    onChange={() => set('allowedClassrooms', checked ? values.allowedClassrooms.filter(id => id !== classroom.id) : [...values.allowedClassrooms, classroom.id])}
                    label={<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text size={14} weight="medium">{classroom.label}</Text><Text size={12} tone="mutedForeground">{classroom.students}</Text></View>} />
                )
              })}
            </View>
          )}
          <Field label="Show students their score" style={{ marginTop: 6 }}>
            <Select title="Show students their score" value={values.showResults} onChange={v => set('showResults', v)} options={[
              { value: 'after_end', label: 'After the exam ends (recommended)' },
              { value: 'after_submit', label: 'Right after they submit' },
              { value: 'never', label: "Don't show scores" },
            ]} />
          </Field>
        </View>
      </Card>

      <Card>
        <CardHeader title="Summary" />
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <DetailRow icon={Clock3} label="Duration" value={`${values.durationMinutes || 0} min`} />
          <DetailRow icon={ListChecks} label="MCQs" value={usePlan ? `${mcq} · ${marks.mcq} marks` : `${mcq} × ${values.marksPerQuestion || 0}`} />
          <DetailRow icon={Code2} label="Coding" value={`${coding} × ${values.codingMarks || 0}`} />
          {sets >= 2 && <DetailRow icon={Layers} label="Sets" value={`${sets} (${setNames(sets)[0]}–${setNames(sets)[sets - 1]})`} />}
          <Divider style={{ marginVertical: 6 }} />
          <DetailRow icon={Trophy} label="Total marks" value={<Text size={16} weight="semibold" tabular>{marks.total}</Text>} />
          {Number(values.negativeMarks) > 0 && <Text size={12} tone="warning" style={{ marginTop: 4 }}>−{values.negativeMarks} for each wrong MCQ</Text>}
        </View>
      </Card>

      {error ? <Alert>{error}</Alert> : null}
      <Button size="lg" full loading={saving} onPress={submit}>{saving ? 'Saving…' : submitLabel}</Button>
    </View>
  )
}

function Pair({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>{children}</View>
}
