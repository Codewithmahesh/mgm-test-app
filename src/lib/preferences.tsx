import * as SecureStore from 'expo-secure-store'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Appearance } from 'react-native'
import { notificationPermission, setNotificationsEnabled, type Permission } from './notify'

export type ThemeChoice = 'system' | 'light' | 'dark'
type Prefs = { theme: ThemeChoice; notifications: boolean }
type PrefsContext = Prefs & {
  setTheme: (theme: ThemeChoice) => void
  setNotifications: (on: boolean) => Promise<Permission>
  permission: Permission | null
}

const KEY = 'mgm.prefs'
const Context = createContext<PrefsContext | null>(null)

/** This phone's settings: appearance (like the website's theme switch) and notifications. */
export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>({ theme: 'system', notifications: true })
  const [permission, setPermission] = useState<PrefsContext['permission']>(null)

  useEffect(() => {
    SecureStore.getItemAsync(KEY).then(saved => {
      if (!saved) return
      const next = { theme: 'system', notifications: true, ...JSON.parse(saved) } as Prefs
      setPrefs(next)
    }).catch(() => {})
    notificationPermission(false).then(setPermission).catch(() => {})
  }, [])

  // Apply the appearance app-wide (useColorScheme follows it) and the notification switch.
  useEffect(() => { Appearance.setColorScheme(prefs.theme === 'system' ? 'unspecified' : prefs.theme) }, [prefs.theme])
  useEffect(() => { setNotificationsEnabled(prefs.notifications) }, [prefs.notifications])

  const save = useCallback((next: Prefs) => { setPrefs(next); SecureStore.setItemAsync(KEY, JSON.stringify(next)).catch(() => {}) }, [])
  const setTheme = useCallback((theme: ThemeChoice) => save({ ...prefs, theme }), [prefs, save])
  const setNotifications = useCallback(async (on: boolean) => {
    const status = on ? await notificationPermission(true) : permission ?? 'undetermined'
    setPermission(status)
    save({ ...prefs, notifications: on && status === 'granted' })
    return status
  }, [prefs, permission, save])

  const value = useMemo(() => ({ ...prefs, setTheme, setNotifications, permission }), [prefs, setTheme, setNotifications, permission])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function usePreferences() {
  const value = useContext(Context)
  if (!value) throw new Error('usePreferences must be used inside PreferencesProvider')
  return value
}

/** After sign-in, ask once for notification permission (the person can change it in Profile). */
export function useAskForNotifications() {
  const { notifications, permission, setNotifications } = usePreferences()
  useEffect(() => {
    if (notifications && permission === 'undetermined') void setNotifications(true)
  }, [notifications, permission, setNotifications])
}
