import { router } from 'expo-router'
import { ArrowRight } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import Animated from 'react-native-reanimated'
import { enter, FlowScreen, OptionTile, StepHeader, StepProgress, StickyFooter, useShake } from '@/components/jems'
import { Button, Field, Heading, Input, Row, Select, Text } from '@/components/ui'
import { BRANCHES, ROLES, YEARS } from '@/lib/jems'
import { useJems } from '@/lib/jems-store'

const ROLE_ROWS = Array.from({ length: Math.ceil(ROLES.length / 2) }, (_, i) => ROLES.slice(i * 2, i * 2 + 2))

export default function ProfileStep() {
  const { draft, setProfile } = useJems()
  const { style: shakeStyle, shake } = useShake()
  const [tried, setTried] = useState(false)
  const profile = draft.profile
  const nameMissing = !profile.fullName.trim()
  const roleMissing = !profile.roleId

  function next() {
    if (nameMissing || roleMissing) { setTried(true); shake(); return }
    router.push('/student/jems/onboarding/skills')
  }

  return (
    <FlowScreen
      header={<StepHeader title="Set up your profile" step={1} />}
      footer={(
        <StickyFooter>
          <Animated.View style={shakeStyle}>
            <Button size="lg" full iconRight={ArrowRight} onPress={next}>Continue to skills</Button>
          </Animated.View>
        </StickyFooter>
      )}>
      <StepProgress step={1} />

      <Animated.View entering={enter(0)}>
        <Heading size={30}>Tell us about you</Heading>
        <Text size={15} tone="mutedForeground" style={{ marginTop: 6 }}>Your target role decides which company skill sets we compare you against.</Text>
      </Animated.View>

      <Animated.View entering={enter(1)} style={{ gap: 16 }}>
        <Field label="Full name" hint={tried && nameMissing ? <Text size={12} tone="danger">Enter your full name.</Text> : undefined}>
          <Input value={profile.fullName} onChangeText={fullName => setProfile({ fullName })} placeholder="Your full name" autoCapitalize="words"
            autoComplete="name" textContentType="name" returnKeyType="done" invalid={tried && nameMissing} />
        </Field>
        <Field label="College">
          <Input value={profile.college} editable={false} accessibilityLabel="College" />
        </Field>
        <Row gap={12} style={{ alignItems: 'flex-start' }}>
          <Field label="Branch" style={{ flex: 1 }}>
            <Select value={profile.branch} options={BRANCHES} onChange={branch => setProfile({ branch })} title="Branch" />
          </Field>
          <Field label="Year" style={{ flex: 1 }}>
            <Select value={profile.year} options={YEARS} onChange={year => setProfile({ year })} title="Year" />
          </Field>
        </Row>
      </Animated.View>

      <Animated.View entering={enter(2)} style={{ gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text size={13} weight="medium">Target role</Text>
          <Text size={13} tone={tried && roleMissing ? 'danger' : 'mutedForeground'}>{tried && roleMissing ? 'Pick one to continue' : 'Pick one'}</Text>
        </Row>
        <View style={{ gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel="Target role">
          {ROLE_ROWS.map(pair => (
            <Row key={pair[0].value} gap={10}>
              {pair.map(role => (
                <OptionTile key={role.value} label={role.label} selected={profile.roleId === role.value} onPress={() => setProfile({ roleId: role.value })} style={{ flex: 1 }} />
              ))}
            </Row>
          ))}
        </View>
      </Animated.View>
    </FlowScreen>
  )
}
