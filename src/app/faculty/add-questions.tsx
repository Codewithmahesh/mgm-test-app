import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import { router, useLocalSearchParams } from 'expo-router'
import { ArrowLeft, BookOpen, CheckCircle2, FileText, FileUp, Layers, Mail, PenLine, Pencil, Plus, Search, Sparkles, Trash2, Upload, Wand2, X, type LucideIcon } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { BloomPlanEditor, draftCount, draftToPlan, emptyPlanDraft, planToDraft, type PlanDraft } from '@/components/bloom-plan'
import { GenerationProgress, type GenerationPlan } from '@/components/generation-progress'
import { QuestionCard } from '@/components/question-card'
import { QuestionEditor, blankQuestion } from '@/components/question-editor'
import { Alert, Button, Card, Checkbox, Divider, Field, IconButton, IconTile, Input, NumberInput, PageLoader, Screen, ScreenHeader, Segmented, Select, Sheet, Spinner, Text, Textarea, useFeedback } from '@/components/ui'
import { api, errorMessage, type BankQuestion, type DraftQuestion, type Room } from '@/lib/api'
import { BLOOM_INFO, BLOOM_LEVELS, setNames as letterSets, splitByShares, type BloomLevel } from '@/lib/bloom'
import { useSession } from '@/lib/session'
import { radius, useColors } from '@/theme'

type Method = 'ai' | 'csv' | 'manual' | 'bank'
type Defaults = { mcq: number; coding: number; marks: number; bloomPlan: Room['bloomPlan']; setCount: number }

