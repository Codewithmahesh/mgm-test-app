import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { addScreenshotListener, usePreventScreenCapture } from 'expo-screen-capture'
import * as SecureStore from 'expo-secure-store'
import { StatusBar } from 'expo-status-bar'
import { useKeepAwake } from 'expo-keep-awake'
import * as Haptics from 'expo-haptics'
import { AlertTriangle, Bookmark, BookmarkCheck, Check, ChevronLeft, ChevronRight, Clock3, CloudOff, Eraser, LayoutGrid, Laptop, Loader2, MonitorX, Send, ShieldAlert } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Emblem } from '@/components/brand'
import { Alert, Button, Sheet, Spinner, Text, useFeedback } from '@/components/ui'
import { ApiError, api, clock, errorMessage, letter } from '@/lib/api'
import { INTEGRITY_EVENTS, type IntegrityEvent } from '@/lib/integrity'
import { radius, useColors } from '@/theme'

type McqQuestion = { number: number; type: 'mcq' | 'tf'; text: string; imageUrl?: string; options: string[]; topic: string; marks?: number }
type CodingQuestion = { number: number; type: 'coding'; title: string; text: string; imageUrl?: string; topic: string; points: number }
type Question = McqQuestion | CodingQuestion
type Answer = number | { language: string; code: string } | string | null

type Paper = {
  id: string
  status: 'in_progress' | 'submitted'
  student: { name: string; email: string; rollNumber: string }
  room: { title: string; code: string; marksPerQuestion: number; negativeMarks: number }
  proctoring: { requireFullscreen: boolean; blockCopyPaste: boolean; maxViolations: number; violations: number }
  serverNow: string
  startedAt: string
  endsAt: string
  questions?: Question[]
  answers?: Answer[]
  flagged?: number[]
}

type Heartbeat = { status: 'in_progress' | 'submitted'; endsAt: string; serverNow: string; autoSubmitReason: string; violations: number; maxViolations: number }
type Violation = { type: IntegrityEvent; violations: number; maxViolations: number }

const isAnswered = (answer: Answer | undefined) => typeof answer === 'number' || (typeof answer === 'string' ? answer.trim() !== '' : Boolean(answer && typeof answer === 'object' && answer.code.trim()))

/** What each signal means on a phone (the website's wording talks about tabs and keyboards). */
const MOBILE_HELP: Partial<Record<IntegrityEvent, { label: string; help: string }>> = {
  tab_switch: { label: 'You left the exam', help: 'You switched to another app or went to the home screen.' },
  print: { label: 'Screenshot taken', help: 'Screenshots and screen recording are not allowed during the exam.' },
}

/** Stable id for this phone + attempt, so restarting the app isn't mistaken for a second device. */
async function deviceTabId(attemptId: string) {
  const key = `mgm.tab.${attemptId}`
  try {
    const existing = await SecureStore.getItemAsync(key)
    if (existing) return existing
    const fresh = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
    await SecureStore.setItemAsync(key, fresh)
    return fresh
  } catch {
    return ''
  }
}

