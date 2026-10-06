import { router } from 'expo-router'
import { ArrowRight, Check, ChevronDown, CodeXml, ShieldCheck } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import Animated, { FadeInDown, LinearTransition, ZoomIn } from 'react-native-reanimated'
import { buzz, enter, FlowScreen, GithubMark, StepHeader, StepProgress, StickyFooter, Tap, TickBox, useShake } from '@/components/jems'
import { Badge, Button, Card, Divider, Field, Heading, Input, Row, Text, useFeedback } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { GITHUB_PATTERN, LEETCODE_PATTERN, MAX_REPOS, saveOnboarding, verifyGithub, verifyLeetcode } from '@/lib/jems'
import { useJems } from '@/lib/jems-store'
import { radius, useColors } from '@/theme'

type CheckState = { checking: boolean; error: string }

/** Verifies a profile link a moment after the student stops typing a valid one. */
function useLinkCheck<T>(value: string, pattern: RegExp, found: T | null, verify: (link: string) => Promise<T>, onFound: (result: T) => void): CheckState & { valid: boolean } {
  const [state, setState] = useState<CheckState>({ checking: false, error: '' })
  const valid = pattern.test(value.trim())
  useEffect(() => {
    if (!valid || found) return
    let alive = true
    const timer = setTimeout(() => {
      setState({ checking: true, error: '' })
      verify(value)
        .then(result => { if (!alive) return; setState({ checking: false, error: '' }); buzz('success'); onFound(result) })
        .catch(err => { if (!alive) return; setState({ checking: false, error: errorMessage(err) }); buzz('error') })
    }, 700)
    return () => { alive = false; clearTimeout(timer) }
    // Re-run only when the link itself changes; the callbacks are recreated each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, valid, found])
  return { ...state, checking: state.checking && valid && !found, valid }
}

export default function ConnectStep() {
  const c = useColors()
  const { toast } = useFeedback()
  const { draft, setLinks, lookups, setLookup } = useJems()
  const { links } = draft
  const [touched, setTouched] = useState({ github: false, leetcode: false })
  const [showAll, setShowAll] = useState(false)
  const [saving, setSaving] = useState(false)
  const { style: shakeStyle, shake } = useShake()
  const { style: repoShake, shake: shakeRepos } = useShake()

  const github = useLinkCheck(links.github, GITHUB_PATTERN, lookups.github, verifyGithub, result => setLookup('github', result))
  const leetcode = useLinkCheck(links.leetcode, LEETCODE_PATTERN, lookups.leetcode, verifyLeetcode, result => setLookup('leetcode', result))

  const repos = lookups.github?.repos ?? []
  const visibleRepos = showAll ? repos : repos.slice(0, 3)

  function toggleRepo(name: string) {
    const picked = links.repos.includes(name)
    if (!picked && links.repos.length >= MAX_REPOS) {
      shakeRepos()
      toast(`You can pick up to ${MAX_REPOS} repos. Untick one first.`, 'info')
      return
    }
    setLinks({ repos: picked ? links.repos.filter(r => r !== name) : [...links.repos, name] })
  }

  async function start() {
    if (!lookups.github || links.repos.length === 0) {
      shake()
      toast(!lookups.github ? 'Add your GitHub link so we can review your projects.' : 'Pick at least one repo for review.', 'info')
      return
    }
    setSaving(true)
    try {
      await saveOnboarding(draft, lookups)
      router.push('/student/jems/assessment')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FlowScreen
      header={<StepHeader title="Connect your profiles" step={3} />}
      footer={(
        <StickyFooter caption={(
          <Row gap={8} style={{ alignItems: 'flex-start' }}>
            <ShieldCheck size={17} color={c.primary} style={{ marginTop: 1 }} />
            <Text size={13} tone="mutedForeground" style={{ flex: 1 }}>We read public data only. Analysis runs while you take the assessment.</Text>
          </Row>
        )}>
          <Animated.View style={shakeStyle}>
            <Button size="lg" full iconRight={ArrowRight} loading={saving} onPress={start}>Start assessment</Button>
          </Animated.View>
        </StickyFooter>
      )}>
      <StepProgress step={3} />

      <Animated.View entering={enter(0)}>
        <Heading size={30}>Show us your work</Heading>
        <Text size={15} tone="mutedForeground" style={{ marginTop: 6 }}>Your code and problem-solving history give us a real read on projects and DSA.</Text>
      </Animated.View>

      {/* GitHub */}
      <Animated.View entering={enter(1)} layout={LinearTransition}>
        <Card>
          <LinkHeader title="GitHub" icon={<GithubMark size={20} color={c.foreground} />} tileColor={c.muted} checking={github.checking} verified={Boolean(lookups.github)} />
          <Divider />
          <View style={styles.body}>
            <Field hint={!lookups.github && (github.error || (touched.github && links.github && !github.valid))
              ? <Text size={12} tone="danger">{github.error || 'Use a link like github.com/your-name'}</Text> : undefined}>
              <Input mono value={links.github} placeholder="github.com/your-username" accessibilityLabel="GitHub profile link"
                onChangeText={github => { setLinks({ github, repos: [] }); if (lookups.github) setLookup('github', null) }}
                onBlur={() => setTouched(t => ({ ...t, github: true }))}
                autoCapitalize="none" autoCorrect={false} keyboardType="url" textContentType="URL" returnKeyType="next"
                invalid={Boolean(github.error)} style={lookups.github ? { borderColor: c.successBorder } : undefined} />
            </Field>
            {lookups.github && (
              <Animated.View entering={FadeInDown.duration(220)} style={{ gap: 10 }}>
                <Animated.View style={repoShake}>
                  <Text size={14} tone="mutedForeground">{`${lookups.github.repoCount} public repos found. Pick up to ${MAX_REPOS} for review.`}</Text>
                </Animated.View>
                {visibleRepos.map((repo, i) => {
                  const picked = links.repos.includes(repo.name)
                  const meta = [repo.language, repo.isFork ? 'fork' : null].filter(Boolean).join(' · ')
                  return (
                    <Animated.View key={repo.name} entering={enter(i)} layout={LinearTransition}>
                      <Tap onPress={() => toggleRepo(repo.name)} accessibilityRole="checkbox" accessibilityState={{ checked: picked }} accessibilityLabel={meta ? `${repo.name}, ${meta}` : repo.name}
                        style={[styles.repo, { borderColor: picked ? c.primary : c.border, backgroundColor: picked ? c.primarySoft : c.card }]}>
                        <TickBox checked={picked} />
                        <View style={{ flex: 1, minWidth: 0, paddingVertical: 8 }}>
                          <Text mono size={15} weight={picked ? 'semibold' : 'regular'} color={picked ? c.primaryInk : c.foreground} numberOfLines={1}>{repo.name}</Text>
                          {repo.description ? <Text size={12} color={picked ? c.primaryInk : c.mutedForeground} numberOfLines={1} style={{ marginTop: 2 }}>{repo.description}</Text> : null}
                        </View>
                        {meta ? <Text size={13} color={picked ? c.primaryInk : c.mutedForeground}>{meta}</Text> : null}
                      </Tap>
                    </Animated.View>
                  )
                })}
                {repos.length > 3 && (
                  <Tap onPress={() => setShowAll(v => !v)} accessibilityRole="button" style={styles.more}>
                    <Text size={14} weight="medium" tone="primary">{showAll ? 'Show fewer' : `Show ${repos.length - 3} more repos`}</Text>
                    <ChevronDown size={16} color={c.primary} style={{ transform: [{ rotate: showAll ? '180deg' : '0deg' }] }} />
                  </Tap>
                )}
              </Animated.View>
            )}
          </View>
        </Card>
      </Animated.View>

      {/* LeetCode */}
      <Animated.View entering={enter(2)} layout={LinearTransition}>
        <Card>
          <LinkHeader title="LeetCode" icon={<CodeXml size={20} color={c.warning} />} tileColor={c.warningSoft} checking={leetcode.checking} verified={Boolean(lookups.leetcode)} optional />
          <Divider />
          <View style={styles.body}>
            <Field hint={!lookups.leetcode && (leetcode.error || (touched.leetcode && links.leetcode && !leetcode.valid))
              ? <Text size={12} tone="danger">{leetcode.error || 'Use a link like leetcode.com/u/your-name'}</Text> : undefined}>
              <Input mono value={links.leetcode} placeholder="leetcode.com/u/your-username" accessibilityLabel="LeetCode profile link"
                onChangeText={leetcode => { setLinks({ leetcode }); if (lookups.leetcode) setLookup('leetcode', null) }}
                onBlur={() => setTouched(t => ({ ...t, leetcode: true }))}
                autoCapitalize="none" autoCorrect={false} keyboardType="url" textContentType="URL" returnKeyType="done"
                invalid={Boolean(leetcode.error)} style={lookups.leetcode ? { borderColor: c.successBorder } : undefined} />
            </Field>
            {lookups.leetcode && (
              <Animated.View entering={FadeInDown.duration(220)}>
                <Text size={14} tone="mutedForeground">
                  {`Profile found. ${lookups.leetcode.solved} problems solved (${lookups.leetcode.byDifficulty.map(d => `${d.solved} ${d.label.toLowerCase()}`).join(', ')}).`}
                </Text>
              </Animated.View>
            )}
          </View>
        </Card>
      </Animated.View>
    </FlowScreen>
  )
}

function LinkHeader({ title, icon, tileColor, checking, verified, optional }: { title: string; icon: React.ReactNode; tileColor: string; checking: boolean; verified: boolean; optional?: boolean }) {
  const c = useColors()
  return (
    <View style={styles.header}>
      <View style={[styles.tile, { backgroundColor: tileColor }]}>{icon}</View>
      <Text size={17} weight="semibold" style={{ flex: 1 }}>{title}</Text>
      {verified ? (
        <Animated.View key="ok" entering={ZoomIn.duration(180)}><Badge tone="green" icon={Check}>Verified</Badge></Animated.View>
      ) : checking ? (
        <Row gap={6}><ActivityIndicator size="small" color={c.primary} /><Text size={13} tone="mutedForeground">Checking…</Text></Row>
      ) : optional ? <Text size={13} tone="subtle">Optional</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  tile: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, gap: 12 },
  repo: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14 },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 },
})
