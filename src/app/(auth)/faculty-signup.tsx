import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { AuthLink, AuthShell } from '@/components/auth-shell'
import { Alert, Button, Field, Input, PasswordInput, Select } from '@/components/ui'
import { DEPARTMENT_OPTIONS, api, errorMessage } from '@/lib/api'
import { useSession } from '@/lib/session'

const OTHER = '__other__'

export default function FacultySignup() {
  const { signIn } = useSession()
  const [form, setForm] = useState({ name: '', email: '', department: '', password: '', signupCode: '' })
  const [customDept, setCustomDept] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (key: keyof typeof form) => (value: string) => setForm(current => ({ ...current, [key]: value }))

  async function submit() {
    setError('')
    const department = form.department === OTHER ? customDept.trim() : form.department
    if (form.name.trim().length < 2) return setError('Enter your full name.')
    if (!department) return setError('Please select or enter your department.')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    setLoading(true)
    try {
      const data = await api<{ token?: string }>('/api/auth/signup', { body: { ...form, email: form.email.trim().toLowerCase(), department } })
      if (!data.token) throw new Error('The server did not return an app token. Update the website to the latest version.')
      await signIn('faculty', data.token)
    } catch (err) {
      setError(errorMessage(err))
      setLoading(false)
    }
  }

  return (
    <AuthShell role="Faculty" title="Create a faculty account" subtitle="Set up your workspace in under a minute."
      footer={<AuthLink text="Already have an account?" link="Sign in" onPress={() => router.replace('/faculty-login')} />}>
      <View style={{ gap: 16 }}>
        {error ? <Alert>{error}</Alert> : null}
        <Field label="Full name" required><Input value={form.name} onChangeText={set('name')} autoComplete="name" textContentType="name" placeholder="Prof. Riya Sharma" /></Field>
        <Field label="Work email" required><Input value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@college.edu" /></Field>
        <Field label="Department" required hint="Shown to students on the exam page.">
          <Select value={form.department} onChange={set('department')} placeholder="Select your department" title="Department"
            options={[...DEPARTMENT_OPTIONS.map(d => ({ value: d, label: d })), { value: OTHER, label: 'Other / Not in list…' }]} />
        </Field>
        {form.department === OTHER && <Field label="Department name" required><Input value={customDept} onChangeText={setCustomDept} placeholder="e.g. Data Science & Analytics" /></Field>}
        <Field label="Password" required hint="At least 8 characters."><PasswordInput value={form.password} onChangeText={set('password')} autoComplete="new-password" textContentType="newPassword" /></Field>
        <Field label="Faculty sign-up code" required hint="Provided by the college administrator. Keeps student data private to faculty.">
          <Input value={form.signupCode} onChangeText={set('signupCode')} autoCapitalize="none" autoCorrect={false} mono />
        </Field>
        <Button size="lg" full loading={loading} onPress={submit} style={{ marginTop: 4 }}>{loading ? 'Creating account…' : 'Create account'}</Button>
      </View>
    </AuthShell>
  )
}
