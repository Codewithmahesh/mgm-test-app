import { Check } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { TextInput, View } from 'react-native'
import { api, errorMessage } from '@/lib/api'
import { useSession } from '@/lib/session'
import { fonts, radius, useColors } from '@/theme'
import { Alert, Button, Field, Input, PasswordInput, Text } from './ui'

type Step = 'email' | 'code' | 'password'

const ENDPOINTS = {
  student: { send: '/api/student/auth/otp', verify: '/api/student/auth/verify', password: '/api/student/auth/password' },
  teacher: { send: '/api/auth/forgot-password', verify: '/api/auth/verify-otp', password: '/api/auth/reset-password' },
}

/** Email → 6-digit code → new password. Student activation, and password reset for both roles. */
/** `email` pre-fills and locks the address (changing the password of the signed-in account); `onDone` runs after the new password is saved. */
export function OtpFlow({ purpose, account = 'student', email: fixedEmail, onDone }: { purpose: 'activate' | 'reset'; account?: 'student' | 'teacher'; email?: string; onDone?: () => void }) {
  const c = useColors()
  const { signIn } = useSession()
  const urls = ENDPOINTS[account]
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState(fixedEmail ?? '')
  const [code, setCode] = useState('')
  const [ticket, setTicket] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const codeInput = useRef<TextInput>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(value => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function run(action: () => Promise<void>) {
    setLoading(true)
    setError('')
    try { await action() } catch (err) { setError(errorMessage(err)) } finally { setLoading(false) }
  }

  const requestCode = () => run(async () => {
    const data = await api<{ message: string }>(urls.send, { body: { email: email.trim().toLowerCase(), purpose } })
    setInfo(data.message)
    setCode('')
    setStep('code')
    setCooldown(45)
    setTimeout(() => codeInput.current?.focus(), 150)
  })

  const verifyCode = (value = code) => run(async () => {
    if (value.length !== 6) throw new Error('Enter all 6 digits.')
    const data = await api<{ ticket: string }>(urls.verify, { body: { email: email.trim().toLowerCase(), otp: value, purpose } })
    setTicket(data.ticket)
    setInfo('')
    setStep('password')
  })

  const savePassword = () => run(async () => {
    if (password.length < 8) throw new Error('Password must be at least 8 characters.')
    if (password !== confirm) throw new Error('The two passwords do not match.')
    const data = await api<{ token?: string }>(urls.password, { body: { ticket, password } })
    if (!data.token) throw new Error('Signed in on the server but no app token came back. Update the website to the latest version.')
    await signIn(account === 'teacher' ? 'faculty' : 'student', data.token)
    onDone?.()
  })

  const labels = [account === 'teacher' ? 'Email' : 'College email', 'Verify code', 'Set password']
  const current = ['email', 'code', 'password'].indexOf(step)

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 22 }} accessibilityLabel={`Step ${current + 1} of 3`}>
        {labels.map((label, index) => (
          <View key={label} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: index < current ? c.success : index === current ? c.primary : c.muted }}>
              {index < current ? <Check size={13} color="#fff" strokeWidth={3} /> : <Text size={11} weight="semibold" color={index === current ? '#fff' : c.mutedForeground}>{index + 1}</Text>}
            </View>
            <Text size={11} weight="medium" tone={index === current ? 'foreground' : 'mutedForeground'} numberOfLines={1} style={{ flexShrink: 1 }}>{label}</Text>
          </View>
        ))}
      </View>

      {error ? <Alert style={{ marginBottom: 14 }}>{error}</Alert> : info ? <Alert tone="blue" style={{ marginBottom: 14 }}>{info}</Alert> : null}

      {step === 'email' && (
        <View style={{ gap: 16 }}>
          <Field label={account === 'teacher' ? 'Email' : 'College email'} hint={purpose === 'activate' ? 'Use the email your faculty added, e.g. sd24_name@mgmcen.ac.in' : 'The email you use to sign in.'}>
            <Input value={email} editable={!fixedEmail} onChangeText={v => setEmail(v.trim())} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" autoFocus
              placeholder={account === 'teacher' ? 'you@college.edu' : 'sd24_name@mgmcen.ac.in'} returnKeyType="send" onSubmitEditing={requestCode} />
          </Field>
          <Button size="lg" full loading={loading} disabled={!email} onPress={requestCode}>{loading ? 'Sending code…' : 'Send verification code'}</Button>
        </View>
      )}

      {step === 'code' && (
        <View style={{ gap: 16 }}>
          <Text size={14} tone="mutedForeground">Enter the 6-digit code sent to <Text size={14} weight="medium">{email}</Text>.</Text>
          {/* One hidden input drives six boxes, so paste and SMS/email autofill both work. */}
          <View>
            <View style={{ flexDirection: 'row', gap: 8 }} pointerEvents="none">
              {Array.from({ length: 6 }, (_, i) => {
                const filled = code[i]
                const focus = i === Math.min(code.length, 5)
                return (
                  <View key={i} style={{ flex: 1, height: 54, borderRadius: radius.md, borderWidth: focus ? 2 : 1, borderColor: focus ? c.primary : c.input, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
                    <Text mono weight="semibold" size={22}>{filled ?? ''}</Text>
                  </View>
                )
              })}
            </View>
            <TextInput ref={codeInput} value={code} maxLength={6} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" accessibilityLabel="Verification code"
              onChangeText={value => { const clean = value.replace(/\D/g, '').slice(0, 6); setCode(clean); if (clean.length === 6) verifyCode(clean) }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, fontFamily: fonts.mono, color: 'transparent' }} caretHidden />
          </View>
          <Button size="lg" full loading={loading} onPress={() => verifyCode()}>{loading ? 'Verifying…' : 'Verify code'}</Button>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {fixedEmail ? <View /> : <Text size={13} tone="mutedForeground" onPress={() => { setStep('email'); setInfo('') }}>Change email</Text>}
            <Text size={13} weight="medium" tone={cooldown > 0 || loading ? 'subtle' : 'primary'} onPress={cooldown > 0 || loading ? undefined : requestCode}>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}</Text>
          </View>
        </View>
      )}

      {step === 'password' && (
        <View style={{ gap: 16 }}>
          <Field label="New password" hint="At least 8 characters.">
            <PasswordInput value={password} onChangeText={setPassword} autoComplete="new-password" textContentType="newPassword" autoFocus />
          </Field>
          <Field label="Confirm password">
            <PasswordInput value={confirm} onChangeText={setConfirm} autoComplete="new-password" textContentType="newPassword" returnKeyType="done" onSubmitEditing={savePassword} />
          </Field>
          <Button size="lg" full loading={loading} onPress={savePassword}>{loading ? 'Saving…' : purpose === 'activate' ? 'Activate account' : 'Save new password'}</Button>
        </View>
      )}
    </View>
  )
}
