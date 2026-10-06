// Placeholder: Profile isn't designed yet. It shows the saved onboarding answers with a way to edit them.
import { router } from 'expo-router'
import { ArrowLeftRight, CodeXml, LogOut, PencilLine, UserRound } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { enter, GithubMark } from '@/components/jems'
import { Alert, Badge, Button, Card, CardHeader, Divider, EmptyState, PageLoader, Row, Screen, ScreenHeader, Text, useFeedback } from '@/components/ui'
import { initials } from '@/lib/api'
import { BRANCHES, getOnboarding, getSkillCatalog, levelLabel, ROLES, YEARS, type Onboarding, type Skill } from '@/lib/jems'
import { useJemsData } from '@/lib/jems-store'
import { useSession } from '@/lib/session'
import { radius, useColors } from '@/theme'

export default function JemsProfile() {
  const { signOut } = useSession()
  const { confirm } = useFeedback()
  const { data, error, reload } = useJemsData(async () => ({ saved: await getOnboarding(), catalog: await getSkillCatalog() }))

  async function leave() {
    if (await confirm({ title: 'Sign out?', description: 'You can sign back in with your college email.', confirmLabel: 'Sign out', tone: 'danger' })) void signOut()
  }

  return (
    <Screen header={<ScreenHeader title="Profile" back={false} />} onRefresh={reload}>
      {error ? <Alert>{error}</Alert> : !data ? <PageLoader /> : !data.saved ? (
        <Card>
          <EmptyState icon={UserRound} title="No profile yet" description="Tell us your target role and skills to get your first skill report."
            action={<Button onPress={() => router.push('/student/jems/onboarding/profile')}>Set up your profile</Button>} />
        </Card>
      ) : <Details saved={data.saved} catalog={data.catalog} />}

      <Animated.View entering={enter(4)} style={{ gap: 10 }}>
        <Button variant="outline" size="lg" full icon={ArrowLeftRight} onPress={() => router.navigate('/student')}>Back to the exam portal</Button>
        <Button variant="destructive-outline" size="lg" full icon={LogOut} onPress={leave}>Sign out</Button>
      </Animated.View>
    </Screen>
  )
}

function Details({ saved, catalog }: { saved: Onboarding; catalog: Skill[] }) {
  const c = useColors()
  const { profile, ratings, links } = saved
  const label = (list: { value: string; label: string }[], value: string) => list.find(o => o.value === value)?.label ?? value
  const skills = catalog.filter(s => ratings[s.id])
  return (
    <>
      <Animated.View entering={enter(0)}>
        <Card padded>
          <Row gap={14}>
            <View style={[styles.avatar, { backgroundColor: c.primary }]}>
              <Text size={20} weight="semibold" color={c.primaryForeground}>{initials(profile.fullName)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text size={18} weight="semibold">{profile.fullName}</Text>
              <Text size={14} tone="mutedForeground">{`${label(BRANCHES, profile.branch)} · ${label(YEARS, profile.year)}`}</Text>
            </View>
          </Row>
          <Row gap={8} style={{ marginTop: 14 }}>
            <Text size={14} tone="mutedForeground">Target role</Text>
            <Badge tone="blue">{label(ROLES, profile.roleId)}</Badge>
          </Row>
        </Card>
      </Animated.View>

      <Animated.View entering={enter(1)}>
        <Card>
          <CardHeader title={<Text size={17} weight="semibold">Your skills</Text>} description={`${skills.length} self-rated`} />
          <Row gap={8} wrap style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            {skills.map(s => <Badge key={s.id}>{`${s.name} · ${levelLabel(ratings[s.id])}`}</Badge>)}
          </Row>
        </Card>
      </Animated.View>

      <Animated.View entering={enter(2)}>
        <Card>
          <CardHeader flush title={<Text size={17} weight="semibold">Connected</Text>} />
          <Row style={styles.link}>
            <GithubMark size={20} color={c.foreground} />
            <Text mono size={14} numberOfLines={1} style={{ flex: 1 }}>{links.github || 'Not connected'}</Text>
          </Row>
          <Divider />
          <Row style={styles.link}>
            <CodeXml size={20} color={c.warning} />
            <Text mono size={14} numberOfLines={1} style={{ flex: 1 }}>{links.leetcode || 'Not connected'}</Text>
          </Row>
        </Card>
      </Animated.View>

      <Animated.View entering={enter(3)}>
        <Button variant="secondary" size="lg" full icon={PencilLine} onPress={() => router.push('/student/jems/onboarding/profile')}>Edit profile and skills</Button>
      </Animated.View>
    </>
  )
}

const styles = StyleSheet.create({
  avatar: { width: 56, height: 56, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  link: { paddingHorizontal: 16, minHeight: 52 },
})
