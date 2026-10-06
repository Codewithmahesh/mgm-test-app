import { useKeepAwake } from 'expo-keep-awake'
import { router, useLocalSearchParams } from 'expo-router'
import { ArrowLeft, ArrowRight, Check, Clock, Flag, RotateCcw, X } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { AppState, BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { FadeIn, FadeInDown, FadeInLeft, FadeInRight, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { buzz, CodeBlock, Confetti, enter, FlowScreen, Meter, MissedCard, RadioOption, RelearnCard, ScoreRing, StickyFooter, Tap, WorkingOverlay } from '@/components/jems'
import { Alert, Badge, Button, Card, Heading, PageLoader, Row, Sheet, Text, Textarea, useFeedback } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { getPaper, submitAssessment, submitMiniAssessment, type Answer, type MiniResult, type Paper } from '@/lib/jems'
import { useJems, type Attempt } from '@/lib/jems-store'
import { fonts, radius, useColors } from '@/theme'

const WARN_SECONDS = 5 * 60
const isAnswered = (a: Answer | undefined) => (typeof a === 'number' ? true : Boolean(a?.trim()))
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function QuestionScreen() {
  const { module: moduleId } = useLocalSearchParams<{ module?: string }>()
  const key = moduleId ?? 'main'
  const c = useColors()
  const { toast, confirm } = useFeedback()
  const { attempts, saveAttempt } = useJems()
  useKeepAwake()

  const [paper, setPaper] = useState<Paper | null>(null)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState<Attempt | null>(attempts[key] ?? null)
  const [dir, setDir] = useState(1)
  const [now, setNow] = useState(() => Date.now())
  const [navOpen, setNavOpen] = useState(false)
  const [phase, setPhase] = useState<'answering' | 'working' | 'result'>('answering')
  const [result, setResult] = useState<MiniResult | null>(null)
  const submitted = useRef(false)

  // Load the paper; start a fresh attempt unless one is already running.
  useEffect(() => {
    getPaper(moduleId).then(p => {
      setPaper(p)
      setAttempt(a => a ?? { answers: {}, flagged: [], current: 0, endsAt: Date.now() + p.minutes * 60_000, leftApp: 0 })
    }).catch(err => setLoadError(errorMessage(err)))
  }, [moduleId])

  // Keep the attempt in the JEMS store so leaving and coming back resumes it.
  useEffect(() => { if (attempt && !submitted.current) saveAttempt(key, attempt) }, [attempt, key, saveAttempt])

  const secondsLeft = attempt ? Math.max(0, Math.round((attempt.endsAt - now) / 1000)) : 0
  const questions = paper?.questions ?? []
  const index = attempt?.current ?? 0
  const question = questions[index]
  const answered = questions.filter(q => isAnswered(attempt?.answers[q.id])).length
  const flaggedCount = attempt?.flagged.length ?? 0
  const isFlagged = Boolean(question && attempt?.flagged.includes(question.id))
  const last = index === questions.length - 1

  const update = (fn: (a: Attempt) => Attempt) => setAttempt(a => (a ? fn(a) : a))
  const go = (to: number) => {
    if (!attempt || to < 0 || to >= questions.length || to === index) return
    buzz('light')
    setDir(to > index ? 1 : -1)
    update(a => ({ ...a, current: to }))
  }
  const answer = (value: Answer) => question && update(a => ({ ...a, answers: { ...a.answers, [question.id]: value } }))
  const toggleFlag = () => {
    if (!question) return
    buzz(isFlagged ? 'light' : 'medium')
    update(a => ({ ...a, flagged: isFlagged ? a.flagged.filter(id => id !== question.id) : [...a.flagged, question.id] }))
  }

  function submit(auto: boolean) {
    if (submitted.current || !attempt) return
    submitted.current = true
    if (auto) toast("Time's up. Submitting your answers.", 'info')
    setNavOpen(false)
    setPhase('working')
  }
  // The timer calls the latest submit through this ref.
  const submitRef = useRef(submit)
  useEffect(() => { submitRef.current = submit })

  // One tick per second; submits itself at zero.
  useEffect(() => {
    if (!attempt || phase !== 'answering') return
    const timer = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= attempt.endsAt) submitRef.current(true)
    }, 1000)
    return () => clearInterval(timer)
  }, [attempt, phase])

  // Leaving the app is recorded, as the intro screen says.
  useEffect(() => {
    let leftAt = 0
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background') leftAt = Date.now()
      if (state === 'active' && leftAt && !submitted.current) {
        leftAt = 0
        buzz('warning')
        setAttempt(a => (a ? { ...a, leftApp: a.leftApp + 1 } : a))
        toast('You left the app. That has been recorded.', 'info')
      }
    })
    return () => sub.remove()
  }, [toast])

  async function exit() {
    if (phase !== 'answering') return
    const ok = await confirm({ title: 'Leave the assessment?', description: 'Your answers are saved and the timer keeps running.', confirmLabel: 'Leave', cancelLabel: 'Stay' })
    if (ok) router.back()
  }

  // Android back asks first instead of dropping the test.
  const exitRef = useRef(exit)
  useEffect(() => { exitRef.current = exit })
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (submitted.current) return false
      void exitRef.current()
      return true
    })
    return () => sub.remove()
  }, [])

  async function finish() {
    const left = questions.length - answered
    const ok = await confirm({
      title: paper?.mode === 'mini' ? 'Submit the mini-assessment?' : 'Submit your assessment?',
      description: left ? `${left} question${left === 1 ? ' is' : 's are'} still unanswered. You can't change answers after submitting.` : "Nice, every question is answered. You can't change answers after submitting.",
      confirmLabel: 'Submit',
    })
    if (ok) submit(false)
  }

  const swipe = Gesture.Pan().activeOffsetX([-24, 24]).failOffsetY([-14, 14]).runOnJS(true)
    .onEnd(e => { if (e.translationX < -60) go(index + 1); else if (e.translationX > 60) go(index - 1) })

  if (loadError) return <SafeAreaView style={{ flex: 1, backgroundColor: c.background, padding: 16, gap: 12 }}><Alert>{loadError}</Alert><Button variant="outline" onPress={() => router.back()}>Go back</Button></SafeAreaView>
  if (!paper || !attempt || !question) return <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}><PageLoader /></SafeAreaView>

  if (phase === 'result' && result) return <MiniResultView result={result} onRetry={() => {
    submitted.current = false
    setResult(null)
    setAttempt({ answers: {}, flagged: [], current: 0, endsAt: Date.now() + paper.minutes * 60_000, leftApp: 0 })
    setNow(Date.now())
    setPhase('answering')
  }} />

  const low = secondsLeft <= WARN_SECONDS
  const Enter = dir > 0 ? FadeInRight : FadeInLeft

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header: close · question n of N · timer */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={exit} hitSlop={6} accessibilityRole="button" accessibilityLabel="Leave the assessment"
          style={({ pressed }) => [styles.close, { backgroundColor: pressed ? c.muted : 'transparent' }]}>
          <X size={24} color={c.mutedForeground} />
        </Pressable>
        <Text size={17} weight="semibold" style={{ flex: 1 }} accessibilityRole="header">
          {`Question ${index + 1} `}<Text size={17} weight="medium" tone="mutedForeground">{`of ${questions.length}`}</Text>
        </Text>
        <Timer seconds={secondsLeft} low={low} />
      </View>
      <Meter value={((index + 1) / questions.length) * 100} from={0} height={4} rounded={false} track={c.border} label="Progress through the questions" />

      <GestureDetector gesture={swipe}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <Animated.View key={question.id} entering={Enter.springify().damping(20).stiffness(170)} style={{ gap: 16 }}>
            <Row gap={8}>
              <Badge tone="blue">{question.skill}</Badge>
              <Badge>{question.difficulty}</Badge>
              {question.kind === 'code' && <Badge tone="violet">Write code</Badge>}
            </Row>
            <Heading size={25}>{question.prompt}</Heading>
            {question.code ? <CodeBlock code={question.code} /> : null}
            {question.kind === 'mcq' ? (
              <View style={{ gap: 12 }} accessibilityRole="radiogroup">
                {question.options?.map((option, i) => (
                  <Animated.View key={option} entering={FadeInDown.delay(80 + i * 55).springify().damping(18)}>
                    <RadioOption label={option} selected={attempt.answers[question.id] === i} onPress={() => answer(i)} />
                  </Animated.View>
                ))}
              </View>
            ) : (
              <Textarea rows={7} mono value={String(attempt.answers[question.id] ?? '')} onChangeText={answer} placeholder="Write your answer here…"
                autoCapitalize="none" autoCorrect={false} spellCheck={false} accessibilityLabel="Your code answer" />
            )}
          </Animated.View>

          <Card>
            <View style={styles.summary}>
              <Text size={14} tone="mutedForeground"><Text size={14} weight="semibold" tone="successInk" tabular>{answered}</Text> answered</Text>
              <Text size={14} tone="mutedForeground"><Text size={14} weight="semibold" tone="warningInk" tabular>{flaggedCount}</Text> flagged</Text>
              <Text size={14} tone="mutedForeground"><Text size={14} weight="semibold" tabular>{questions.length - answered}</Text> left</Text>
              <Pressable onPress={() => setNavOpen(true)} hitSlop={10} accessibilityRole="button" style={{ marginLeft: 'auto', minHeight: 44, justifyContent: 'center' }}>
                <Text size={14} weight="semibold" tone="primary">View all</Text>
              </Pressable>
            </View>
          </Card>
          <Text size={12} tone="subtle" center>Swipe left or right to move between questions</Text>
        </ScrollView>
      </GestureDetector>

      <StickyFooter row>
        <FlagButton flagged={isFlagged} onPress={toggleFlag} />
        <Button variant="outline" size="lg" icon={ArrowLeft} disabled={index === 0} onPress={() => go(index - 1)} style={{ flex: 1 }}>Previous</Button>
        {last
          ? <Button size="lg" icon={Check} onPress={finish} style={{ flex: 1.15 }}>Finish</Button>
          : <Button size="lg" iconRight={ArrowRight} onPress={() => go(index + 1)} style={{ flex: 1.15 }}>Next</Button>}
      </StickyFooter>

      <Sheet open={navOpen} onClose={() => setNavOpen(false)} title="All questions" description={`${answered} of ${questions.length} answered`}
        footer={<Button full size="lg" icon={Check} onPress={() => { setNavOpen(false); void finish() }} style={{ flex: 1 }}>Submit now</Button>}>
        <View style={styles.grid}>
          {questions.map((q, i) => {
            const done = isAnswered(attempt.answers[q.id])
            const flagged = attempt.flagged.includes(q.id)
            const current = i === index
            return (
              <Animated.View key={q.id} entering={FadeIn.delay(i * 12)}>
                <Tap onPress={() => { setNavOpen(false); go(i) }} accessibilityLabel={`Question ${i + 1}${done ? ', answered' : ''}${flagged ? ', flagged' : ''}`}
                  style={[styles.cell, { backgroundColor: done ? c.primarySoft : c.card, borderColor: current ? c.primary : flagged ? c.warning : c.border, borderWidth: current ? 2 : 1 }]}>
                  <Text size={15} weight="semibold" color={done ? c.primaryInk : c.foreground} tabular>{i + 1}</Text>
                  {flagged && <View style={[styles.flagDot, { backgroundColor: c.warning }]} />}
                </Tap>
              </Animated.View>
            )
          })}
        </View>
        <Row gap={16} wrap style={{ marginTop: 16 }}>
          <Legend color={c.primarySoft} border={c.primaryBorder} label="Answered" />
          <Legend color={c.card} border={c.warning} label="Flagged" />
          <Legend color={c.card} border={c.primary} label="Current" />
        </Row>
      </Sheet>

      {phase === 'working' && (
        <WorkingOverlay
          eyebrow={paper.mode === 'mini' ? 'Mini-assessment' : 'Skill assessment'}
          title={paper.mode === 'mini' ? 'Checking your answers' : 'Building your skill report'}
          steps={paper.mode === 'mini'
            ? ['Scoring your answers', 'Finding topics to relearn', 'Updating your roadmap']
            : ['Scoring your answers', 'Reviewing your GitHub repos', 'Reading your LeetCode history', 'Comparing with MSME job roles']}
          task={async () => {
            if (paper.mode === 'mini' && moduleId) setResult(await submitMiniAssessment(moduleId, attempt.answers))
            else await submitAssessment(attempt.answers, { leftApp: attempt.leftApp })
          }}
          onDone={() => {
            saveAttempt(key, null)
            if (paper.mode === 'mini') setPhase('result')
            else router.dismissTo('/student/jems/report?celebrate=1')
          }}
          onError={message => { submitted.current = false; setPhase('answering'); toast(message, 'error') }}
        />
      )}
    </SafeAreaView>
  )
}

