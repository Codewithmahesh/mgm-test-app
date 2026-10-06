import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { AuthLink, AuthShell } from '@/components/auth-shell'
import { COLLEGE_CITY, COLLEGE_NAME } from '@/components/brand'
import { JemsMark, useShake } from '@/components/jems'
import { Alert, Button, Field, Input, PasswordInput, Text } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { setLanding } from '@/lib/landing'
import { useSession } from '@/lib/session'
import { useColors } from '@/theme'

/** JEMS sign-in: the student sign-in with the JEMS brand, landing in /student/jems. */
export default function JemsLogin() {
  const c = useColors()
  const { signIn } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { style: shakeStyle, shake } = useShake()

  async function submit() {
    if (!email || !password) { shake(); return setError('Enter your college email and password.') }
    setLoading(true)
    setError('')
    try {
      const data = await api<{ token?: string }>('/api/student/auth/login', { body: { email: email.trim().toLowerCase(), password } })
      if (!data.token) throw new Error('The server did not return an app token. Update the website to the latest version.')
      setLanding('/student/jems')
      await signIn('student', data.token)
    } catch (err) {
      setLanding(null)
      shake()
      setError(errorMessage(err))
      setLoading(false)
    }
  }

  return (
    <AuthShell role="Student" title="Student sign in" subtitle="Use your college email and portal password."
      eyebrow="For students" headline={'See where you stand.\nClose the gap.'}
      blurb="Verify your skills, compare them with what MSMEs hire for, and follow a roadmap built around you."
      brand={(
        <>
          <JemsMark size={52} />
          <View style={{ flex: 1 }}>
            <Text size={20} weight="semibold" color={c.primaryForeground} leading={24}>JEMS</Text>
            <Text size={13} color="rgba(255,255,255,0.6)" numberOfLines={1}>{`${COLLEGE_NAME} · ${COLLEGE_CITY}`}</Text>
          </View>
        </>
      )}
      footer={<AuthLink text="First time here?" link="Activate your account" onPress={() => router.push('/student-activate')} />}>
      <Animated.View entering={FadeInDown.delay(120).springify().damping(18)} style={[{ gap: 16 }, shakeStyle]}>
        {error ? (
          <Alert>
            <Text size={13} tone="dangerInk">{error}{error.includes('not activated') ? <Text size={13} weight="semibold" tone="dangerInk" onPress={() => router.push('/student-activate')}>  Activate now</Text> : null}</Text>
          </Alert>
        ) : null}
        <Field label="College email">
          <Input value={email} onChangeText={v => setEmail(v.trim())} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" placeholder="sd24_name@mgmcen.ac.in" returnKeyType="next" />
        </Field>
        <Field label="Password" right={<Text size={13} tone="primary" onPress={() => router.push('/student-reset')} suppressHighlighting>Forgot password?</Text>}>
          <PasswordInput value={password} onChangeText={setPassword} autoComplete="current-password" textContentType="password" placeholder="Enter your password" returnKeyType="go" onSubmitEditing={submit} />
        </Field>
        <Button size="lg" full loading={loading} onPress={submit} style={{ marginTop: 4 }}>{loading ? 'Signing in…' : 'Sign in'}</Button>
      </Animated.View>
    </AuthShell>
  )
}