export default function ExamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const c = useColors()
  const { toast } = useFeedback()
  useKeepAwake()
  usePreventScreenCapture()

  const [paper, setPaper] = useState<Paper | null>(null)
  const [loadError, setLoadError] = useState('')
  const [answers, setAnswers] = useState<Answer[]>([])
  const [flagged, setFlagged] = useState<number[]>([])
  const [current, setCurrent] = useState(0)
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]))
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'offline' | 'error'>('saved')
  const [finishOpen, setFinishOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [sessionLost, setSessionLost] = useState(false)
  const [ready, setReady] = useState(false)
  const [violation, setViolation] = useState<Violation | null>(null)

  const pending = useRef<Record<number, Answer>>({})
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const clockOffset = useRef(0)
  const submitted = useRef(false)
  const sessionKey = useRef('')
  const endsAtRef = useRef<number | null>(null)
  const lastReport = useRef<Record<string, number>>({})
  const scroller = useRef<ScrollView>(null)
  const retryFlush = useRef<() => void>(() => {})

  const headers = () => ({ 'x-exam-session': sessionKey.current })
  const finish = useCallback(() => { submitted.current = true; router.replace(`/student/result/${id}`) }, [id])

  // The two "stop writing" answers from the server: already submitted, or opened elsewhere.
  const handleConflict = useCallback((error: unknown) => {
    if (!(error instanceof ApiError) || error.status !== 409) return false
    if (error.code === 'session_taken') { setSessionLost(true); return true }
    finish()
    return true
  }, [finish])

  const claim = useCallback(async () => {
    const data = await api<{ sessionKey: string }>(`/api/student/attempts/${id}/session`, { body: { tabId: await deviceTabId(id) } })
    sessionKey.current = data.sessionKey
    setSessionLost(false)
  }, [id])

  // Load the paper and claim the session once.
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    api<Paper>(`/api/student/attempts/${id}`)
      .then(async data => {
        if (data.status === 'submitted') { finish(); return }
        clockOffset.current = new Date(data.serverNow).getTime() - Date.now()
        await claim()
        setPaper(data)
        endsAtRef.current = new Date(data.endsAt).getTime()
        setEndsAt(endsAtRef.current)
        setAnswers(data.answers ?? [])
        setFlagged(data.flagged ?? [])
        // Resume at the first unanswered MCQ.
        const firstOpen = (data.questions ?? []).findIndex((q, i) => q.type !== 'coding' && !isAnswered(data.answers?.[i]))
        if (firstOpen > 0) { setCurrent(firstOpen); setVisited(new Set([firstOpen])) }
        setReady(true)
      })
      .catch(err => { if (!handleConflict(err)) setLoadError(errorMessage(err)) })
  }, [id, finish, claim, handleConflict])

  const questions = useMemo(() => paper?.questions ?? [], [paper])

  const flush = useCallback(async (extra: { flagged?: number[] } = {}) => {
    if (submitted.current) return
    const batch = pending.current
    pending.current = {}
    if (!Object.keys(batch).length && !extra.flagged) return
    setSaveState('saving')
    try {
      await api(`/api/student/attempts/${id}`, { method: 'PATCH', body: { answers: batch, ...extra }, headers: headers() })
      setSaveState(Object.keys(pending.current).length ? 'saving' : 'saved')
    } catch (err) {
      if (handleConflict(err)) { pending.current = { ...batch, ...pending.current }; return }
      if (err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 429) { setSaveState('error'); return }
      pending.current = { ...batch, ...pending.current }
      setSaveState('offline')
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => retryFlush.current(), 4000)
    }
  }, [id, handleConflict])
  useEffect(() => { retryFlush.current = () => void flush() }, [flush])

  const submit = useCallback(async () => {
    if (submitted.current) return
    submitted.current = true
    setSubmitting(true)
    setSubmitError('')
    clearTimeout(saveTimer.current)
    try {
      await api(`/api/student/attempts/${id}/submit`, { body: { answers: pending.current }, headers: headers() })
      pending.current = {}
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      router.replace(`/student/result/${id}`)
    } catch (err) {
      submitted.current = false
      setSubmitting(false)
      if (err instanceof ApiError && err.code === 'session_taken') { setFinishOpen(false); setSessionLost(true); return }
      setSubmitError(`${errorMessage(err)} Check your connection and try again.`)
      setFinishOpen(true)
    }
  }, [id])

  const applyHeartbeat = useCallback((beat: Heartbeat) => {
    clockOffset.current = new Date(beat.serverNow).getTime() - Date.now()
    endsAtRef.current = new Date(beat.endsAt).getTime()
    setEndsAt(endsAtRef.current)
    if (beat.status === 'submitted') finish()
  }, [finish])

  const beat = useCallback(async () => {
    try { applyHeartbeat(await api<Heartbeat>(`/api/student/attempts/${id}/event`, { body: { type: 'heartbeat' }, headers: headers() })) } catch (err) {
      if (err instanceof ApiError && err.status === 404) { submitted.current = true; setLoadError('This exam was removed by your faculty.') }
      else handleConflict(err)
    }
  }, [id, applyHeartbeat, handleConflict])

  // Countdown against the server clock. At zero, check with the server first: the faculty may have added time.
  useEffect(() => {
    if (!ready || endsAt === null) return
    let checking = false
    const tick = async () => {
      const left = Math.max(0, Math.round((endsAt - (Date.now() + clockOffset.current)) / 1000))
      setSecondsLeft(left)
      if (left === 0 && !checking && !submitted.current) {
        checking = true
        await beat()
        if (endsAtRef.current === endsAt) void submit()
      }
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [ready, endsAt, beat, submit])

  // Heartbeat every 30 s: keeps "last active" fresh and picks up time extensions or an early end.
  useEffect(() => {
    if (!ready) return
    const timer = setInterval(() => { if (!submitted.current && !sessionLost) void beat() }, 30_000)
    return () => clearInterval(timer)
  }, [ready, sessionLost, beat])

  /** Sends a proctoring signal (throttled like the website) and shows the warning. */
  const report = useCallback(async (type: IntegrityEvent, detail = '') => {
    if (submitted.current || !ready) return
    const now = Date.now()
    if (now - (lastReport.current[type] ?? 0) < 1500) return
    lastReport.current[type] = now
    try {
      const result = await api<Heartbeat>(`/api/student/attempts/${id}/event`, { body: { type, detail }, headers: headers() })
      applyHeartbeat(result)
      if (INTEGRITY_EVENTS[type].violation || type === 'print') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
        setViolation({ type, violations: result.violations, maxViolations: result.maxViolations })
      }
    } catch (err) { handleConflict(err) }
  }, [id, ready, applyHeartbeat, handleConflict])

  // Leaving the app = the website's "tab switched". Save first, report when the student returns.
  useEffect(() => {
    if (!ready) return
    let leftAt: number | null = null
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background') { leftAt = Date.now(); void flush() }
      if (state === 'active' && leftAt) {
        const away = Math.round((Date.now() - leftAt) / 1000)
        leftAt = null
        void report('tab_switch', `Left the app for ${away}s`).then(() => beat())
      }
    })
    return () => sub.remove()
  }, [ready, flush, report, beat])

  // Screenshots are blocked; an attempt is still recorded.
  useEffect(() => {
    if (!ready) return
    const sub = addScreenshotListener(() => { void report('print', 'Screenshot attempt') })
    return () => sub.remove()
  }, [ready, report])

  // The hardware back button must not leave the exam.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (submitted.current) return false
      toast('Use Finish to submit your exam. Your timer keeps running.', 'info')
      return true
    })
    return () => sub.remove()
  }, [toast])

  function setAnswer(index: number, value: Answer) {
    setAnswers(list => { const next = [...list]; next[index] = value; return next })
    pending.current[index + 1] = value
    setSaveState('saving')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void flush(), 150)
  }
  function toggleFlag(number: number) {
    const next = flagged.includes(number) ? flagged.filter(n => n !== number) : [...flagged, number]
    setFlagged(next)
    void flush({ flagged: next })
  }
  const go = (index: number) => {
    const next = Math.max(0, Math.min(questions.length - 1, index))
    setCurrent(next)
    setVisited(set => (set.has(next) ? set : new Set(set).add(next)))
    setNavOpen(false)
    scroller.current?.scrollTo({ y: 0, animated: false })
  }

  if (loadError) return (
    <SafeAreaView style={[styles.center, { backgroundColor: c.background }]}>
      <AlertTriangle size={30} color={c.warning} />
      <Text weight="semibold" size={18} center style={{ marginTop: 12 }}>We couldn&apos;t open your exam</Text>
      <Text size={14} tone="mutedForeground" center style={{ marginTop: 6 }}>{loadError}</Text>
      <Button variant="outline" style={{ marginTop: 20 }} onPress={() => router.replace('/student')}>Back to dashboard</Button>
    </SafeAreaView>
  )
  if (!paper || !questions.length) return <SafeAreaView style={[styles.center, { backgroundColor: c.background }]}><Spinner size="large" /></SafeAreaView>

  const question = questions[current]
  const answeredCount = answers.filter(isAnswered).length
  const time = secondsLeft ?? 0
  const isLast = current === questions.length - 1
  const watermark = `${paper.student.email} · ${paper.student.rollNumber ? `Roll ${paper.student.rollNumber} · ` : ''}${paper.room.code}`
  const timerStyle = time <= 60 ? { bg: c.danger, fg: '#ffffff' } : time <= 300 ? { bg: 'rgba(198,69,69,0.25)', fg: '#fca5a5' } : { bg: 'rgba(255,255,255,0.1)', fg: c.brand }
  const selected = typeof answers[current] === 'number' ? (answers[current] as number) : null
  const isFlagged = flagged.includes(question.number)

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style="light" hidden={paper.proctoring.requireFullscreen} />
      {/* Exam bar */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: c.navy }}>
        <View style={styles.bar}>
          <Emblem size={30} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text size={14} weight="semibold" color="#ffffff" numberOfLines={1}>{paper.room.title}</Text>
            <SaveIndicator state={saveState} />
          </View>
          <View accessibilityRole="timer" accessibilityLabel="Time remaining" style={[styles.timer, { backgroundColor: timerStyle.bg }]}>
            <Clock3 size={14} color={timerStyle.fg} />
            <Text mono weight="semibold" size={14} color={timerStyle.fg} tabular>{clock(time)}</Text>
          </View>
        </View>
        {/* Progress */}
        <View style={{ height: 3, backgroundColor: c.navy2 }}>
          <View style={{ height: 3, width: `${Math.round((answeredCount / questions.length) * 100)}%`, backgroundColor: c.success }} />
        </View>
      </SafeAreaView>

      <View style={{ flex: 1 }}>
        <ScrollView ref={scroller} contentContainerStyle={{ padding: 18, paddingBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ backgroundColor: c.navy, borderRadius: radius.sm, paddingHorizontal: 9, paddingVertical: 3 }}>
                <Text mono weight="semibold" size={12} color="#ffffff">Q{question.number}</Text>
              </View>
              <Text size={13} tone="mutedForeground">of {questions.length}</Text>
            </View>
            {question.type !== 'coding' && (
              <Text size={12} tone="mutedForeground"><Text size={12} weight="semibold" tone="success">+{question.marks ?? paper.room.marksPerQuestion}</Text>{paper.room.negativeMarks > 0 ? <> / <Text size={12} weight="semibold" tone="danger">−{paper.room.negativeMarks}</Text></> : null}</Text>
            )}
          </View>
          {question.topic ? <Text size={12} tone="mutedForeground" style={{ marginTop: 8 }}>{question.topic}</Text> : null}

          {question.type === 'coding' ? (
            <View style={{ marginTop: 16, gap: 12 }}>
              <Text size={17} weight="semibold">{question.title}</Text>
              <Alert tone="blue" icon={Laptop}>This coding problem has to be answered in the code editor on a computer. Ask your faculty if you can&apos;t switch devices.</Alert>
            </View>
          ) : (
            <>
              <Text size={17} weight="medium" leading={27} selectable={!paper.proctoring.blockCopyPaste} style={{ marginTop: 14 }}>{question.text}</Text>
              {question.imageUrl ? (
                <View style={[styles.imageBox, { borderColor: c.border, backgroundColor: c.card }]}>
                  <Image source={{ uri: question.imageUrl }} style={{ width: '100%', height: 220 }} contentFit="contain" accessibilityLabel={`Question ${question.number} diagram`} />
                </View>
              ) : null}
              <View accessibilityRole="radiogroup" style={{ gap: 10, marginTop: 20 }}>
                {question.options.map((option, index) => {
                  const active = selected === index
                  return (
                    <Pressable key={index} accessibilityRole="radio" accessibilityState={{ checked: active }}
                      onPress={() => { Haptics.selectionAsync().catch(() => {}); setAnswer(current, index) }}
                      style={({ pressed }) => [styles.option, { borderColor: active ? c.primary : c.border, borderWidth: active ? 1.5 : 1, backgroundColor: active ? c.primarySoft : pressed ? c.muted : c.card }]}>
                      <View style={[styles.optionLetter, { borderColor: active ? c.primary : c.borderStrong, backgroundColor: active ? c.primary : 'transparent' }]}>
                        <Text mono weight="semibold" size={12} color={active ? '#ffffff' : c.mutedForeground}>{letter(index)}</Text>
                      </View>
                      <Text size={15} leading={22} style={{ flex: 1, paddingTop: 3 }} selectable={false}>{option}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <Button variant="outline" size="sm" icon={isFlagged ? BookmarkCheck : Bookmark} onPress={() => toggleFlag(question.number)}
              style={isFlagged ? { borderColor: c.brand, backgroundColor: c.warningSoft } : undefined}>{isFlagged ? 'Marked for review' : 'Mark for review'}</Button>
            {question.type !== 'coding' && <Button variant="ghost" size="sm" icon={Eraser} disabled={selected === null} onPress={() => setAnswer(current, null)}>Clear</Button>}
          </View>
        </ScrollView>

        {/* Watermark with the student's identity discourages photographing the paper. */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden', opacity: 0.05 }]}>
          <View style={{ position: 'absolute', top: -200, left: -200, right: -200, bottom: -200, transform: [{ rotate: '-24deg' }], flexDirection: 'row', flexWrap: 'wrap', gap: 48, alignContent: 'flex-start' }}>
            {Array.from({ length: 60 }, (_, i) => <Text key={i} mono weight="semibold" size={12}>{watermark}</Text>)}
          </View>
        </View>
      </View>

      {/* Bottom navigation */}
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: c.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }}>
        <View style={styles.bottom}>
          <Button variant="outline" icon={ChevronLeft} disabled={current === 0} onPress={() => go(current - 1)} accessibilityLabel="Previous question" />
          <Pressable onPress={() => setNavOpen(true)} accessibilityLabel="Show all questions" style={({ pressed }) => [styles.navButton, { backgroundColor: pressed ? c.muted : c.secondary }]}>
            <LayoutGrid size={16} color={c.foreground} />
            <Text size={13} weight="medium" tabular>{answeredCount}/{questions.length}</Text>
          </Pressable>
          {isLast
            ? <Button icon={Send} style={{ flex: 1 }} onPress={() => { void flush(); setSubmitError(''); setFinishOpen(true) }}>Finish</Button>
            : <Button iconRight={ChevronRight} style={{ flex: 1 }} onPress={() => go(current + 1)}>Save & next</Button>}
        </View>
      </SafeAreaView>

      {/* Question navigator */}
      <Sheet open={navOpen} onClose={() => setNavOpen(false)} title="Questions" description={`${answeredCount} of ${questions.length} answered`}
        footer={<Button icon={Send} style={{ flex: 1 }} onPress={() => { setNavOpen(false); void flush(); setSubmitError(''); setFinishOpen(true) }}>Finish test</Button>}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {questions.map((q, index) => {
            const answered = isAnswered(answers[index])
            const review = flagged.includes(q.number)
            const seen = visited.has(index)
            const here = index === current
            return (
              <Pressable key={q.number} onPress={() => go(index)} accessibilityLabel={`Question ${index + 1}${answered ? ', answered' : ''}${review ? ', marked for review' : ''}`}
                style={[styles.cell, {
                  backgroundColor: answered ? c.success : seen ? c.dangerSoft : c.card,
                  borderColor: here ? c.primary : answered ? c.success : seen ? c.dangerBorder : c.border,
                  borderWidth: here ? 2 : 1,
                }]}>
                <Text size={13} weight="semibold" tabular color={answered ? '#ffffff' : seen ? c.danger : c.mutedForeground}>{q.type === 'coding' ? `P${index + 1}` : index + 1}</Text>
                {review && <View style={[styles.reviewDot, { backgroundColor: c.brand, borderColor: c.card }]} />}
              </Pressable>
            )
          })}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 18 }}>
          <Legend color={c.success} label="Answered" />
          <Legend color={c.dangerSoft} border={c.dangerBorder} label="Not answered" />
          <Legend color={c.card} border={c.border} label="Not visited" />
          <Legend color={c.brand} round label="For review" />
        </View>
      </Sheet>

      {/* Submit */}
      <Sheet open={finishOpen} onClose={() => !submitting && setFinishOpen(false)} dismissible={!submitting} title="Submit your exam?" description="You won't be able to change your answers after this."
        footer={<>
          <Button variant="outline" style={{ flex: 1 }} disabled={submitting} onPress={() => setFinishOpen(false)}>Keep working</Button>
          <Button style={{ flex: 1 }} loading={submitting} onPress={submit}>{submitting ? 'Submitting…' : 'Submit exam'}</Button>
        </>}>
        {submitError ? <Alert style={{ marginBottom: 14 }}>{submitError}</Alert> : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Summary label="Answered" value={answeredCount} color={c.success} />
          <Summary label="Not answered" value={questions.length - answeredCount} color={questions.length - answeredCount ? c.danger : c.mutedForeground} />
          <Summary label="For review" value={flagged.length} color={c.warning} />
        </View>
        {questions.length - answeredCount > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text size={13} tone="mutedForeground">Unanswered — tap to go back:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {questions.map((q, i) => (isAnswered(answers[i]) ? null : (
                <Pressable key={q.number} onPress={() => { setFinishOpen(false); go(i) }} style={[styles.chip, { borderColor: c.border }]}>
                  <Text mono size={12}>{i + 1}</Text>
                </Pressable>
              )))}
            </View>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 }}>
          <Clock3 size={15} color={c.mutedForeground} />
          <Text size={13} tone="mutedForeground" tabular>{clock(time)} remaining</Text>
        </View>
      </Sheet>

      {/* Rule broken */}
      <Sheet open={Boolean(violation) && !sessionLost} onClose={() => setViolation(null)} title="Warning: exam rule broken"
        footer={<Button style={{ flex: 1 }} onPress={() => setViolation(null)}>I understand, return to exam</Button>}>
        {violation && (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <ShieldAlert size={22} color={c.danger} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text weight="semibold">{MOBILE_HELP[violation.type]?.label ?? INTEGRITY_EVENTS[violation.type].label}</Text>
              <Text size={14} tone="mutedForeground" leading={21}>{MOBILE_HELP[violation.type]?.help ?? INTEGRITY_EVENTS[violation.type].help} This has been recorded and is visible to your faculty.</Text>
              {violation.maxViolations > 0 && (
                <Alert tone={violation.maxViolations - violation.violations <= 1 ? 'red' : 'amber'} style={{ marginTop: 8 }}>
                  {`Violations: ${violation.violations} of ${violation.maxViolations}. At ${violation.maxViolations} your exam is submitted automatically.`}
                </Alert>
              )}
            </View>
          </View>
        )}
      </Sheet>

      {/* Opened on another device */}
      {sessionLost && (
        <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: 'rgba(24,23,21,0.97)', padding: 28 }]}>
          <MonitorX size={40} color={c.brand} />
          <Text size={20} weight="semibold" color="#ffffff" center style={{ marginTop: 16 }}>This exam is open somewhere else</Text>
          <Text size={14} color="rgba(255,255,255,0.7)" center leading={21} style={{ marginTop: 8 }}>Your exam was opened on another device or browser, so this one was paused. This has been recorded and is visible to your faculty. Your timer is still running.</Text>
          <Text mono size={24} weight="semibold" color={c.brand} style={{ marginTop: 16 }}>{clock(time)}</Text>
          <Button style={{ marginTop: 20 }} onPress={() => claim().catch(err => { if (!handleConflict(err)) setLoadError(errorMessage(err)) })}>Continue on this phone</Button>
        </View>
      )}
    </View>
  )
}