/** Countdown pill: calm amber, then red with a heartbeat for the last five minutes. */
function Timer({ seconds, low }: { seconds: number; low: boolean }) {
  const c = useColors()
  const reduce = useReducedMotion()
  const beat = useSharedValue(1)
  useEffect(() => {
    if (!low || reduce) { beat.set(1); return }
    beat.set(withRepeat(withSequence(withTiming(1.07, { duration: 160 }), withTiming(1, { duration: 640 })), -1, false))
  }, [low, reduce, beat])
  const style = useAnimatedStyle(() => ({ transform: [{ scale: beat.get() }] }))
  const tone = low ? { bg: c.dangerSoft, border: c.dangerBorder, fg: c.dangerInk } : { bg: c.warningSoft, border: c.warningBorder, fg: c.warningInk }
  return (
    <Animated.View style={[styles.timer, { backgroundColor: tone.bg, borderColor: tone.border }, style]}
      accessible accessibilityRole="timer" accessibilityLabel={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds left`}>
      <Clock size={16} color={tone.fg} />
      <Text size={16} color={tone.fg} style={{ fontFamily: fonts.monoSemibold }} tabular>{clock(seconds)}</Text>
    </Animated.View>
  )
}

/** Square flag toggle that wiggles when a question gets flagged. */
function FlagButton({ flagged, onPress }: { flagged: boolean; onPress: () => void }) {
  const c = useColors()
  const tilt = useSharedValue(0)
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${tilt.get()}deg` }] }))
  return (
    <Tap onPress={() => {
      if (!flagged) tilt.set(withSequence(withTiming(-16, { duration: 70 }), withTiming(12, { duration: 90 }), withTiming(-6, { duration: 80 }), withTiming(0, { duration: 70 })))
      onPress()
    }} haptic={false} accessibilityRole="button" accessibilityLabel={flagged ? 'Remove flag' : 'Flag this question'} accessibilityState={{ selected: flagged }}
      style={[styles.flag, { borderColor: flagged ? c.warning : c.borderStrong, backgroundColor: flagged ? c.warningSoft : c.card }]}>
      <Animated.View style={style}>
        <Flag size={20} color={flagged ? c.warning : c.mutedForeground} fill={flagged ? c.warning : 'none'} />
      </Animated.View>
    </Tap>
  )
}

