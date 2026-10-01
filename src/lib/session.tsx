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
  }, [])

  const loadProfile = useCallback(async (which: Role) => {
    if (which === 'faculty') setTeacher((await api<{ teacher: TeacherInfo }>('/api/auth/me')).teacher)
    else setStudent((await api<{ student: StudentRow }>('/api/student/me')).student)
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
          // Offline at launch: keep the session, the profile loads on the next refresh.
          await loadProfile(parsed.role).catch(() => {})
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
