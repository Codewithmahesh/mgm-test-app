import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { AuthLink, AuthShell } from '@/components/auth-shell'
import { Alert, Button, Field, Input, PasswordInput, Text } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { useSession } from '@/lib/session'

export default function FacultyLogin() {
  const { signIn } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!email || !password) return setError('Enter your email and password.')
    setLoading(true)
    setError('')
    try {
      const data = await api<{ token?: string }>('/api/auth/login', { body: { email: email.trim().toLowerCase(), password } })
      if (!data.token) throw new Error('The server did not return an app token. Update the website to the latest version.')
      await signIn('faculty', data.token)
    } catch (err) {
      setError(errorMessage(err))
      setLoading(false)
    }
  }

  return (
    <AuthShell role="Faculty" title="Faculty sign in" subtitle="Welcome back. Enter your faculty account details."
      footer={<AuthLink text="New faculty member?" link="Create a faculty account" onPress={() => router.push('/faculty-signup')} />}>
      <View style={{ gap: 16 }}>
        {error ? <Alert>{error}</Alert> : null}
        <Field label="Email">
          <Input value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" placeholder="you@college.edu" returnKeyType="next" />
        </Field>
        <Field label="Password" right={<Text size={13} tone="primary" onPress={() => router.push('/faculty-reset')}>Forgot password?</Text>}>
          <PasswordInput value={password} onChangeText={setPassword} autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} />
        </Field>
        <Button size="lg" full loading={loading} onPress={submit} style={{ marginTop: 4 }}>{loading ? 'Signing in…' : 'Sign in'}</Button>
      </View>
    </AuthShell>
  )
}