function Legend({ color, border, label }: { color: string; border: string; label: string }) {
  return (
    <Row gap={6}>
      <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: border, backgroundColor: color }} />
      <Text size={13} tone="mutedForeground">{label}</Text>
    </Row>
  )
}

/**
 * Mini-assessment result: ring, verdict and next step, with confetti on a pass.
 * Below the pass mark it also breaks down what went wrong and which topics to relearn.
 */
function MiniResultView({ result, onRetry }: { result: MiniResult; onRetry: () => void }) {
  const c = useColors()
  useEffect(() => { buzz(result.passed ? 'success' : 'warning') }, [result.passed])
  if (!result.passed) return (
    <FlowScreen footer={
      <StickyFooter row>
        <Button size="lg" variant="outline" onPress={() => router.back()} style={{ flex: 1 }}>Review the module</Button>
        <Button size="lg" icon={RotateCcw} onPress={onRetry} style={{ flex: 1 }}>Try again</Button>
      </StickyFooter>
    }>
      <Animated.View entering={enter(0)} style={{ alignItems: 'center', paddingTop: 12 }}>
        <ScoreRing value={result.percent} size={148} stroke={13} color={c.warning} label={`You scored ${result.percent} percent`} />
      </Animated.View>
      <Animated.View entering={enter(1)} style={{ alignItems: 'center', gap: 8 }}>
        <Heading size={28} center>Almost there</Heading>
        <Text size={15} leading={22} tone="mutedForeground" center>
          {`${result.correct} of ${result.total} correct. You need ${result.passPercent}% to pass. ` +
            (result.relearn.length
              ? `Go over ${result.relearn.length === 1 ? 'this topic' : `these ${result.relearn.length} topics`}, then try again.`
              : 'Review the lessons, then try again.')}
        </Text>
      </Animated.View>
      <Animated.View entering={enter(2)}><RelearnCard topics={result.relearn} /></Animated.View>
      <Animated.View entering={enter(3)}><MissedCard missed={result.missed} /></Animated.View>
    </FlowScreen>
  )
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={styles.result}>
        <Animated.View entering={enter(0)} style={{ alignItems: 'center' }}>
          <ScoreRing value={result.percent} size={168} stroke={14} color={result.passed ? c.success : c.warning} label={`You scored ${result.percent} percent`} />
        </Animated.View>
        <Animated.View entering={enter(1)} style={{ alignItems: 'center', gap: 8 }}>
          <Heading size={30} center>Module complete!</Heading>
          <Text size={15} tone="mutedForeground" center>
            {`${result.correct} of ${result.total} correct.${result.nextModuleId ? ' The next module is unlocked.' : ''}`}
          </Text>
        </Animated.View>
        <Animated.View entering={enter(2)} style={{ alignSelf: 'stretch', gap: 10, marginTop: 12 }}>
          <Button size="lg" full iconRight={ArrowRight} onPress={() => router.dismissTo('/student/jems/roadmap')}>Back to roadmap</Button>
        </Animated.View>
      </View>
      <Confetti run={1} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 8, minHeight: 60 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 14, height: 40, marginRight: 8 },
  body: { padding: 16, paddingBottom: 28, gap: 18 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 4, flexWrap: 'wrap' },
  flag: { width: 52, height: 50, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  flagDot: { position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: 4 },
  result: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
})
