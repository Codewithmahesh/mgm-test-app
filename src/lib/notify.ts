import { isRunningInExpoGo } from 'expo'
import { AppState, Platform } from 'react-native'

// Local notifications: shown by the phone itself (exam reminders, admissions, AI questions ready).
// Push from the server when the app is closed would need a push service on the website.

type NotificationsModule = typeof import('expo-notifications')

/**
 * Expo Go on Android can't load expo-notifications: importing it registers a push-token listener that
 * throws ("removed from Expo Go with SDK 53"). There the app runs without notifications; the installed
 * app (development or store build) and iOS have them.
 */
export const notificationsSupported = !(Platform.OS === 'android' && isRunningInExpoGo())

// eslint-disable-next-line @typescript-eslint/no-require-imports
const N: NotificationsModule | null = notificationsSupported ? require('expo-notifications') : null

N?.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
})

export type Permission = 'granted' | 'denied' | 'undetermined' | 'unsupported'

let enabled = true
let channelReady = false
const scheduled = new Map<string, string>()

export function setNotificationsEnabled(value: boolean) {
  enabled = value
  if (!value && N) void N.cancelAllScheduledNotificationsAsync().then(() => scheduled.clear()).catch(() => {})
}

async function ensureChannel(n: NotificationsModule) {
  if (Platform.OS !== 'android' || channelReady) return
  await n.setNotificationChannelAsync('exams', { name: 'Exams and results', importance: n.AndroidImportance.HIGH, vibrationPattern: [0, 200, 120, 200], lightColor: '#c6613f' })
  channelReady = true
}

/** Current permission; asks the phone when `ask` is set and the person hasn't decided yet. */
export async function notificationPermission(ask: boolean): Promise<Permission> {
  if (!N) return 'unsupported'
  try {
    await ensureChannel(N)
    const current = await N.getPermissionsAsync()
    if (current.granted) return 'granted'
    if (!ask || !current.canAskAgain) return current.canAskAgain ? 'undetermined' : 'denied'
    const next = await N.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } })
    return next.granted ? 'granted' : next.canAskAgain ? 'undetermined' : 'denied'
  } catch {
    return 'unsupported'
  }
}

/** Show a notification now. `onlyInBackground` skips it while the app is on screen (a toast covers that). */
export async function notify(title: string, body: string, options: { onlyInBackground?: boolean } = {}) {
  if (!N || !enabled) return
  if (options.onlyInBackground && AppState.currentState === 'active') return
  try {
    if ((await notificationPermission(false)) !== 'granted') return
    await N.scheduleNotificationAsync({ content: { title, body, sound: true }, trigger: Platform.OS === 'android' ? { channelId: 'exams' } : null })
  } catch { /* notifications unavailable */ }
}

/** Schedule (or reschedule) a reminder identified by `key`; past dates are ignored. */
export async function remindAt(key: string, date: Date, title: string, body: string) {
  if (!N || !enabled || date.getTime() <= Date.now() + 5_000) return
  try {
    if ((await notificationPermission(false)) !== 'granted') return
    const previous = scheduled.get(key)
    if (previous) await N.cancelScheduledNotificationAsync(previous)
    const id = await N.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date, ...(Platform.OS === 'android' ? { channelId: 'exams' } : {}) },
    })
    scheduled.set(key, id)
  } catch { /* notifications unavailable */ }
}

export async function cancelReminder(key: string) {
  const id = scheduled.get(key)
  if (!N || !id) return
  scheduled.delete(key)
  await N.cancelScheduledNotificationAsync(id).catch(() => {})
}
