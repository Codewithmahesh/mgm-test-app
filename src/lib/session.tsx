import * as SecureStore from 'expo-secure-store'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setApiToken, setUnauthorizedHandler, type StudentRow, type TeacherInfo } from './api'

export type Role = 'student' | 'faculty'

type Session = {
  /** False until the saved sign-in has been read from secure storage. */
  ready: boolean
  role: Role | null
  teacher: TeacherInfo | null
  student: StudentRow | null
  signIn: (role: Role, token: string) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const KEY = 'mgm.session'
/** The last profile loaded, so the app can open straight away on launch and refresh it in the background. */
const PROFILE_KEY = 'mgm.session.profile'
const SessionContext = createContext<Session | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [role, setRole] = useState<Role | null>(null)
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null)
  const [student, setStudent] = useState<StudentRow | null>(null)

  const clear = useCallback(async () => {
    setApiToken(null)
    setRole(null)
    setTeacher(null)
    setStudent(null)
    await SecureStore.deleteItemAsync(KEY).catch(() => {})
    await SecureStore.deleteItemAsync(PROFILE_KEY).catch(() => {})
  }, [])

  const loadProfile = useCallback(async (which: Role) => {
    const profile = which === 'faculty'
      ? (await api<{ teacher: TeacherInfo }>('/api/auth/me')).teacher
      : (await api<{ student: StudentRow }>('/api/student/me')).student
    if (which === 'faculty') setTeacher(profile as TeacherInfo)
    else setStudent(profile as StudentRow)
    await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile)).catch(() => {})
  }, [])

  // Restore the saved sign-in on launch.
  useEffect(() => {
    setUnauthorizedHandler(() => { void clear() })
    ;(async () => {
      try {
        const saved = await SecureStore.getItemAsync(KEY)
        if (saved) {
          const parsed = JSON.parse(saved) as { role: Role; token: string }
          setApiToken(parsed.token)
          setRole(parsed.role)
          let profile: unknown = null
          try { profile = JSON.parse((await SecureStore.getItemAsync(PROFILE_KEY)) ?? 'null') } catch {}
          if (profile) {
            // Open with the saved profile now; the fresh one replaces it when the server answers.
            if (parsed.role === 'faculty') setTeacher(profile as TeacherInfo)
            else setStudent(profile as StudentRow)
            void loadProfile(parsed.role).catch(() => {})
          }
          // Offline at launch: keep the session, the profile loads on the next refresh.
          else await loadProfile(parsed.role).catch(() => {})
        }
      } finally {
        setReady(true)
      }
    })()
    return () => setUnauthorizedHandler(null)
  }, [clear, loadProfile])

  const signIn = useCallback(async (next: Role, token: string) => {
    setApiToken(token)
    await SecureStore.setItemAsync(KEY, JSON.stringify({ role: next, token }))
    await loadProfile(next)
    setRole(next)
  }, [loadProfile])

  const signOut = useCallback(async () => {
    const path = role === 'faculty' ? '/api/auth/logout' : '/api/student/auth/logout'
    await api(path, { method: 'POST' }).catch(() => {})
    await clear()
  }, [role, clear])

  const refresh = useCallback(async () => { if (role) await loadProfile(role) }, [role, loadProfile])

  const value = useMemo(() => ({ ready, role, teacher, student, signIn, signOut, refresh }), [ready, role, teacher, student, signIn, signOut, refresh])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside SessionProvider')
  return value
}
