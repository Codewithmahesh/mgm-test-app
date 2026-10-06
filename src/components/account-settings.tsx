import * as WebBrowser from 'expo-web-browser'
import { Bell, FileText, KeyRound, LogOut, Monitor, Moon, Sun, Trash2, type LucideIcon } from 'lucide-react-native'
import { useState } from 'react'
import { Linking, Pressable, Switch, View } from 'react-native'
import { API_URL, api, errorMessage } from '@/lib/api'
import { notificationsSupported, notify } from '@/lib/notify'
import { usePreferences, type ThemeChoice } from '@/lib/preferences'
import { useSession } from '@/lib/session'
import { radius, useColors } from '@/theme'
import { OtpFlow } from './otp-flow'
import { Alert, Button, Card, CardHeader, Field, IconTile, Input, PasswordInput, Sheet, Text, useFeedback } from './ui'

/** Security, notifications and appearance, shared by the student and faculty profiles. */
export function AccountSettings({ email, account }: { email: string; account: 'student' | 'teacher' }) {
  const c = useColors()
  const { toast } = useFeedback()
  const { signOut } = useSession()
  const { theme, setTheme, notifications, setNotifications, permission } = usePreferences()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  async function toggleNotifications(on: boolean) {
    const status = await setNotifications(on)
    if (on && status === 'granted') { toast('Notifications are on.'); void notify('Notifications are on', 'You will be reminded about exams and updates here.') }
    else if (on && status === 'denied') toast('Notifications are blocked for this app. Turn them on in your phone settings.', 'error')
  }

  return (
    <>
      <Card>
        <CardHeader flush title="Security" />
        <Row icon={KeyRound} tone="blue" title="Change password" text="We email a 6-digit code to confirm it's you" onPress={() => setPasswordOpen(true)} />
      </Card>

      <Card>
        <CardHeader flush title="Notifications" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
          <IconTile icon={Bell} tone="violet" />
          <View style={{ flex: 1 }}>
            <Text size={14} weight="medium">Allow notifications</Text>
            <Text size={12} tone="mutedForeground" leading={17}>Exam reminders, admission to exams, join requests and AI questions ready.</Text>
          </View>
          <Switch disabled={!notificationsSupported} value={notifications && permission === 'granted'} onValueChange={toggleNotifications} trackColor={{ true: c.primary, false: c.borderStrong }} thumbColor="#ffffff" ios_backgroundColor={c.borderStrong} />
        </View>
        {!notificationsSupported && (
          <Text size={12} tone="mutedForeground" leading={17} style={{ paddingHorizontal: 14, paddingBottom: 14 }}>Not available in Expo Go on Android. They work in the installed app (a development or store build).</Text>
        )}
        {permission === 'denied' && (
          <Pressable onPress={() => Linking.openSettings()} style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            <Text size={12} tone="warningInk">Blocked in phone settings. <Text size={12} weight="semibold" tone="primary">Open settings</Text></Text>
          </Pressable>
        )}
      </Card>

      <Card>
        <CardHeader flush title="Appearance" />
        <View style={{ flexDirection: 'row', gap: 8, padding: 14 }}>
          {([['system', 'System', Monitor], ['light', 'Light', Sun], ['dark', 'Dark', Moon]] as const).map(([value, label, Icon]) => {
            const active = theme === value
            return (
              <Pressable key={value} onPress={() => setTheme(value as ThemeChoice)} accessibilityRole="radio" accessibilityState={{ selected: active }}
                style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primarySoft : c.card }}>
                <Icon size={18} color={active ? c.primary : c.mutedForeground} />
                <Text size={13} weight="medium" color={active ? c.primaryInk : c.mutedForeground}>{label}</Text>
              </Pressable>
            )
          })}
        </View>
      </Card>

      <Card>
        <CardHeader flush title="About" />
        <Row icon={FileText} tone="blue" title="Privacy policy" text="What we collect, why, and how to delete it" onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/privacy-policy`)} />
      </Card>

      <Button variant="destructive-outline" icon={LogOut} full onPress={signOut}>Sign out</Button>

      <Card style={{ borderColor: c.dangerBorder }}>
        <CardHeader flush title="Delete account" description="Permanently delete your account and everything in it. This can't be undone." />
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 12 }}>
          {WHAT_GOES[account].map(item => (
            <View key={item} style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c.danger, marginTop: 8 }} />
              <Text size={13} tone="mutedForeground" leading={19} style={{ flex: 1 }}>{item}</Text>
            </View>
          ))}
          <Button variant="destructive-outline" icon={Trash2} onPress={() => setDeleteOpen(true)}>Delete my account</Button>
        </View>
      </Card>

      {deleteOpen && <DeleteAccountSheet account={account} onClose={() => setDeleteOpen(false)} />}

      <Sheet open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Change password" description="We'll send a verification code to your email.">
        <OtpFlow purpose="reset" account={account} email={email} onDone={() => { setPasswordOpen(false); toast('Password changed.') }} />
      </Sheet>
    </>
  )
}

const CONFIRM_WORD = 'DELETE'

const WHAT_GOES = {
  teacher: [
    'Your exam rooms, with every student attempt, answer and result in them',
    'Your question bank and AI generations',
    'Your practicals, their experiments and the students\u2019 submissions',
    'Your profile and sign-in',
  ],
  student: [
    'Your exam attempts, answers and results',
    'Your practical submissions and AI practice problems',
    'Your profile and sign-in',
  ],
}

/**
 * Confirms with the password and the word DELETE, deletes the account on the server (DELETE /api/auth/me or
 * /api/student/me, see the website's lib/account-deletion.ts) and signs out. Mounted only while open, so it
 * starts empty each time.
 */
function DeleteAccountSheet({ account, onClose }: { account: 'student' | 'teacher'; onClose: () => void }) {
  const { toast } = useFeedback()
  const { signOut } = useSession()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const ready = password.length > 0 && confirm.trim().toUpperCase() === CONFIRM_WORD

  async function remove() {
    setDeleting(true)
    setError('')
    try {
      await api(account === 'teacher' ? '/api/auth/me' : '/api/student/me', { method: 'DELETE', body: { password, confirm } })
      toast('Your account and everything in it have been deleted.')
      await signOut()
    } catch (err) { setError(errorMessage(err)); setDeleting(false) }
  }

  return (
    <Sheet open onClose={onClose} dismissible={!deleting} title="Delete your account?" description="Everything is deleted for good, right away. We'll email you once it's done."
      footer={<Button variant="destructive" full icon={Trash2} loading={deleting} disabled={!ready} onPress={remove}>{deleting ? 'Deleting…' : 'Delete permanently'}</Button>}>
      <View style={{ gap: 14 }}>
        {error ? <Alert>{error}</Alert> : null}
        {account === 'teacher' && <Alert tone="amber">Your students lose their attempts and results in your exams, and their work in your practicals.</Alert>}
        <Field label="Your password"><PasswordInput value={password} onChangeText={setPassword} autoComplete="current-password" /></Field>
        <Field label={`Type ${CONFIRM_WORD} to confirm`}>
          <Input value={confirm} onChangeText={setConfirm} autoCapitalize="characters" autoCorrect={false} mono />
        </Field>
      </View>
    </Sheet>
  )
}

function Row({ icon, tone, title, text, onPress }: { icon: LucideIcon; tone: 'blue' | 'violet'; title: string; text: string; onPress: () => void }) {
  const c = useColors()
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: pressed ? c.muted : 'transparent' })}>
      <IconTile icon={icon} tone={tone} />
      <View style={{ flex: 1 }}>
        <Text size={14} weight="medium">{title}</Text>
        <Text size={12} tone="mutedForeground">{text}</Text>
      </View>
    </Pressable>
  )
}
