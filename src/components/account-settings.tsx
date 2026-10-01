import { Bell, KeyRound, LogOut, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react-native'
import { useState } from 'react'
import { Linking, Pressable, Switch, View } from 'react-native'
import { notificationsSupported, notify } from '@/lib/notify'
import { usePreferences, type ThemeChoice } from '@/lib/preferences'
import { useSession } from '@/lib/session'
import { radius, useColors } from '@/theme'
import { OtpFlow } from './otp-flow'
import { Button, Card, CardHeader, IconTile, Sheet, Text, useFeedback } from './ui'

/** Security, notifications and appearance, shared by the student and faculty profiles. */
export function AccountSettings({ email, account }: { email: string; account: 'student' | 'teacher' }) {
  const c = useColors()
  const { toast } = useFeedback()
  const { signOut } = useSession()
  const { theme, setTheme, notifications, setNotifications, permission } = usePreferences()
  const [passwordOpen, setPasswordOpen] = useState(false)

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

      <Button variant="destructive-outline" icon={LogOut} full onPress={signOut}>Sign out</Button>

      <Sheet open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Change password" description="We'll send a verification code to your email.">
        <OtpFlow purpose="reset" account={account} email={email} onDone={() => { setPasswordOpen(false); toast('Password changed.') }} />
      </Sheet>
    </>
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
