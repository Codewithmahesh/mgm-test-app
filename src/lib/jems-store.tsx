import { useFocusEffect } from 'expo-router'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { COLLEGE_CITY, COLLEGE_NAME } from '@/components/brand'
import { errorMessage } from './api'
import { getOnboarding, type Answer, type GithubLookup, type JemsProfile, type LeetcodeLookup, type Level, type Links, type Onboarding } from './jems'
import { useSession } from './session'

/** An assessment in progress: kept here so leaving the screen (or a crash of the screen) doesn't lose answers. */
export type Attempt = { answers: Record<string, Answer>; flagged: string[]; current: number; endsAt: number; leftApp: number }

type Store = {
  /** The onboarding answers while the student moves between steps 1–3. */
  draft: Onboarding
  setProfile: (patch: Partial<JemsProfile>) => void
  setRating: (skillId: string, level: Level | null) => void
  setLinks: (patch: Partial<Links>) => void
  lookups: { github: GithubLookup | null; leetcode: LeetcodeLookup | null }
  setLookup: <K extends 'github' | 'leetcode'>(key: K, value: Store['lookups'][K]) => void
  attempts: Record<string, Attempt | undefined>
  saveAttempt: (key: string, attempt: Attempt | null) => void
  /** True the first time it's called in a session: Home uses it to open onboarding once. */
  claimOnboardingPrompt: () => boolean
}

const Context = createContext<Store | null>(null)

export function JemsProvider({ children }: { children: React.ReactNode }) {
  const { student } = useSession()
  const [draft, setDraft] = useState<Onboarding>(() => ({
    profile: { fullName: student?.name ?? '', college: `${COLLEGE_NAME}, ${COLLEGE_CITY}`, branch: 'cse', year: 'final', roleId: '' },
    ratings: {},
    links: { github: '', leetcode: '', repos: [] },
  }))
  const [lookups, setLookups] = useState<Store['lookups']>({ github: null, leetcode: null })
  const [attempts, setAttempts] = useState<Store['attempts']>({})
  const onboardingPrompted = useRef(false)
  const claimOnboardingPrompt = useCallback(() => {
    if (onboardingPrompted.current) return false
    onboardingPrompted.current = true
    return true
  }, [])

  // Start from what the student saved before, if anything.
  useEffect(() => {
    getOnboarding().then(saved => { if (saved) setDraft(saved) }).catch(() => {})
  }, [])

  const setProfile = useCallback((patch: Partial<JemsProfile>) => setDraft(d => ({ ...d, profile: { ...d.profile, ...patch } })), [])
  const setRating = useCallback((skillId: string, level: Level | null) => setDraft(d => {
    const ratings = { ...d.ratings }
    if (level) ratings[skillId] = level
    else delete ratings[skillId]
    return { ...d, ratings }
  }), [])
  const setLinks = useCallback((patch: Partial<Links>) => setDraft(d => ({ ...d, links: { ...d.links, ...patch } })), [])
  const setLookup = useCallback(<K extends 'github' | 'leetcode'>(key: K, value: Store['lookups'][K]) => setLookups(l => ({ ...l, [key]: value })), [])
  const saveAttempt = useCallback((key: string, attempt: Attempt | null) => setAttempts(a => ({ ...a, [key]: attempt ?? undefined })), [])

  const value = useMemo(() => ({ draft, setProfile, setRating, setLinks, lookups, setLookup, attempts, saveAttempt, claimOnboardingPrompt }),
    [draft, setProfile, setRating, setLinks, lookups, setLookup, attempts, saveAttempt, claimOnboardingPrompt])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useJems() {
  const value = useContext(Context)
  if (!value) throw new Error('useJems must be used inside JemsProvider')
  return value
}

/**
 * Loads data from the JEMS data layer and reloads it each time the screen comes into focus.
 * `reload` returns a promise, so it plugs straight into pull-to-refresh.
 */
export function useJemsData<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState('')
  const loadRef = useRef(load)
  useEffect(() => { loadRef.current = load })

  const reload = useCallback(async () => {
    try {
      const next = await loadRef.current()
      setData(next)
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useFocusEffect(useCallback(() => { void reload() }, [reload]))
  return { data, setData, error, loading: data === undefined && !error, reload }
}
