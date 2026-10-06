import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { CheckCircle2, CircleX, FileText, ImageIcon, Mail, MoonStar, Sparkles, Upload, X } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Alert, Button, Checkbox, Field, Input, Progress, Segmented, Sheet, Spinner, Text, Textarea, useFeedback } from '@/components/ui'
import { api, errorMessage, relativeTime } from '@/lib/api'
import type { PracticalJob } from '@/lib/practicals'
import { radius, useColors } from '@/theme'

// Adding experiments with AI from the app. The phone hands the work to the server, which writes each
// experiment (statement, sample and hidden tests), adds them in order and emails the faculty member when
// it starts and when it's done (POST /api/practicals/:id/jobs), so nobody has to keep the app open.

type Level = 'easy' | 'medium' | 'hard'
type Mode = 'topic' | 'list'
type PickedFile = { uri: string; name: string; size: number; mimeType: string }
type Item = { key: number; title: string; aim: string; include: boolean }

const LEVELS: { value: Level; label: string }[] = [{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }]
const LEVEL_HINT: Record<Level, string> = {
  easy: 'Direct use of the concept, small inputs.',
  medium: 'A typical lab exercise with a few edge cases.',
  hard: 'Edge cases and larger inputs; efficiency matters.',
}
const LIST_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*']
const LIST_EXTENSIONS = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.webp', '.heic']
const MAX_BYTES = 4 * 1024 * 1024

