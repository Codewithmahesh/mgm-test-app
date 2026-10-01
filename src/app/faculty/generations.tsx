import { router, useFocusEffect } from 'expo-router'
import { AlertTriangle, CheckCircle2, Clock3, DoorOpen, Hourglass, Sparkles, Trash2 } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import { Alert, Badge, Button, Card, EmptyState, PageLoader, Progress, Screen, ScreenHeader, Text, useFeedback } from '@/components/ui'
import { api, errorMessage, relativeTime } from '@/lib/api'
import { useColors } from '@/theme'

type Job = {
  id: string
  title: string
  status: 'running' | 'ready' | 'failed'
  background: boolean
  room: { id: string; title: string; code: string } | null
  requested: { mcq: number; coding: number }
  sets: string[]
  progress: { total: number; done: number; failed: number; running: number; waiting: number }
  nextRetryAt: string | null
  error: string
  resultCount: number
  createdAt: string
}

/** AI generations: running in the background, ready to review, or failed. */
export default function Generations() {
  const c = useColors()
  const { toast, confirm } = useFeedback()
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)

  const load = useCallback(() => api<{ jobs: Job[] }>('/api/generation-jobs').then(d => { setJobs(d.jobs); setError('') }).catch(err => setError(errorMessage(err))), [])
  useFocusEffect(useCallback(() => { load() }, [load]))

  const anyRunning = jobs?.some(job => job.status === 'running')
  useEffect(() => {
    if (!anyRunning) return
    const timer = setInterval(() => void load(), 5000)
    return () => clearInterval(timer)
  }, [anyRunning, load])

  async function remove(job: Job) {
    const running = job.status === 'running'
    if (!(await confirm({
      title: running ? 'Cancel this generation?' : job.status === 'ready' ? 'Discard these questions?' : 'Dismiss this generation?',
      description: running ? 'The AI stops working on it and nothing is saved.' : job.status === 'ready' ? `The ${job.resultCount} generated questions will be deleted without being added anywhere.` : undefined,
      confirmLabel: running ? 'Cancel generation' : job.status === 'ready' ? 'Discard' : 'Dismiss',
      cancelLabel: 'Keep',
      tone: 'danger',
    }))) return
    setRemoving(job.id)
    try { await api(`/api/generation-jobs/${job.id}`, { method: 'DELETE' }); setJobs(list => list?.filter(j => j.id !== job.id) ?? null) } catch (err) { toast(errorMessage(err), 'error') } finally { setRemoving(null) }
  }

  const ready = jobs?.filter(j => j.status === 'ready') ?? []
  return (
    <Screen header={<ScreenHeader title="AI generations" />} onRefresh={load}>
      <Text size={14} tone="mutedForeground">Questions the AI is writing in the background, and batches waiting for your review. Nothing is added to a room until you review and save it.</Text>
      {error ? <Alert>{error}</Alert> : null}
      {!jobs ? <PageLoader /> : !jobs.length ? (
        <Card><EmptyState icon={Sparkles} title="Nothing here right now" description="When you generate questions in the background, they show up here and we email you once they're ready to review." /></Card>
      ) : (
        <>
          {ready.length > 0 && <Text size={13} tone="mutedForeground"><Text size={13} weight="semibold">{ready.length}</Text> batch{ready.length === 1 ? '' : 'es'} ready to review.</Text>}
          {jobs.map(job => {
            const requested = [job.requested.mcq && `${job.requested.mcq} MCQs`, job.requested.coding && `${job.requested.coding} coding`].filter(Boolean).join(' + ')
            const { total, done, failed } = job.progress
            const percent = total ? Math.round(((done + failed) / total) * 100) : 0
            const waiting = job.status === 'running' && job.nextRetryAt && !job.progress.running
            const status = job.status === 'ready' ? { icon: CheckCircle2, tone: 'green' as const, label: 'Ready to review' }
              : job.status === 'failed' ? { icon: AlertTriangle, tone: 'red' as const, label: 'Failed' }
              : waiting ? { icon: Hourglass, tone: 'amber' as const, label: 'Waiting for the AI' }
              : { icon: Sparkles, tone: 'blue' as const, label: 'Generating' }
            return (
              <Card key={job.id} padded tone={job.status === 'ready' ? 'green' : undefined} style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Badge tone={status.tone} icon={status.icon}>{status.label}</Badge>
                  <Text size={12} tone="mutedForeground">{relativeTime(job.createdAt)}</Text>
                </View>
                <View>
                  <Text size={15} weight="semibold" numberOfLines={1}>{job.title || 'AI questions'}</Text>
                  <Text size={13} tone="mutedForeground">{job.status === 'ready' ? `${job.resultCount} questions generated` : requested}{job.sets.length ? ` · sets ${job.sets[0]}–${job.sets.at(-1)}` : ''}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    {job.room && <DoorOpen size={13} color={c.subtle} />}
                    <Text size={13} tone="mutedForeground" onPress={job.room ? () => router.push(`/faculty/room/${job.room!.id}`) : undefined}>{job.room ? job.room.title : 'For your question bank'}</Text>
                  </View>
                </View>
                {job.status === 'running' && (
                  <View style={{ gap: 6 }}>
                    <Progress value={Math.max(4, percent)} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      {waiting && <Clock3 size={13} color={c.subtle} />}
                      <Text size={12} tone="mutedForeground">{waiting ? `The AI is busy; trying again ${relativeTime(job.nextRetryAt)}. We'll email you when it's done.` : `${total > 1 ? `${done} of ${total} parts done` : 'Working on it'}${job.background ? " · we'll email you when it's done" : ''}`}</Text>
                    </View>
                  </View>
                )}
                {job.error ? <Text size={13} tone={job.status === 'failed' ? 'danger' : 'warningInk'}>{job.error}</Text> : null}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {job.status === 'ready' && <Button icon={CheckCircle2} style={{ flex: 1 }} onPress={() => router.push(`/faculty/add-questions?reviewJob=${job.id}${job.room ? `&roomId=${job.room.id}` : ''}`)}>Review and add</Button>}
                  <Button variant="outline" icon={Trash2} loading={removing === job.id} onPress={() => remove(job)}>{job.status === 'running' ? 'Cancel' : job.status === 'ready' ? 'Discard' : 'Dismiss'}</Button>
                </View>
              </Card>
            )
          })}
        </>
      )}
    </Screen>
  )
}
