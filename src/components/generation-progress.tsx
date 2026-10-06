import { Mail, Sparkles } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { ApiError, api, errorMessage, type DraftQuestion } from '@/lib/api'
import { bloomLabel } from '@/lib/bloom'
import { notify } from '@/lib/notify'
import { useSession } from '@/lib/session'
import { useColors } from '@/theme'
import { Button, Card, IconTile, Progress, Text, useFeedback } from './ui'

/** What the AI was asked for, so the room's papers can be set up to match. */
export type GenerationPlan = { sets: string[]; mcqPerSet: number; tfPerSet?: number; codingPerSet: number; bloomPlan: { level: string; count: number; marks: number }[] | null; applyToRoom: boolean }

type JobSummary = {
  id: string
  status: 'running' | 'ready' | 'failed' | 'saved' | 'cancelled'
  background: boolean
  progress: { total: number; done: number; failed: number; running: number; waiting: number }
  error: string
}
type RunResult = { claimed: boolean; busy: boolean; questions: DraftQuestion[]; error: string; job: JobSummary }

// Parts run at once from the phone (the server runs one part per call).
const PARALLEL = 3
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Drives a generation job part by part while the faculty member watches, like the website.
 * They can hand it to the server at any time; it then finishes on its own and emails them.
 */
export function GenerationProgress({ jobId, total, onReady, onBackground, onStop }: {
  jobId: string
  total: number
  onReady: (questions: DraftQuestion[], plan: GenerationPlan) => void
  onBackground: () => void
  onStop: (message: string) => void
}) {
  const c = useColors()
  const { confirm } = useFeedback()
  const { teacher } = useSession()
  const [job, setJob] = useState<JobSummary | null>(null)
  const [written, setWritten] = useState<DraftQuestion[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [pending, setPending] = useState<'background' | 'cancel' | null>(null)
  const settled = useRef(false)
  // Cancels the parts still running from this phone, so nothing waits on them once the outcome is decided.
  const workers = useRef(new AbortController())
  const callbacks = useRef({ onReady, onBackground, onStop })
  callbacks.current = { onReady, onBackground, onStop }
  const email = teacher?.email ?? 'your email'

  async function toBackground() {
    setPending('background')
    settled.current = true
    workers.current.abort()
    try {
      await api(`/api/generation-jobs/${jobId}`, { method: 'PATCH', body: { action: 'background' }, timeoutMs: 15_000 })
      callbacks.current.onBackground()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) { settled.current = false; await finish() }
      else if (err instanceof ApiError && err.status === 404) callbacks.current.onStop('This generation was cancelled.')
      else callbacks.current.onBackground()
    }
  }

  async function cancel(message: string) {
    setPending('cancel')
    settled.current = true
    workers.current.abort()
    await api(`/api/generation-jobs/${jobId}`, { method: 'DELETE', timeoutMs: 15_000 }).catch(() => {})
    callbacks.current.onStop(message)
  }

  async function finish() {
    if (settled.current) return
    settled.current = true
    try {
      const data = await api<{ job: JobSummary; questions?: DraftQuestion[]; plan?: GenerationPlan }>(`/api/generation-jobs/${jobId}`)
      if (data.job.status === 'ready' && data.questions?.length && data.plan) {
        void notify('Your questions are ready', `${data.questions.length} questions were generated. Open the app to review and save them.`, { onlyInBackground: true })
        callbacks.current.onReady(data.questions.map(q => ({ ...q, set: q.set ?? '' })), data.plan)
      }
      else callbacks.current.onStop(data.job.error || 'The AI could not generate questions this time. Please try again.')
    } catch (err) { callbacks.current.onStop(errorMessage(err)) }
  }

  async function busy() {
    if (settled.current) return
    settled.current = true
    const yes = await confirm({
      title: 'The AI is under heavy load right now',
      description: `We can't generate your questions at the moment. Want us to take care of it? We'll keep trying in the background and email ${email} when they're ready to review.`,
      confirmLabel: 'Yes, in the background',
      cancelLabel: 'No, cancel',
    })
    if (yes) { settled.current = false; await toBackground() }
    else await cancel('Generation cancelled. The AI is busy right now; please try again in a few minutes.')
  }

  // Workers: keep asking the server to run the next part until the job is finished.
  useEffect(() => {
    let cancelled = false
    const worker = async () => {
      let failures = 0
      while (!cancelled && !settled.current) {
        let result: RunResult
        try {
          result = await api<RunResult>(`/api/generation-jobs/${jobId}/run`, { method: 'POST', signal: workers.current.signal })
          failures = 0
        } catch (err) {
          if (cancelled || settled.current) return
          if (err instanceof ApiError && err.status === 404) { settled.current = true; callbacks.current.onStop('This generation was cancelled.'); return }
          if (++failures >= 5) { settled.current = true; callbacks.current.onStop(errorMessage(err)); return }
          await sleep(3000)
          continue
        }
        if (cancelled || settled.current) return
        setJob(result.job)
        if (result.questions.length) setWritten(list => [...list, ...result.questions])
        if (result.busy) return void busy()
        if (result.job.status !== 'running') return void finish()
        if (!result.claimed) await sleep(2500)
      }
    }
    for (let i = 0; i < PARALLEL; i++) void worker()
    const controller = workers.current
    return () => { cancelled = true; controller.abort() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  useEffect(() => {
    const started = Date.now()
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [])

  const parts = job?.progress.total ?? 1
  const done = (job?.progress.done ?? 0) + (job?.progress.failed ?? 0)
  // Ease forward with time so one long part doesn't look stuck.
  const percent = Math.min(97, Math.max(4, Math.round(((done + Math.min(0.9, elapsed / 60)) / parts) * 100)))
  const latest = written.slice(-3).reverse()

  return (
    <View style={{ gap: 16 }}>
      <Card padded style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconTile icon={Sparkles} tone="violet" size={44} />
          <View style={{ flex: 1 }}>
            <Text weight="semibold" size={16}>Writing your questions…</Text>
            <Text size={13} tone="mutedForeground">{written.length} of {total} written · {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</Text>
          </View>
        </View>
        <Progress value={percent} tone="violet" height={8} />
        <Text size={12} tone="mutedForeground">{parts > 1 ? `${done} of ${parts} parts done` : 'Reading your material and drafting questions'}. Keep the app open, or let the server finish it.</Text>
      </Card>

      {latest.length > 0 && (
        <Card>
          <Text size={12} weight="semibold" tone="subtle" uppercase tracking={0.6} style={{ paddingHorizontal: 16, paddingTop: 14 }}>Just written</Text>
          <View style={{ padding: 16, paddingTop: 8, gap: 12 }}>
            {latest.map((q, i) => (
              <View key={`${written.length}-${i}`} style={{ gap: 2 }}>
                <Text size={13} numberOfLines={2}>{q.type === 'coding' ? q.title : q.text}</Text>
                <Text size={11} tone="mutedForeground">{q.type === 'coding' ? 'Coding problem' : bloomLabel(q.bloom)}{q.set ? ` · Set ${q.set}` : ''}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      <Card padded style={{ gap: 12, backgroundColor: c.muted }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Mail size={18} color={c.primary} style={{ marginTop: 1 }} />
          <Text size={13} leading={19} style={{ flex: 1 }}>Don&apos;t want to wait? We can finish in the background and email <Text size={13} weight="semibold">{email}</Text> when the questions are ready to review.</Text>
        </View>
        <Button icon={Mail} loading={pending === 'background'} disabled={pending !== null} onPress={toBackground}>Finish in the background</Button>
        <Button variant="ghost" loading={pending === 'cancel'} disabled={pending !== null} onPress={() => cancel('Generation cancelled.')}>Cancel generation</Button>
      </Card>
    </View>
  )
}
