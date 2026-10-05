import { Stack } from 'expo-router'
import { JemsProvider } from '@/lib/jems-store'
import { useColors } from '@/theme'

export default function JemsLayout() {
  const c = useColors()
  return (
    <JemsProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding/profile" />
        <Stack.Screen name="onboarding/skills" />
        <Stack.Screen name="onboarding/connect" />
        <Stack.Screen name="assessment/index" />
        <Stack.Screen name="assessment/question" options={{ gestureEnabled: false, animation: 'fade_from_bottom' }} />
        <Stack.Screen name="gaps" />
        <Stack.Screen name="module/[id]" />
      </Stack>
    </JemsProvider>
  )
}
