import { Stack } from 'expo-router'
import { BookOpen, DoorOpen, FileUp, LayoutDashboard, PenLine, Plus, Sparkles, UserPlus, Users, WifiOff, Wand2 } from 'lucide-react-native'
import { ShellProvider, type NavItem } from '@/components/app-shell'
import { useState } from 'react'
import { View } from 'react-native'
import { Button, PageLoader, Screen, Text } from '@/components/ui'
import { useAskForNotifications } from '@/lib/preferences'
import { useSession } from '@/lib/session'
import { useColors } from '@/theme'

const NAV: NavItem[] = [
  { href: '/faculty', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/faculty/exams', label: 'Exam rooms', icon: DoorOpen },
  { href: '/faculty/questions', label: 'Question bank', icon: BookOpen },
  { href: '/faculty/generations', label: 'AI generations', icon: Sparkles },
  { href: '/faculty/students', label: 'Students', icon: Users },
]
const QUICK: NavItem[] = [
  { href: '/faculty/add-questions?method=ai', label: 'Generate questions with AI', icon: Wand2 },
  { href: '/faculty/add-questions?method=csv', label: 'Import questions (CSV)', icon: FileUp },
  { href: '/faculty/add-questions?method=manual', label: 'Write a question', icon: PenLine },
  { href: '/faculty/students?add=1', label: 'Add students', icon: UserPlus },
]
const SHELL = { role: 'Faculty' as const, nav: NAV, quick: QUICK, action: { href: '/faculty/room/new', label: 'New exam room', icon: Plus }, profileHref: '/faculty/profile' }

export default function FacultyLayout() {
  const { teacher, refresh, signOut } = useSession()
  const c = useColors()
  const [retrying, setRetrying] = useState(false)
  useAskForNotifications()

  if (!teacher) return (
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

  return (
    <ShellProvider config={SHELL}>
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="room/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="room/[id]" />
      <Stack.Screen name="attempt/[roomId]/[attemptId]" />
      <Stack.Screen name="add-questions" options={{ presentation: 'modal', gestureEnabled: false }} />
      <Stack.Screen name="generations" />
      <Stack.Screen name="profile" />
    </Stack>
    </ShellProvider>
  )
}
