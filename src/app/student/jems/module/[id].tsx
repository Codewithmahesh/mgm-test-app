import { router, useLocalSearchParams } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { ArrowRight, BookOpen, Check, ChevronRight, CircleCheck, CirclePlay, FileText, Lock, Play, Target, type LucideIcon } from 'lucide-react-native'
import { useRef, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import Animated, { LinearTransition, ZoomIn } from 'react-native-reanimated'
import { buzz, Confetti, enter, FlowScreen, Pulse, RelearnCard, StickyFooter, Tap, TickBox, usePop, useShake } from '@/components/jems'
import { Alert, Badge, Button, Card, CardHeader, Divider, Heading, IconTile, PageLoader, Row, ScreenHeader, Text, useFeedback } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { completeLesson, getModule, miniUnlocked, nextLesson, PRIORITY_META, setPracticeDone, type Resource, type RoadmapModule } from '@/lib/jems'
import { useJemsData } from '@/lib/jems-store'
import { radius, useColors } from '@/theme'

const RESOURCE_ICON: Record<Resource['kind'], LucideIcon> = { video: CirclePlay, docs: BookOpen, article: FileText }

export default function ModuleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const c = useColors()
  const { toast } = useFeedback()
  const { data: mod, setData, error, reload } = useJemsData(() => getModule(id))
  const [busy, setBusy] = useState(false)
  const [burst, setBurst] = useState(0)
  const scroll = useRef<ScrollView>(null)
  const { style: miniShake, shake } = useShake()
  const unlocked = mod ? miniUnlocked(mod) : false
  const miniPop = usePop(unlocked, 1.05)

  /** Apply an update from the data layer and celebrate if it just unlocked the mini-assessment. */
  function apply(next: RoadmapModule) {
    const was = mod ? miniUnlocked(mod) : false
    setData(next)
    if (!was && miniUnlocked(next)) {
      buzz('success')
      setBurst(b => b + 1)
      toast('Mini-assessment unlocked!', 'success')
    }
  }

  async function finishLesson() {
    const lesson = mod && nextLesson(mod)
    if (!mod || !lesson) return
    setBusy(true)
    try {
      apply(await completeLesson(mod.id, lesson.id))
      buzz('success')
      toast(`Lesson done: ${lesson.title}`)
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function togglePractice(itemId: string, done: boolean) {
    if (!mod) return
    // Optimistic: tick it now, confirm with the data layer.
    setData({ ...mod, practice: mod.practice.map(p => (p.id === itemId ? { ...p, done } : p)) })
    try { apply(await setPracticeDone(mod.id, itemId, done)) } catch (err) { toast(errorMessage(err), 'error'); void reload() }
  }

  function openMini() {
    if (!mod) return
    if (mod.mini.passed) return toast('You already passed this one.', 'info')
    if (!unlocked) {
      shake()
      return toast('Finish every lesson and practice task to unlock it.', 'info')
    }
    router.push(`/student/jems/assessment/question?module=${mod.id}`)
  }

  if (error) return <FlowScreen header={<ScreenHeader title="Module" />}><Alert>{error}</Alert></FlowScreen>
  if (!mod) return <FlowScreen header={<ScreenHeader title="Module" />}><PageLoader /></FlowScreen>

  const locked = mod.status === 'locked'
  const upNext = nextLesson(mod)
  const lessonsDone = mod.lessons.filter(l => l.done).length
  const practiceDone = mod.practice.filter(p => p.done).length
  const lastFail = !mod.mini.passed ? mod.mini.lastFail ?? null : null

  const footer = locked
    ? <Button size="lg" full icon={Lock} disabled>Finish the previous module first</Button>
    : upNext
      ? <Button size="lg" full iconRight={ArrowRight} loading={busy} onPress={finishLesson}>{`Continue: ${upNext.title}`}</Button>
      : mod.mini.passed
        ? <Button size="lg" full variant="outline" onPress={() => router.back()}>Back to roadmap</Button>
        : unlocked
          ? <Button size="lg" full icon={Target} onPress={openMini}>{lastFail ? 'Retake the mini-assessment' : 'Take the mini-assessment'}</Button>
          : <Button size="lg" full iconRight={ArrowRight} onPress={() => scroll.current?.scrollToEnd({ animated: true })}>Finish your practice</Button>

  return (
    <View style={{ flex: 1 }}>
      <FlowScreen scrollRef={scroll} onRefresh={reload}
        header={<ScreenHeader title={`Module ${mod.index}`} right={<Text mono size={14} tone="mutedForeground" style={{ paddingRight: 8 }}>{mod.weeks}</Text>} />}
        footer={<StickyFooter>{footer}</StickyFooter>}>
        <Animated.View entering={enter(0)} style={{ gap: 12 }}>
          <Heading size={32}>{mod.title}</Heading>
          <Row gap={8} wrap>
            {mod.gaps.map(g => <Badge key={g.label} tone={PRIORITY_META[g.priority].tone}>{`Closes gap: ${g.label}`}</Badge>)}
            <Badge>{`${mod.levelFrom} → ${mod.levelTo}`}</Badge>
            <Badge>{`About ${mod.hours} hrs`}</Badge>
          </Row>
        </Animated.View>

        {lastFail && (
          <Animated.View entering={enter(1)} style={{ gap: 12 }}>
            <Alert tone="amber" icon={Target}>
              {`Your last mini-assessment try scored ${lastFail.percent}% (pass is ${mod.mini.passPercent}%). Go over these topics, then retake it.`}
            </Alert>
            <RelearnCard topics={lastFail.relearn} />
          </Animated.View>
        )}

        <Animated.View entering={enter(1)}>
          <Card>
            <CardHeader title={<Text size={17} weight="semibold">Why this matters</Text>} />
            <Text size={16} leading={25} tone="mutedForeground" style={{ paddingHorizontal: 16, paddingBottom: 16 }}>{mod.why}</Text>
          </Card>
        </Animated.View>

        <Animated.View entering={enter(2)} layout={LinearTransition}>
          <Card>
            <CardHeader flush title={<Text size={17} weight="semibold">Lessons</Text>} action={<Text size={14} tone="mutedForeground" tabular>{`${lessonsDone} of ${mod.lessons.length} done`}</Text>} />
            {mod.lessons.map((lesson, i) => {
              const isNext = !locked && lesson.id === upNext?.id
              const state = lesson.done ? 'done' : isNext ? 'next' : 'locked'
              const before = mod.lessons[i - 1]
              return (
                <Animated.View key={lesson.id} layout={LinearTransition}>
                  {i > 0 && <Divider />}
                  <Tap disabled={!isNext || busy} onPress={finishLesson} haptic={false} scaleTo={0.985}
                    accessibilityRole="button" accessibilityLabel={`${lesson.title}, ${state === 'done' ? 'completed' : state === 'next' ? `up next, ${lesson.minutes} minutes` : 'locked'}`}
                    style={[styles.lesson, isNext && { backgroundColor: c.primarySoft }]}>
                    {state === 'done' ? (
                      <Animated.View key="done" entering={ZoomIn.springify().damping(12)}><IconTile icon={Check} tone="green" size={44} /></Animated.View>
                    ) : state === 'next' ? (
                      <View style={styles.playWrap}>
                        <Pulse color={c.primary} size={44} radius={radius.md} />
                        <View style={[styles.play, { backgroundColor: c.primary }]}><Play size={20} color={c.primaryForeground} fill={c.primaryForeground} /></View>
                      </View>
                    ) : <IconTile icon={Lock} tone="neutral" size={44} />}
                    <View style={{ flex: 1 }}>
                      <Text size={17} weight={state === 'next' ? 'semibold' : 'medium'} color={state === 'next' ? c.primaryInk : state === 'locked' ? c.mutedForeground : undefined}>{lesson.title}</Text>
                      <Text size={14} color={state === 'next' ? c.primaryInk : c.mutedForeground}>
                        {state === 'done' ? 'Completed' : state === 'next' ? `Up next · ${lesson.minutes} min` : locked ? 'Unlocks with this module' : `Unlocks after ${before?.title ?? 'the previous lesson'}`}
                      </Text>
                    </View>
                  </Tap>
                </Animated.View>
              )
            })}
          </Card>
        </Animated.View>

        <Animated.View entering={enter(3)}>
          <Card>
            <CardHeader flush title={<Text size={17} weight="semibold">Learn from</Text>} />
            {mod.resources.length === 0 ? (
              <Text size={14} tone="mutedForeground" style={{ padding: 16 }}>Hand-picked videos, docs and articles appear here when this module opens.</Text>
            ) : mod.resources.map((resource, i) => (
              <View key={resource.id}>
                {i > 0 && <Divider />}
                <Tap scaleTo={0.985} onPress={() => { WebBrowser.openBrowserAsync(resource.url, { toolbarColor: c.card, controlsColor: c.primary }).catch(() => toast("Couldn't open the link.", 'error')) }}
                  accessibilityRole="link" accessibilityLabel={`${resource.title}, ${resource.meta}`} style={styles.resource}>
                  <IconTile icon={RESOURCE_ICON[resource.kind]} tone="blue" size={44} />
                  <View style={{ flex: 1 }}>
                    <Text size={16} weight="medium">{resource.title}</Text>
                    <Text size={14} tone="mutedForeground">{resource.meta}</Text>
                  </View>
                  <ChevronRight size={20} color={c.mutedForeground} />
                </Tap>
              </View>
            ))}
          </Card>
        </Animated.View>

        <Animated.View entering={enter(4)}>
          <Card>
            <CardHeader flush title={<Text size={17} weight="semibold">Practice</Text>} action={<Text size={14} tone="mutedForeground" tabular>{`${practiceDone} of ${mod.practice.length} done`}</Text>} />
            {mod.practice.map((item, i) => (
              <View key={item.id}>
                {i > 0 && <Divider />}
                <Tap disabled={locked} onPress={() => togglePractice(item.id, !item.done)} haptic={item.done ? 'light' : 'success'} scaleTo={0.985}
                  accessibilityRole="checkbox" accessibilityState={{ checked: item.done, disabled: locked }} accessibilityLabel={item.title} style={styles.practice}>
                  <View style={{ paddingTop: 1 }}><TickBox checked={item.done} tone="success" /></View>
                  <View style={{ flex: 1 }}>
                    <Text size={16} weight={item.done ? 'regular' : 'medium'} color={item.done ? c.mutedForeground : undefined}
                      style={item.done ? { textDecorationLine: 'line-through' } : undefined}>{item.title}</Text>
                    {item.detail ? <Text size={14} tone="mutedForeground" style={{ marginTop: 2 }}>{item.detail}</Text> : null}
                  </View>
                </Tap>
              </View>
            ))}
          </Card>
        </Animated.View>

        <Animated.View entering={enter(5)} style={miniShake}>
          <Tap onPress={openMini} haptic={false} accessibilityRole="button"
            accessibilityLabel={`Mini-assessment, ${mod.mini.questions} questions${mod.mini.passed ? ', passed' : unlocked ? '' : ', locked'}`}>
            <Animated.View style={[styles.mini, { backgroundColor: c.violetSoft, borderColor: c.violetBorder }, miniPop]}>
              <View style={[styles.miniIcon, { backgroundColor: c.card }]}><Target size={24} color={c.violet} /></View>
              <View style={{ flex: 1 }}>
                <Text size={17} weight="semibold" color={c.violet}>Mini-assessment</Text>
                <Text size={14} leading={20} color={c.violet} style={{ marginTop: 2 }}>
                  {`${mod.mini.questions} questions. Pass at ${mod.mini.passPercent}% to ${mod.index < 5 ? `unlock Module ${mod.index + 1}` : 'finish your roadmap'}.${lastFail ? ` Last try: ${lastFail.percent}%.` : ''}`}
                </Text>
              </View>
              {mod.mini.passed ? <CircleCheck size={22} color={c.success} />
                : unlocked ? <Animated.View key="open" entering={ZoomIn.springify().damping(10)}><ArrowRight size={22} color={c.violet} /></Animated.View>
                : <Lock size={20} color={c.violet} />}
            </Animated.View>
          </Tap>
        </Animated.View>
      </FlowScreen>
      <Confetti run={burst} />
    </View>
  )
}

const styles = StyleSheet.create({
  lesson: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12, minHeight: 64 },
  playWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  play: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  resource: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12, minHeight: 64 },
  practice: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingHorizontal: 16, paddingVertical: 16, minHeight: 56 },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: radius.lg, padding: 16 },
  miniIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
})