export default function AddQuestions() {
  const params = useLocalSearchParams<{ roomId?: string; method?: Method; reviewJob?: string }>()
  const roomId = params.roomId || null
  const c = useColors()
  const { toast, confirm } = useFeedback()
  const [method, setMethod] = useState<Method>(params.method ?? 'ai')
  const [defaults, setDefaults] = useState<Defaults | null>(null)
  const [drafts, setDrafts] = useState<DraftQuestion[]>([])
  const [source, setSource] = useState<'ai' | 'csv' | 'manual'>('manual')
  const [editing, setEditing] = useState<{ index: number | null; question: DraftQuestion } | null>(null)
  const [saving, setSaving] = useState(false)
  const [skipped, setSkipped] = useState<string[]>([])
  const [plan, setPlan] = useState<GenerationPlan | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [loadingReview, setLoadingReview] = useState(Boolean(params.reviewJob))
  const [roomTitle, setRoomTitle] = useState('')

  // The room's paper settings are the AI generator's starting values.
  useEffect(() => {
    if (!roomId) return
    api<{ room: Room }>(`/api/rooms/${roomId}`).then(({ room }) => {
      setRoomTitle(room.title)
      setDefaults({ mcq: room.questionsPerStudent, coding: room.codingQuestions, marks: room.marksPerQuestion, bloomPlan: room.bloomPlan, setCount: room.setCount })
    }).catch(() => {})
  }, [roomId])

  // Opened from AI generations: review a finished batch.
  useEffect(() => {
    if (!params.reviewJob) return
    api<{ job: { status: string; error: string }; questions?: DraftQuestion[]; plan?: GenerationPlan }>(`/api/generation-jobs/${params.reviewJob}`)
      .then(data => {
        if (!data.questions?.length) { toast(data.job.error || 'These questions are not ready yet.', 'error'); router.back(); return }
        setDrafts(data.questions.map(q => ({ ...q, set: q.set ?? '' }))); setSource('ai'); setPlan(data.plan ?? null); setJobId(params.reviewJob!)
      })
      .catch(err => { toast(errorMessage(err), 'error'); router.back() })
      .finally(() => setLoadingReview(false))
  }, [params.reviewJob, toast])

  const reviewing = drafts.length > 0
  const receive = (questions: DraftQuestion[], from: 'ai' | 'csv' | 'manual', errors: string[] = []) => { setDrafts(list => [...list, ...questions]); setSource(from); setSkipped(errors) }

  async function saveDrafts() {
    setSaving(true)
    try {
      const data = await api<{ saved: number; errors: string[] }>('/api/questions', { body: { questions: drafts, room: roomId, source } })
      let applied = ''
      if (roomId && plan?.applyToRoom) {
        try {
          await api(`/api/rooms/${roomId}`, { method: 'PATCH', body: {
            ...(plan.sets.length ? { paperMode: 'sets', setCount: plan.sets.length } : {}),
            questionsPerStudent: plan.mcqPerSet, codingQuestions: plan.codingPerSet,
            ...(plan.bloomPlan ? { bloomPlan: plan.bloomPlan } : {}),
          } })
          applied = plan.sets.length ? ` Each student now gets one of sets ${plan.sets.join(', ')}.` : " Every paper now uses this Bloom's level plan."
        } catch (err) { toast(`Questions saved, but the room settings were not updated: ${errorMessage(err)}`, 'error') }
      }
      if (jobId) await api(`/api/generation-jobs/${jobId}`, { method: 'PATCH', body: { action: 'saved' } }).catch(() => {})
      toast(`${data.saved} question${data.saved === 1 ? '' : 's'} added${roomId ? ' to the room' : ' to your bank'}.${applied}`)
      router.back()
    } catch (err) { toast(errorMessage(err), 'error') } finally { setSaving(false) }
  }

  async function close() {
    if (reviewing && !(await confirm({ title: 'Discard these questions?', description: `${drafts.length} question${drafts.length === 1 ? ' has' : 's have'} not been saved yet.`, confirmLabel: 'Discard', cancelLabel: 'Keep reviewing', tone: 'danger' }))) return
    router.back()
  }

  const mcqs = drafts.filter(q => q.type !== 'coding').length
  const draftSets = [...new Set(drafts.map(q => q.set).filter(Boolean))].sort()
  const methods: { value: Method; label: string; icon: LucideIcon; hint: string }[] = [
    { value: 'ai', label: 'Generate with AI', icon: Sparkles, hint: 'From PDFs, Word/LaTeX files, notes or a topic' },
    { value: 'csv', label: 'Upload CSV', icon: FileUp, hint: 'Import a spreadsheet' },
    { value: 'manual', label: 'Write manually', icon: PenLine, hint: 'MCQ, true/false or coding' },
    ...(roomId ? [{ value: 'bank' as const, label: 'From question bank', icon: BookOpen, hint: 'Reuse earlier questions' }] : []),
  ]

  return (
    <Screen header={<ScreenHeader title={reviewing ? `Review ${drafts.length} question${drafts.length === 1 ? '' : 's'}` : 'Add questions'} eyebrow={roomTitle || 'Question bank'} back={false}
      right={<IconButton icon={X} label="Close" onPress={close} />} />}>
      {loadingReview ? <PageLoader /> : reviewing ? (
        <>
          <Text size={14} tone="mutedForeground">Edit or remove anything before saving. Nothing is saved until you confirm.</Text>
          <Pressable onPress={() => { setDrafts([]); setSkipped([]); setPlan(null); setJobId(null) }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={14} color={c.mutedForeground} /><Text size={13} tone="mutedForeground">Start over</Text>
          </Pressable>
          {skipped.length > 0 && (
            <Alert tone="amber">
              <Text size={13} weight="medium" tone="warningInk">{skipped.length} row{skipped.length === 1 ? '' : 's'} skipped</Text>
              {skipped.slice(0, 12).map(item => <Text key={item} size={12} tone="warningInk">• {item}</Text>)}
            </Alert>
          )}
          <Card>
            {drafts.map((question, index) => (
              <View key={index}>
                {draftSets.length > 0 && question.set !== drafts[index - 1]?.set && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: c.muted }}>
                    <Layers size={13} color={c.primary} />
                    <Text size={12} weight="semibold">{question.set ? `Set ${question.set}` : 'Common to every set'}</Text>
                  </View>
                )}
                {index > 0 && <Divider />}
                <QuestionCard question={question} index={index} actions={<>
                  <IconButton icon={Pencil} label="Edit" size={32} onPress={() => setEditing({ index, question })} />
                  <IconButton icon={Trash2} label="Remove" size={32} onPress={() => setDrafts(list => list.filter((_, i) => i !== index))} />
                </>} />
              </View>
            ))}
          </Card>
          <Text size={13} tone="mutedForeground" center>{mcqs} MCQ · {drafts.length - mcqs} coding{draftSets.length ? ` · ${draftSets.map(s => `Set ${s}: ${drafts.filter(q => q.set === s).length}`).join(' · ')}` : ''}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button variant="outline" icon={Plus} style={{ flex: 1 }} onPress={() => setEditing({ index: null, question: blankQuestion() })}>Add another</Button>
            <Button style={{ flex: 1.4 }} loading={saving} onPress={saveDrafts}>{saving ? 'Saving…' : `Save ${drafts.length}`}</Button>
          </View>
        </>
      ) : (
        <>
          <View style={{ gap: 8 }}>
            {methods.map(item => {
              const active = method === item.value
              return (
                <Pressable key={item.value} onPress={() => setMethod(item.value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: radius.lg, padding: 12, borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primarySoft : c.card }}>
                  <IconTile icon={item.icon} tone={active ? 'blue' : 'neutral'} size={34} />
                  <View style={{ flex: 1 }}>
                    <Text size={14} weight="semibold" color={active ? c.primaryInk : undefined}>{item.label}</Text>
                    <Text size={12} tone="mutedForeground">{item.hint}</Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
          <Divider />
          {method === 'ai' && (roomId && !defaults ? <PageLoader /> : <AiGenerator key={roomId ?? 'bank'} defaults={defaults} roomId={roomId} onResult={(questions, next, id) => { receive(questions, 'ai'); setPlan(next); setJobId(id) }} />)}
          {method === 'csv' && <CsvImport onResult={(questions, errors) => receive(questions, 'csv', errors)} />}
          {method === 'manual' && (
            <View style={{ gap: 10 }}>
              {(['mcq', 'tf', 'coding'] as const).map(type => (
                <Pressable key={type} onPress={() => setEditing({ index: null, question: blankQuestion(type) })} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: radius.lg, padding: 14, borderColor: pressed ? c.primary : c.border, backgroundColor: pressed ? c.primarySoft : c.card })}>
                  {type === 'coding' ? <FileText size={20} color={c.violet} /> : <PenLine size={20} color={c.primary} />}
                  <View style={{ flex: 1 }}>
                    <Text size={14} weight="semibold">{type === 'mcq' ? 'Multiple choice' : type === 'tf' ? 'True / False' : 'Coding problem'}</Text>
                    <Text size={12} tone="mutedForeground">{type === 'coding' ? 'Statement, formats, constraints and samples' : type === 'tf' ? 'A statement that is true or false' : 'Up to six options, one correct'}</Text>
                  </View>
                  <Plus size={18} color={c.subtle} />
                </Pressable>
              ))}
            </View>
          )}
          {method === 'bank' && roomId && <BankPicker roomId={roomId} onAdded={count => { toast(`${count} question${count === 1 ? '' : 's'} copied into the room.`); router.back() }} />}
        </>
      )}

      <QuestionEditor open={Boolean(editing)} initial={editing?.question ?? null} title={editing?.index == null ? 'New question' : 'Edit question'} onClose={() => setEditing(null)}
        onSave={question => {
          if (editing?.index == null) { setDrafts(list => [...list, question]); if (!drafts.length) setSource('manual') }
          else setDrafts(list => list.map((q, i) => (i === editing.index ? question : q)))
        }} />
    </Screen>
  )
}

