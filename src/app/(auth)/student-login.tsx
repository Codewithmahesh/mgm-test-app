import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { AuthLink, AuthShell } from '@/components/auth-shell'
import { Alert, Button, Field, Input, PasswordInput, Text } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { useSession } from '@/lib/session'

export default function StudentLogin() {
  const { signIn } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!email || !password) return setError('Enter your college email and password.')
    setLoading(true)
    setError('')
    try {
      const data = await api<{ token?: string }>('/api/student/auth/login', { body: { email: email.trim().toLowerCase(), password } })
      if (!data.token) throw new Error('The server did not return an app token. Update the website to the latest version.')
      await signIn('student', data.token)
    } catch (err) {
      setError(errorMessage(err))
      setLoading(false)
    }
  }

  return (
    <AuthShell role="Student" title="Student sign in" subtitle="Use your college email and portal password."
      footer={<AuthLink text="First time here?" link="Activate your account" onPress={() => router.push('/student-activate')} />}>
      <View style={{ gap: 16 }}>
        {error ? (
          <Alert>
            <Text size={13} tone="dangerInk">{error}{error.includes('not activated') ? <Text size={13} weight="semibold" tone="dangerInk" onPress={() => router.push('/student-activate')}>  Activate now</Text> : null}</Text>
          </Alert>
        ) : null}
        <Field label="College email">
          <Input value={email} onChangeText={v => setEmail(v.trim())} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" placeholder="sd24_name@mgmcen.ac.in" returnKeyType="next" />
        </Field>
        <Field label="Password" right={<Text size={13} tone="primary" onPress={() => router.push('/student-reset')}>Forgot password?</Text>}>
          <PasswordInput value={password} onChangeText={setPassword} autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} />
        </Field>
        <Button size="lg" full loading={loading} onPress={submit} style={{ marginTop: 4 }}>{loading ? 'Signing in…' : 'Sign in'}</Button>
      </View>
    </AuthShell>
  )
}