/** "Add with AI": one experiment from a topic, or a whole practical list from a photo or file, written in the background. */
export function AddWithAiSheet({ subjectId, open, onClose, onStarted }: { subjectId: string; open: boolean; onClose: () => void; onStarted: () => void }) {
  const c = useColors()
  const [mode, setMode] = useState<Mode>('topic')
  const [level, setLevel] = useState<Level>('medium')
  const [topic, setTopic] = useState('')
  const [instructions, setInstructions] = useState('')
  const [files, setFiles] = useState<PickedFile[]>([])
  const [items, setItems] = useState<Item[] | null>(null)
  const [reading, setReading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  function reset() { setTopic(''); setInstructions(''); setFiles([]); setItems(null); setError(''); setReading(false); setStarting(false) }
  function close() { if (starting) return; reset(); onClose() }

  function addFiles(picked: PickedFile[]) {
    const next = [...files, ...picked.filter(p => !files.some(f => f.uri === p.uri))].slice(0, 10)
    if (next.reduce((sum, f) => sum + f.size, 0) > MAX_BYTES) return setError('The files add up to more than 4 MB. Use a smaller photo or fewer pages.')
    setError('')
    setFiles(next)
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({ type: LIST_TYPES, multiple: true, copyToCacheDirectory: true })
    if (result.canceled) return
    const ok = result.assets.filter(a => LIST_EXTENSIONS.some(ext => a.name.toLowerCase().endsWith(ext)))
    if (ok.length < result.assets.length) setError('Only photos, PDF and Word (.doc, .docx) files can be read.')
    addFiles(ok.map(a => ({ uri: a.uri, name: a.name, size: a.size ?? 0, mimeType: a.mimeType ?? 'application/octet-stream' })))
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true, selectionLimit: 5 })
    if (result.canceled) return
    addFiles(result.assets.map((a, i) => ({ uri: a.uri, name: a.fileName ?? `practical-list-${i + 1}.jpg`, size: a.fileSize ?? 0, mimeType: a.mimeType ?? 'image/jpeg' })))
  }

  /** The AI finds the experiments in the files; the faculty member checks them before anything is written. */
  async function readList() {
    if (!files.length) return setError('Choose a photo, PDF or Word file of the practical list.')
    setReading(true)
    setError('')
    try {
      const form = new FormData()
      files.forEach(f => form.append('files', { uri: f.uri, name: f.name, type: f.mimeType } as unknown as Blob))
      const { experiments } = await api<{ experiments: { title: string; aim: string }[] }>(`/api/practicals/${subjectId}/import`, { body: form })
      setItems(experiments.map((e, i) => ({ key: i, title: e.title, aim: e.aim, include: true })))
    } catch (err) { setError(errorMessage(err)) } finally { setReading(false) }
  }

  async function start() {
    const body = mode === 'topic'
      ? { kind: 'draft', level, items: [{ title: topic.trim(), description: instructions.trim() }] }
      : { kind: 'import', level, items: (items ?? []).filter(i => i.include && (i.title.trim() || i.aim.trim())).map(i => ({ title: i.title, description: `Aim of this experiment, from the practical list: ${i.aim || i.title}` })) }
    if (mode === 'topic' && !topic.trim() && !instructions.trim()) return setError('Enter the experiment topic or what it should cover.')
    if (!body.items.length) return setError('Choose at least one experiment to write.')
    setStarting(true)
    setError('')
    try {
      await api(`/api/practicals/${subjectId}/jobs`, { body })
      reset()
      onStarted()
    } catch (err) { setError(errorMessage(err)); setStarting(false) }
  }

  const chosen = items?.filter(i => i.include).length ?? 0
  const footer = mode === 'list' && !items
    ? <Button full icon={Sparkles} loading={reading} disabled={!files.length} onPress={readList}>{reading ? 'Reading the list…' : 'Read the list'}</Button>
    : <Button full icon={MoonStar} loading={starting} disabled={mode === 'list' && !chosen} onPress={start}>
      {mode === 'topic' ? 'Write it in the background' : `Write ${chosen} experiment${chosen === 1 ? '' : 's'} in the background`}
    </Button>

  return (
    <Sheet open={open} onClose={close} full dismissible={!starting} title="Add experiments with AI" description="The AI writes each experiment with its sample and hidden tests and adds it to the practical." footer={footer}>
      <View style={{ gap: 16 }}>
        <Segmented value={mode} onChange={next => { setMode(next); setError('') }} options={[{ value: 'topic', label: 'From a topic' }, { value: 'list', label: 'Practical list' }]} />
        {error ? <Alert>{error}</Alert> : null}
        <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: c.muted }}>
          <Mail size={16} color={c.primary} style={{ marginTop: 2 }} />
          <Text size={13} tone="mutedForeground" leading={19} style={{ flex: 1 }}>It runs on the server, so you can close the app. We email you when it starts and again when the experiments are added.</Text>
        </View>

        <Field label="Level" hint={LEVEL_HINT[level]}>
          <Segmented value={level} onChange={setLevel} options={LEVELS} />
        </Field>

        {mode === 'topic' ? (
          <>
            <Field label="Topic"><Input value={topic} onChangeText={setTopic} placeholder="e.g. Stack using arrays" /></Field>
            <Field label="Instructions" hint="Optional: what it should practise, input size, anything to avoid…"><Textarea rows={4} value={instructions} onChangeText={setInstructions} /></Field>
          </>
        ) : !items ? (
          <>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button variant="outline" icon={ImageIcon} style={{ flex: 1 }} onPress={pickPhoto}>Photo</Button>
              <Button variant="outline" icon={Upload} style={{ flex: 1 }} onPress={pickDocument}>PDF or Word</Button>
            </View>
            {files.length === 0 ? (
              <Text size={13} tone="mutedForeground" center>Choose a photo or scan of the list of practicals, or a PDF or Word file (up to 4 MB).</Text>
            ) : files.map(f => (
              <View key={f.uri} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: c.border }}>
                <FileText size={18} color={c.mutedForeground} />
                <Text size={14} numberOfLines={1} style={{ flex: 1 }}>{f.name}</Text>
                {f.size ? <Text size={12} tone="mutedForeground">{(f.size / 1024 / 1024).toFixed(1)} MB</Text> : null}
                <Pressable onPress={() => setFiles(files.filter(x => x.uri !== f.uri))} hitSlop={8} accessibilityLabel={`Remove ${f.name}`}><X size={16} color={c.mutedForeground} /></Pressable>
              </View>
            ))}
          </>
        ) : (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text size={14} weight="semibold">{`${items.length} experiment${items.length === 1 ? '' : 's'} found`}</Text>
              <Pressable onPress={() => setItems(null)} hitSlop={8}><Text size={13} tone="primary">Choose another file</Text></Pressable>
            </View>
            <Text size={12} tone="mutedForeground">Untick any you don&apos;t want, and fix a title if needed. They are added in this order.</Text>
            {items.map((item, index) => (
              <View key={item.key} style={{ gap: 8, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, opacity: item.include ? 1 : 0.5 }}>
                <Checkbox checked={item.include} onChange={include => setItems(list => list?.map(i => (i.key === item.key ? { ...i, include } : i)) ?? null)} label={`Experiment ${index + 1}`} />
                <Input value={item.title} onChangeText={title => setItems(list => list?.map(i => (i.key === item.key ? { ...i, title } : i)) ?? null)} placeholder="Experiment title" />
                {item.aim ? <Text size={12} tone="mutedForeground" numberOfLines={3}>{item.aim}</Text> : null}
              </View>
            ))}
          </View>
        )}
      </View>
    </Sheet>
  )
}