/* ---------------- AI ---------------- */

type BloomMode = 'mixed' | 'custom' | BloomLevel
type PickedFile = { uri: string; name: string; size: number; mimeType: string }
const SOURCE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/x-tex', 'text/x-tex', 'application/octet-stream']
const SOURCE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.tex']
const MAX_FILES = 10
const MAX_FILES_BYTES = 4 * 1024 * 1024
const MAX_SETS = 20
const MAX_TOTAL_MCQ = 1000
const MAX_TOTAL_CODING = 100

function AiGenerator({ defaults, roomId, onResult }: { defaults: Defaults | null; roomId: string | null; onResult: (questions: DraftQuestion[], plan: GenerationPlan, jobId: string) => void }) {
  const c = useColors()
  const { confirm } = useFeedback()
  const { teacher } = useSession()
  const inRoom = Boolean(roomId)
  const [mode, setMode] = useState<'pdf' | 'text' | 'topic'>('pdf')
  const [files, setFiles] = useState<PickedFile[]>([])
  const [text, setText] = useState('')
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [mcqCount, setMcqCount] = useState(String(Math.min(defaults?.mcq || 10, 120)))
  const [codingCount, setCodingCount] = useState(String(Math.min(defaults?.coding ?? 0, MAX_TOTAL_CODING)))
  const [bloomMode, setBloomMode] = useState<BloomMode>(defaults?.bloomPlan?.length ? 'custom' : 'mixed')
  const [draft, setDraft] = useState<PlanDraft>(() => (defaults?.bloomPlan?.length ? planToDraft(defaults.bloomPlan, defaults.marks) : emptyPlanDraft(defaults?.marks ?? 1)))
  const [useSets, setUseSets] = useState((defaults?.setCount ?? 0) >= 2)
  const [setCountText, setSetCountText] = useState(String(defaults?.setCount && defaults.setCount >= 2 ? defaults.setCount : 3))
  const [applyToRoom, setApplyToRoom] = useState(true)
  const [starting, setStarting] = useState(false)
  const [running, setRunning] = useState<{ jobId: string; total: number } | null>(null)
  const [inBackground, setInBackground] = useState(false)
  const [error, setError] = useState('')

  const perSetMcq = Math.max(0, Math.round(Number(mcqCount) || 0))
  const perSetCoding = Math.max(0, Math.round(Number(codingCount) || 0))
  const sets = useSets ? Math.max(0, Math.round(Number(setCountText) || 0)) : 1
  const custom = bloomMode === 'custom'
  const levels = custom
    ? (() => { const planned = BLOOM_LEVELS.map(level => Math.max(0, Math.round(Number(draft[level].count) || 0))); const extra = splitByShares(Math.max(0, perSetMcq - draftCount(draft))); return planned.map((n, i) => n + extra[i]) })()
    : bloomMode === 'mixed' ? splitByShares(perSetMcq) : BLOOM_LEVELS.map(level => (level === bloomMode ? perSetMcq : 0))
  const totalMcq = perSetMcq * Math.max(1, sets)
  const totalCoding = perSetCoding * Math.max(1, sets)
  const letters = letterSets(sets)
  const canApply = inRoom && (useSets || custom)
  const filesSize = files.reduce((sum, f) => sum + f.size, 0)

  async function pickFiles() {
    setError('')
    const result = await DocumentPicker.getDocumentAsync({ type: SOURCE_TYPES, multiple: true, copyToCacheDirectory: true })
    if (result.canceled) return
    const next = [...files]
    for (const asset of result.assets) {
      if (!SOURCE_EXTENSIONS.some(ext => asset.name.toLowerCase().endsWith(ext))) { setError(`${asset.name}: only PDF, Word (.doc, .docx) and LaTeX (.tex) files are supported.`); continue }
      if (next.some(f => f.name === asset.name && f.size === (asset.size ?? 0))) continue
      next.push({ uri: asset.uri, name: asset.name, size: asset.size ?? 0, mimeType: asset.mimeType ?? 'application/octet-stream' })
    }
    if (next.length > MAX_FILES) return setError(`Upload at most ${MAX_FILES} files at a time.`)
    if (next.reduce((sum, f) => sum + f.size, 0) > MAX_FILES_BYTES) return setError('The files add up to more than 4 MB. Remove some or compress them first.')
    setFiles(next)
  }

  async function generate() {
    setError('')
    if (mode === 'pdf' && !files.length) return setError('Choose at least one file first.')
    if (mode === 'text' && text.trim().length < 50) return setError('Paste at least a paragraph of content.')
    if (mode === 'topic' && !topic.trim() && !description.trim()) return setError('Enter a topic or instructions.')
    if (perSetMcq + perSetCoding === 0) return setError('Ask for at least one question.')
    if (custom && draftCount(draft) > perSetMcq) return setError(`The Bloom levels add up to ${draftCount(draft)} questions but you asked for ${perSetMcq}.`)
    const assigned = custom ? draftCount(draft) : perSetMcq
    if (custom && assigned < perSetMcq && !(await confirm({ title: 'Bloom plan has unassigned questions', description: `Your plan assigns ${assigned} of ${perSetMcq} MCQs per set. The remaining ${perSetMcq - assigned} will be balanced across Bloom's levels. Continue?`, confirmLabel: 'Continue', cancelLabel: 'Review plan' }))) return
    if (useSets && (sets < 2 || sets > MAX_SETS)) return setError(`Choose between 2 and ${MAX_SETS} sets.`)
    if (totalMcq > MAX_TOTAL_MCQ) return setError(`That is ${totalMcq} MCQs in total; generate at most ${MAX_TOTAL_MCQ} at a time.`)
    if (totalCoding > MAX_TOTAL_CODING) return setError(`That is ${totalCoding} coding problems in total; generate at most ${MAX_TOTAL_CODING} at a time.`)
    setStarting(true)
    try {
      // Same multipart body the website sends to POST /api/generation-jobs.
      const form = new FormData()
      form.append('topic', topic)
      form.append('description', description)
      form.append('codingCount', String(perSetCoding))
      form.append('sets', String(useSets ? sets : 1))
      if (bloomMode === 'mixed' || custom) {
        form.append('bloomMode', 'custom')
        BLOOM_LEVELS.forEach((level, i) => form.append(level, String(levels[i])))
      } else {
        form.append('bloomMode', bloomMode)
        form.append('mcqCount', String(perSetMcq))
      }
      if (mode === 'text') form.append('sourceText', text)
      if (mode === 'pdf') files.forEach(f => form.append('files', { uri: f.uri, name: f.name, type: f.mimeType } as unknown as Blob))
      if (roomId) form.append('room', roomId)
      if (custom) form.append('bloomPlan', JSON.stringify(draftToPlan(draft)))
      form.append('applyToRoom', String(canApply && applyToRoom))
      const { job } = await api<{ job: { id: string } }>('/api/generation-jobs', { body: form })
      setRunning({ jobId: job.id, total: totalMcq + totalCoding })
    } catch (err) { setError(errorMessage(err)) } finally { setStarting(false) }
  }

  if (inBackground) return (
    <>
    <BackgroundNotice open email={teacher?.email ?? 'your email'} roomId={roomId} />
    <View style={{ alignItems: 'center', paddingVertical: 24, gap: 10 }}>
      <IconTile icon={Mail} tone="green" size={52} />
      <Text size={17} weight="semibold" center>Generating in the background</Text>
      <Text size={14} tone="mutedForeground" center leading={21}>You can close this screen. We&apos;ll email <Text size={14} weight="semibold">{teacher?.email ?? 'you'}</Text> when the questions are ready, then you can review and add them {roomId ? 'to the room' : 'to your question bank'}.</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <Button variant="outline" icon={Sparkles} onPress={() => router.replace('/faculty/generations')}>AI generations</Button>
        <Button onPress={() => router.back()}>Done</Button>
      </View>
    </View>
    </>
  )

  if (running) return (
    <GenerationProgress jobId={running.jobId} total={running.total}
      onReady={(questions, next) => { setRunning(null); onResult(questions, next, running.jobId) }}
      onBackground={() => { setRunning(null); setInBackground(true) }}
      onStop={message => { setRunning(null); setError(message) }} />
  )

  return (
    <View style={{ gap: 16 }}>
      {error ? <Alert>{error}</Alert> : null}
      <Segmented value={mode} onChange={setMode} options={[{ value: 'pdf', label: 'Upload files' }, { value: 'text', label: 'Paste text' }, { value: 'topic', label: 'Topic only' }]} />

      {mode === 'pdf' && (
        <View style={{ gap: 8 }}>
          <Pressable onPress={pickFiles} style={({ pressed }) => ({ alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.lg, paddingVertical: 24, paddingHorizontal: 16, borderColor: pressed ? c.primary : c.borderStrong, backgroundColor: pressed ? c.primarySoft : c.muted })}>
            <Upload size={22} color={c.primary} />
            <Text size={14} weight="medium" style={{ marginTop: 8 }}>{files.length ? 'Tap to add more files' : 'Tap to choose files'}</Text>
            <Text size={12} tone="mutedForeground" center style={{ marginTop: 2 }}>{files.length ? `${files.length} file${files.length > 1 ? 's' : ''} · ${(filesSize / 1024 / 1024).toFixed(1)} of 4 MB` : 'PDF, Word (.doc, .docx) or LaTeX (.tex) — notes, chapters, a syllabus… up to 4 MB'}</Text>
          </Pressable>
          {files.map((file, i) => (
            <View key={`${file.name}-${file.size}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8 }}>
              <FileText size={16} color={c.mutedForeground} />
              <Text size={13} numberOfLines={1} style={{ flex: 1 }}>{file.name}</Text>
              <Text size={12} tone="mutedForeground">{(file.size / 1024 / 1024).toFixed(1)} MB</Text>
              <Pressable hitSlop={8} onPress={() => setFiles(files.filter((_, j) => j !== i))} accessibilityLabel={`Remove ${file.name}`}><X size={16} color={c.mutedForeground} /></Pressable>
            </View>
          ))}
        </View>
      )}
      {mode === 'text' && <Field label="Content"><Textarea rows={7} value={text} onChangeText={setText} placeholder="Paste lecture notes, a textbook section or a lesson plan…" /></Field>}
      <Field label={mode === 'topic' ? 'Topic' : 'Topic (optional)'} hint={mode === 'topic' ? 'Be specific, e.g. "Stacks and queues in C" rather than "Data structures".' : 'Helps focus the questions.'}>
        <Input value={topic} onChangeText={setTopic} placeholder="e.g. Binary search trees" />
      </Field>
      <Field label="Instructions for the AI (optional)" hint="Question types, difficulty, focus areas, code language or real-world scenarios.">
        <Textarea rows={3} value={description} onChangeText={setDescription} placeholder="e.g. Include questions on edge cases and time complexities." />
      </Field>

      <Step n={1} title="How many questions" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Field label={useSets ? 'MCQs per set' : 'MCQs'} style={{ flex: 1 }}><NumberInput keyboardType="number-pad" value={mcqCount} onChangeText={setMcqCount} /></Field>
        <Field label={useSets ? 'Coding per set' : 'Coding problems'} style={{ flex: 1 }}><NumberInput keyboardType="number-pad" value={codingCount} onChangeText={setCodingCount} /></Field>
      </View>

      <Step n={2} title="Bloom's taxonomy levels" />
      <Select title="Levels of the MCQs" value={bloomMode} onChange={v => setBloomMode(v as BloomMode)} options={[
        { value: 'mixed', label: 'Mixed across all six levels' },
        { value: 'custom', label: 'Set questions and marks per level' },
        ...BLOOM_LEVELS.map(level => ({ value: level, label: `Only L${BLOOM_INFO[level].n} · ${BLOOM_INFO[level].label}`, hint: BLOOM_INFO[level].hint })),
      ]} />
      {custom ? (
        <BloomPlanEditor total={perSetMcq} onTotalChange={total => setMcqCount(String(total))} draft={draft} onChange={setDraft} showMarks={inRoom} defaultMarks={defaults?.marks ?? 1} unit={useSets ? 'set' : 'paper'} />
      ) : perSetMcq > 0 ? (
        <Text size={12} tone="mutedForeground">{useSets ? 'Each set' : 'The questions'}: {BLOOM_LEVELS.map((level, i) => (levels[i] ? `L${BLOOM_INFO[level].n} ${BLOOM_INFO[level].label} ${levels[i]}` : '')).filter(Boolean).join(' · ')}</Text>
      ) : null}

      <Step n={3} title="Question sets" />
      <Checkbox checked={useSets} onChange={setUseSets} label="Create question sets (Set A, Set B, … for different students)" />
      {useSets && (
        <View style={{ gap: 8, borderRadius: radius.lg, borderWidth: 1, borderColor: c.primaryBorder, backgroundColor: c.primarySoft, padding: 12 }}>
          <Field label="How many sets?" style={{ width: 140 }}><NumberInput keyboardType="number-pad" value={setCountText} onChangeText={setSetCountText} /></Field>
          <Text size={13} tone="mutedForeground" leading={19}>{sets >= 2 && sets <= MAX_SETS ? `Sets ${letters.join(', ')}, each with ${perSetMcq} MCQs${perSetCoding ? ` + ${perSetCoding} coding` : ''} and the same Bloom's levels: ${totalMcq + totalCoding} questions in total.` : `Enter between 2 and ${MAX_SETS} sets.`}</Text>
        </View>
      )}
      {canApply && (
        <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.muted, padding: 12 }}>
          <Checkbox checked={applyToRoom} onChange={setApplyToRoom}
            label={`Use these for this room's papers: ${[useSets && `each student gets one set (${letters.join(', ')}), revealed after submitting`, `${perSetMcq} MCQs${perSetCoding ? ` + ${perSetCoding} coding` : ''} per student`, custom && 'the per-level questions and marks above'].filter(Boolean).join('; ')}.`} />
        </View>
      )}
      {totalMcq > 120 && <Alert>{`That is ${totalMcq} MCQs in total; the AI can make at most 120 at a time. Use fewer sets or fewer questions per set.`}</Alert>}
      <Button size="lg" icon={starting ? undefined : Wand2} loading={starting} full onPress={generate}>{starting ? 'Starting…' : `Generate ${totalMcq + totalCoding || ''} questions`}</Button>
    </View>
  )
}

/** Same message the website shows when a generation moves to the background. */
function BackgroundNotice({ open, email, roomId }: { open: boolean; email: string; roomId: string | null }) {
  const [shown, setShown] = useState(open)
  return (
    <Sheet open={shown} onClose={() => setShown(false)} title="Generating in the background"
      footer={<>
        <Button variant="outline" icon={Sparkles} style={{ flex: 1 }} onPress={() => { setShown(false); router.replace('/faculty/generations') }}>AI generations</Button>
        <Button style={{ flex: 1 }} onPress={() => { setShown(false); router.back() }}>Done</Button>
      </>}>
      <View style={{ alignItems: 'center', gap: 12 }}>
        <IconTile icon={Mail} tone="green" size={52} />
        <Text size={14} leading={21} center><Text size={14} weight="semibold">You can safely close this screen or the app.</Text> We&apos;re working on your questions on our side and will email <Text size={14} weight="semibold">{email}</Text> as soon as they&apos;re ready. Then review them and add them {roomId ? 'to the room' : 'to your question bank'}.</Text>
        <Text size={12} tone="mutedForeground" center>You can also check progress any time under AI generations.</Text>
      </View>
    </Sheet>
  )
}

function Step({ n, title }: { n: number; title: string }) {
  const c = useColors()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}><Text size={11} weight="semibold" color="#fff">{n}</Text></View>
      <Text size={14} weight="semibold">{title}</Text>
    </View>
  )
}

