import { Stack } from 'expo-router'
import { ClipboardList, KeyRound, LayoutDashboard, LogOut, UserRound, WifiOff } from 'lucide-react-native'
import { ShellProvider, type NavItem } from '@/components/app-shell'
import { useState } from 'react'
import { View } from 'react-native'
import { ProfileForm } from '@/components/profile-form'
import { Button, IconButton, PageLoader, PageTitle, Screen, Text } from '@/components/ui'
import { useAskForNotifications } from '@/lib/preferences'
import { useSession } from '@/lib/session'
import { useColors } from '@/theme'

const NAV: NavItem[] = [
  { href: '/student', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/student/results', label: 'My exams', icon: ClipboardList },
  { href: '/student/profile', label: 'Profile', icon: UserRound },
]
const SHELL = { role: 'Student' as const, nav: NAV, action: { href: '/student', label: 'Join an exam', icon: KeyRound }, profileHref: '/student/profile' }

export default function StudentLayout() {
  const { student, refresh, signOut } = useSession()
  const c = useColors()
  const [retrying, setRetrying] = useState(false)
  useAskForNotifications()

  // Signed in but the profile couldn't load (offline at launch).
  if (!student) return (
    <Screen scroll={false} contentStyle={{ alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
      {retrying ? <PageLoader /> : <>
        <WifiOff size={28} color={c.warning} />
        <Text weight="semibold" size={17} center>Can&apos;t reach the exam server</Text>
        <Text size={14} tone="mutedForeground" center>Check your internet connection and try again.</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <Button variant="outline" onPress={signOut}>Sign out</Button>
          <Button onPress={async () => { setRetrying(true); await refresh().catch(() => {}); setRetrying(false) }}>Try again</Button>
        </View>
      </>}
    </Screen>
  )

  // A profile is required before anything else, same as the website.
  if (!student.profileComplete) return (
    <Screen>
      <PageTitle title="Complete your profile" description="One last step. Your faculty sees these details on your results." right={<IconButton icon={LogOut} label="Sign out" onPress={signOut} />} />
      <ProfileForm student={student} firstTime />
    </Screen>
  )

  return (
    <ShellProvider config={SHELL}>
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="room/[code]" />
      <Stack.Screen name="exam/[id]" options={{ gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="result/[id]" />
      <Stack.Screen name="practical/[id]" />
      <Stack.Screen name="profile" />
    </Stack>
    </ShellProvider>
  )
}