/**
 * This practical's background AI jobs: progress while they run (checked every few seconds; `onAdded` runs
 * as experiments are added), then what was added and what failed, until dismissed.
 */
export function PracticalJobsBanner({ subjectId, refreshKey, onAdded }: { subjectId: string; refreshKey: number; onAdded: () => void }) {
  const c = useColors()
  const { toast } = useFeedback()
  const [jobs, setJobs] = useState<PracticalJob[]>([])
  const added = useRef<number | null>(null)
  const onAddedRef = useRef(onAdded)
  useEffect(() => { onAddedRef.current = onAdded }, [onAdded])

  const load = useCallback(() => api<{ jobs: PracticalJob[] }>(`/api/practicals/${subjectId}/jobs`).then(d => {
    setJobs(d.jobs)
    const total = d.jobs.reduce((sum, j) => sum + j.done, 0)
    if (added.current !== null && total !== added.current) onAddedRef.current()
    added.current = total
  }).catch(() => { /* optional; try again on the next check */ }), [subjectId])

  useEffect(() => { load() }, [load, refreshKey])
  const running = jobs.some(j => j.status === 'running')
  useEffect(() => {
    if (!running) return
    const timer = setInterval(load, 8000)
    return () => clearInterval(timer)
  }, [running, load])

  async function remove(job: PracticalJob) {
    try {
      await api(`/api/practicals/${subjectId}/jobs/${job.id}`, { method: 'DELETE' })
      setJobs(list => list.filter(j => j.id !== job.id))
      if (job.status === 'running') toast('Stopped. Experiments already added stay.')
    } catch (err) { toast(errorMessage(err), 'error') }
  }

  if (!jobs.length) return null
  return (
    <View style={{ gap: 8 }}>
      {jobs.map(job => {
        const finished = job.status !== 'running'
        const failed = job.items.filter(i => i.status === 'failed')
        const tone = !finished ? { border: c.primaryBorder, bg: c.primarySoft } : failed.length ? { border: c.warningBorder, bg: c.warningSoft } : { border: c.successBorder, bg: c.successSoft }
        return (
          <View key={job.id} style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: tone.border, backgroundColor: tone.bg }}>
            <View style={{ paddingTop: 1 }}>{!finished ? <Spinner /> : failed.length ? <CircleX size={18} color={c.warning} /> : <CheckCircle2 size={18} color={c.success} />}</View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text size={14} weight="semibold">{!finished ? `Writing in the background: ${job.done} of ${job.total} added` : `${job.done} of ${job.total} experiment${job.total === 1 ? '' : 's'} added`}</Text>
              <Text size={12} tone="mutedForeground" leading={17}>
                {!finished
                  ? job.nextRetryAt ? `The AI is busy; trying again ${relativeTime(job.nextRetryAt)}.` : job.current ? `Now writing: ${job.current}. We'll email you when it's done.` : 'Starting…'
                  : `Finished ${relativeTime(job.finishedAt)}. Review them on the website.`}
              </Text>
              {!finished && <Progress value={job.total ? Math.max(4, ((job.done + job.failed) / job.total) * 100) : 4} style={{ marginTop: 4 }} />}
              {finished && failed.map((item, i) => <Text key={i} size={12} tone="danger">{`Not added: ${item.title || 'Untitled'}${item.error ? ` (${item.error})` : ''}`}</Text>)}
            </View>
            <Pressable onPress={() => remove(job)} hitSlop={8} accessibilityLabel={finished ? 'Dismiss' : 'Stop'}>
              {finished ? <X size={16} color={c.mutedForeground} /> : <Text size={13} weight="medium" tone="mutedForeground">Stop</Text>}
            </Pressable>
          </View>
        )
      })}
    </View>
  )
}