/* ---------------- CSV ---------------- */

function CsvImport({ onResult }: { onResult: (questions: DraftQuestion[], errors: string[]) => void }) {
  const c = useColors()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function pick() {
    setError('')
    const result = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel', 'application/octet-stream'], copyToCacheDirectory: true })
    if (result.canceled) return
    const asset = result.assets[0]
    if ((asset.size ?? 0) > 2 * 1024 * 1024) return setError('The file is larger than 2 MB.')
    setLoading(true)
    try {
      const csv = await new File(asset.uri).text()
      const data = await api<{ questions: DraftQuestion[]; errors: string[] }>('/api/questions/import', { body: { csv } })
      if (!data.questions.length) throw new Error(data.errors[0] ?? 'No questions were found in that file.')
      onResult(data.questions, data.errors)
    } catch (err) { setError(errorMessage(err)) } finally { setLoading(false) }
  }

  return (
    <View style={{ gap: 14 }}>
      {error ? <Alert>{error}</Alert> : null}
      <Pressable disabled={loading} onPress={pick} style={({ pressed }) => ({ alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.lg, paddingVertical: 28, borderColor: pressed ? c.primary : c.borderStrong, backgroundColor: pressed ? c.primarySoft : c.muted })}>
        {loading ? <Spinner /> : <Upload size={22} color={c.primary} />}
        <Text size={14} weight="medium" style={{ marginTop: 8 }}>{loading ? 'Reading file…' : 'Tap to choose a CSV file'}</Text>
        <Text size={12} tone="mutedForeground" style={{ marginTop: 2 }}>You&apos;ll review every question before it&apos;s saved.</Text>
      </Pressable>
      <Card padded style={{ gap: 8 }}>
        <Text size={14} weight="medium">Expected columns</Text>
        <Text mono size={12} tone="mutedForeground">question, optionA, optionB, optionC, optionD, answer</Text>
        <Text size={12} tone="mutedForeground" leading={18}>• <Text size={12} weight="medium">answer</Text> can be a letter (B), a number (2) or the option&apos;s text.</Text>
        <Text size={12} tone="mutedForeground" leading={18}>• Optional: type (mcq / tf / coding), topic, bloom (1–6 or remember … create), set (A, B…), explanation.</Text>
        <Text size={12} tone="mutedForeground" leading={18}>• Coding rows: title, inputFormat, outputFormat, constraints, sampleInput, sampleOutput, points.</Text>
      </Card>
    </View>
  )
}

