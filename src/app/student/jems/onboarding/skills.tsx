import { router } from 'expo-router'
import { ArrowRight, Search, X } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import Animated, { FadeIn, FadeOut, LinearTransition, ZoomIn } from 'react-native-reanimated'
import { Chip, enter, FlowScreen, LevelPicker, StepHeader, StepProgress, StickyFooter, usePop, useShake } from '@/components/jems'
import { Badge, Button, Card, Divider, EmptyState, Heading, Input, Text } from '@/components/ui'
import { getSkillCatalog, LEVELS, MIN_SKILLS, SKILL_CATEGORIES, type Skill, type SkillCategory } from '@/lib/jems'
import { useJems } from '@/lib/jems-store'
import { useColors } from '@/theme'

export default function SkillsStep() {
  const c = useColors()
  const { draft, setRating } = useJems()
  const [catalog, setCatalog] = useState<Skill[]>([])
  const [category, setCategory] = useState<SkillCategory>('languages')
  const [query, setQuery] = useState('')
  const { style: shakeStyle, shake } = useShake()

  useEffect(() => { getSkillCatalog().then(setCatalog).catch(() => {}) }, [])

  const q = query.trim().toLowerCase()
  const shown = q ? catalog.filter(s => s.name.toLowerCase().includes(q)) : catalog.filter(s => s.category === category)
  const added = Object.keys(draft.ratings).length
  const ready = added >= MIN_SKILLS
  const countPop = usePop(added, 1.12)
  const addedIn = (cat: SkillCategory) => catalog.filter(s => s.category === cat && draft.ratings[s.id]).length

  return (
    <FlowScreen
      header={<StepHeader title="Your skills" step={2} />}
      footer={(
        <StickyFooter row>
          <Animated.View style={[{ flex: 1 }, shakeStyle]}>
            <Animated.View style={[{ alignSelf: 'flex-start' }, countPop]}>
              <Text size={16} weight="semibold" tabular>{added === 1 ? '1 skill added' : `${added} skills added`}</Text>
            </Animated.View>
            <Text size={13} tone={ready ? 'successInk' : 'mutedForeground'}>{ready ? 'Nice. Add more any time.' : `Add at least ${MIN_SKILLS} to continue`}</Text>
          </Animated.View>
          <Button size="lg" iconRight={ArrowRight} style={{ opacity: ready ? 1 : 0.6 }}
            onPress={() => (ready ? router.push('/student/jems/onboarding/connect') : shake())}>Continue</Button>
        </StickyFooter>
      )}>
      <StepProgress step={2} />

      <Animated.View entering={enter(0)}>
        <Heading size={30}>Rate your skills</Heading>
        <Text size={15} tone="mutedForeground" style={{ marginTop: 6 }}>Be honest. The assessment checks every skill you add here.</Text>
      </Animated.View>

      <Animated.View entering={enter(1)}>
        <Search size={18} color={c.mutedForeground} style={styles.searchIcon} pointerEvents="none" />
        <Input value={query} onChangeText={setQuery} placeholder="Search skills, e.g. React, SQL" autoCapitalize="none" autoCorrect={false}
          returnKeyType="search" accessibilityLabel="Search skills" style={{ paddingLeft: 44, paddingRight: 44, minHeight: 50 }} />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search" style={styles.clear}>
            <X size={18} color={c.mutedForeground} />
          </Pressable>
        ) : null}
      </Animated.View>

      <Animated.View entering={enter(2)} style={{ opacity: q ? 0.45 : 1 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 4 }}>
          {SKILL_CATEGORIES.map(cat => (
            <Chip key={cat.value} label={cat.label} active={!q && category === cat.value} count={addedIn(cat.value)} onPress={() => { setQuery(''); setCategory(cat.value) }} />
          ))}
        </ScrollView>
      </Animated.View>

      <Animated.View key={q ? 'search' : category} entering={FadeIn.duration(200)} layout={LinearTransition}>
        {catalog.length > 0 && shown.length === 0 ? (
          <Card><EmptyState icon={Search} title="No skills match" description={`Nothing called “${query.trim()}” yet. Try a shorter name.`} /></Card>
        ) : (
          <Card>
            {shown.map((skill, i) => {
              const level = draft.ratings[skill.id] ?? null
              return (
                <Animated.View key={skill.id} entering={enter(i)} layout={LinearTransition}>
                  {i > 0 && <Divider />}
                  <View style={styles.row}>
                    <View style={styles.rowHead}>
                      <Text size={17} weight="semibold" style={{ flex: 1 }}>{skill.name}</Text>
                      {level ? (
                        <Animated.View key="added" entering={ZoomIn.springify().damping(12)} exiting={FadeOut.duration(120)}><Badge tone="green">Added</Badge></Animated.View>
                      ) : (
                        <Animated.View key="none" entering={FadeIn}><Text size={13} tone="mutedForeground">Not added</Text></Animated.View>
                      )}
                    </View>
                    <LevelPicker label={skill.name} value={level} options={LEVELS} onChange={next => setRating(skill.id, next)} />
                  </View>
                </Animated.View>
              )
            })}
          </Card>
        )}
      </Animated.View>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  searchIcon: { position: 'absolute', left: 14, top: 16, zIndex: 1 },
  clear: { position: 'absolute', right: 6, top: 3, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
})
