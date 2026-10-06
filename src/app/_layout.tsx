// First, before any library that might need it loads.
import '@/lib/polyfills'
// Per-weight imports, so only the eight font files the app uses are bundled.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular'
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium'
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold'
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold'
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular'
import { JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono/600SemiBold'
import { SourceSerif4_500Medium } from '@expo-google-fonts/source-serif-4/500Medium'
import { SourceSerif4_600SemiBold } from '@expo-google-fonts/source-serif-4/600SemiBold'
import { useFonts } from 'expo-font'
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { FeedbackProvider } from '@/components/ui'
import { PreferencesProvider } from '@/lib/preferences'
import { SessionProvider, useSession } from '@/lib/session'
import { useColors, useIsDark } from '@/theme'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
    SourceSerif4_500Medium, SourceSerif4_600SemiBold,
    JetBrainsMono_400Regular, JetBrainsMono_600SemiBold,
  })
  if (!fontsLoaded && !fontError) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PreferencesProvider>
          <SessionProvider>
            <FeedbackProvider>
              <Navigator />
            </FeedbackProvider>
          </SessionProvider>
        </PreferencesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

function Navigator() {
  const { ready, role } = useSession()
  const c = useColors()
  const dark = useIsDark()

  const segments = useSegments()
  const area = segments[0] as string | undefined

  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}) }, [ready])

  // Move to the right part of the app when someone signs in or out (runs after the guards below update).
  useEffect(() => {
    if (!ready) return
    if (role === 'faculty' && area !== 'faculty') router.replace('/faculty')
    else if (role === 'student' && area !== 'student') router.replace('/student')
    else if (!role && (area === 'faculty' || area === 'student')) router.replace('/')
  }, [ready, role, area])

  if (!ready) return null

  const base = dark ? DarkTheme : DefaultTheme
  const theme = { ...base, colors: { ...base.colors, background: c.background, card: c.card, text: c.foreground, border: c.border, primary: c.primary } }

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }}>
        <Stack.Protected guard={!role}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'student'}>
          <Stack.Screen name="student" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'faculty'}>
          <Stack.Screen name="faculty" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  )
}