/* ---------------- Question bank ---------------- */

function BankPicker({ roomId, onAdded }: { roomId: string; onAdded: (count: number) => void }) {
  const c = useColors()
  const [questions, setQuestions] = useState<BankQuestion[] | null>(null)
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'all' | 'mcq' | 'tf' | 'coding'>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ limit: '100' })
      if (query.trim()) params.set('q', query.trim())
      if (type !== 'all') params.set('type', type)
      api<{ questions: BankQuestion[] }>(`/api/questions?${params}`).then(d => setQuestions(d.questions.filter(q => q.room !== roomId))).catch(err => setError(errorMessage(err)))
    }, 250)
    return () => clearTimeout(timer)
  }, [query, type, roomId])

  async function add() {
    setSaving(true)
    try { const data = await api<{ added: number }>(`/api/rooms/${roomId}`, { body: { questionIds: [...selected] } }); onAdded(data.added) } catch (err) { setError(errorMessage(err)) } finally { setSaving(false) }
  }
  const toggle = (id: string) => setSelected(set => { const next = new Set(set); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const shown = useMemo(() => questions ?? [], [questions])

  return (
    <View style={{ gap: 12 }}>
      {error ? <Alert>{error}</Alert> : null}
      <View>
        <Input value={query} onChangeText={setQuery} placeholder="Search questions" style={{ paddingLeft: 38 }} />
        <Search size={16} color={c.subtle} style={{ position: 'absolute', left: 12, top: 14 }} />
      </View>
      <Segmented value={type} onChange={setType} options={[{ value: 'all', label: 'All' }, { value: 'mcq', label: 'MCQ' }, { value: 'tf', label: 'T/F' }, { value: 'coding', label: 'Coding' }]} />
      <Card>
        {!questions ? <PageLoader /> : shown.length === 0 ? <Text size={14} tone="mutedForeground" center style={{ paddingVertical: 28 }}>No questions found in your bank.</Text> :
          shown.map((q, i) => <View key={q.id}>{i > 0 && <Divider />}<QuestionCard question={q} selectable={{ checked: selected.has(q.id), onChange: () => toggle(q.id) }} /></View>)}
      </Card>
      <Button size="lg" icon={CheckCircle2} full disabled={!selected.size} loading={saving} onPress={add}>{saving ? 'Adding…' : `Copy ${selected.size || ''} into room`}</Button>
    </View>
  )
}