function SaveIndicator({ state }: { state: 'saved' | 'saving' | 'offline' | 'error' }) {
  const warn = state === 'offline' || state === 'error'
  const color = warn ? '#fca5a5' : 'rgba(255,255,255,0.55)'
  const Icon = state === 'saving' ? Loader2 : state === 'offline' ? CloudOff : state === 'error' ? AlertTriangle : Check
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon size={11} color={color} />
      <Text size={11} color={color} numberOfLines={1}>{state === 'saving' ? 'Saving…' : state === 'offline' ? 'Offline — retrying' : state === 'error' ? 'Last change not saved' : 'All changes saved'}</Text>
    </View>
  )
}

function Summary({ label, value, color }: { label: string; value: number; color: string }) {
  const c = useColors()
  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, padding: 12, alignItems: 'center' }}>
      <Text size={24} weight="semibold" tabular color={color}>{value}</Text>
      <Text size={11} tone="mutedForeground" center>{label}</Text>
    </View>
  )
}

function Legend({ color, border, round, label }: { color: string; border?: string; round?: boolean; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 12, height: 12, borderRadius: round ? 6 : 3, backgroundColor: color, borderWidth: border ? 1 : 0, borderColor: border }} />
      <Text size={12} tone="mutedForeground">{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6 },
  imageBox: { marginTop: 14, borderWidth: 1, borderRadius: radius.lg, padding: 4, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 13 },
  optionLetter: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  navButton: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: 12, borderRadius: radius.md },
  cell: { width: 48, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  reviewDot: { position: 'absolute', top: -4, right: -4, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  chip: { minWidth: 34, height: 32, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
})
