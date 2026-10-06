// Talks to the existing MGM exam website (mgm-test) API. JSON in, JSON out; throws ApiError with the
// server's message. Same shape as mgm-test/lib/api.ts, plus the base URL and a Bearer token, since a
// phone app has no browser cookies.

import { API_URL } from '@/config'
import type { BloomLevel, BloomPlan } from './bloom'

export { API_URL }

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message)
  }
}

let token: string | null = null
let onUnauthorized: (() => void) | null = null

/**
 * The last answer to each GET, so a screen opened again shows what it had at once and refreshes in the
 * background, instead of a spinner for the round trip to the server. Cleared on sign-out.
 */
const responses = new Map<string, unknown>()
export const cached = <T>(path: string) => responses.get(path) as T | undefined

/** Set by the session provider after sign-in (and cleared on sign-out). */
export function setApiToken(value: string | null) {
  if (value !== token) responses.clear()
  token = value
}
/** Called when the server says the session is no longer valid, so the app can return to sign-in. */
export function setUnauthorizedHandler(handler: (() => void) | null) { onUnauthorized = handler }

type Options = { method?: string; body?: unknown; headers?: Record<string, string>; signal?: AbortSignal; timeoutMs?: number }

/**
 * Requests that can run for minutes on the server (maxDuration 300 s): AI generation, anything that
 * may submit attempts, since grading runs the students' code (attempt lists and pages, submit, ending a room),
 * practical reports, which run each experiment's code on its sample inputs, and reading a practical list.
 */
const LONG = /\/generation-jobs|\/generate-questions|\/attempts|\/report(?:\?|$)|\/practicals\/[^/]+\/import$|^\/api\/rooms\/[^/?]+$/
const defaultTimeout = (path: string, isForm: boolean) => (LONG.test(path) ? 310_000 : isForm ? 120_000 : 30_000)

type RawResponse = { status: number; text: string }

/**
 * One HTTP request over XMLHttpRequest rather than fetch: fetch in React Native has no way to set the
 * native timeout, so iOS gives up on any request that is silent for 60 s (an AI part usually is) and
 * reports it as a plain "Network request failed". XHR passes `timeout` down to NSURLRequest / OkHttp,
 * and on failure its responseText holds the native error ("The request timed out.", "Unable to resolve host"…).
 */
export function send(url: string, method: string, headers: Record<string, string>, body: string | FormData | undefined, timeoutMs: number, signal?: AbortSignal, server = API_URL) {
  return new Promise<RawResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, url)
    xhr.timeout = timeoutMs
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value))
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText })
    xhr.ontimeout = () => reject(new ApiError(0, `The server at ${server} took too long to answer. Check your internet connection, then try again.`, 'timeout'))
    xhr.onerror = () => {
      const detail = typeof xhr.responseText === 'string' ? xhr.responseText.trim().slice(0, 200) : ''
      reject(new ApiError(0, `Can't reach the server at ${server}. Check your internet connection, then try again.${detail ? ` (${detail})` : ''}`, 'network'))
    }
    xhr.onabort = () => reject(new ApiError(0, 'The request was cancelled.', 'aborted'))
    if (signal?.aborted) return xhr.abort()
    signal?.addEventListener('abort', () => xhr.abort())
    xhr.send(body ?? null)
  })
}

export async function api<T = unknown>(path: string, options: Options = {}): Promise<T> {
  if (!API_URL) throw new ApiError(0, 'The app is not connected to a server. Set SERVER in src/config.ts.')
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData
  const method = options.method ?? (options.body ? 'POST' : 'GET')
  const response = await send(
    `${API_URL}${path}`,
    method,
    {
      Accept: 'application/json',
      'x-client': 'mobile',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    options.body ? (isForm ? (options.body as FormData) : JSON.stringify(options.body)) : undefined,
    options.timeoutMs ?? defaultTimeout(path, isForm),
    options.signal,
  )
  let data: { error?: string; code?: string } = {}
  try { data = response.text ? JSON.parse(response.text) : {} } catch {}
  if (response.status === 401 && !path.includes('/auth/')) onUnauthorized?.()
  if (response.status < 200 || response.status >= 300) throw new ApiError(response.status, data.error || `Request failed (${response.status})`, data.code)
  if (method === 'GET') responses.set(path, data)
  return data as T
}

export const errorMessage = (error: unknown, fallback = 'Something went wrong.') => (error instanceof Error ? error.message : fallback)

/* ---------------- Shared types (mirrors mgm-test/lib/api.ts) ---------------- */

export type RoomStatus = 'draft' | 'open' | 'closed'

export type Room = {
  id: string
  title: string
  description: string
  instructions: string
  code: string
  questionsPerStudent: number
  /** True/False per student. */
  tfQuestions: number
  /** False on rooms made before True/False had its own count: there True/False questions count as MCQs. */
  tfSeparate: boolean
  codingQuestions: number
  marksPerQuestion: number
  negativeMarks: number
  codingMarks: number
  durationMinutes: number
  startsAt: string | null
  autoOpen: boolean
  status: RoomStatus
  showResults: 'after_submit' | 'after_end' | 'never'
  allowedClassrooms: string[]
  requireFullscreen: boolean
  blockCopyPaste: boolean
  maxViolations: number
  requireApproval: boolean
  createdAt: string
  updatedAt: string
  poolSize: number
  mcqPoolSize: number
  tfPoolSize: number
  codingPoolSize: number
  joined: number
  submitted: number
  pendingReview: number
  flagged: number
  waiting: number
  paperMode: 'random' | 'sets'
  setCount: number
  bloomPlan: BloomPlan
  averagePercent: number | null
}

export type Sample = { input: string; output: string; explanation: string }

export type DraftQuestion = {
  type: 'mcq' | 'tf' | 'coding'
  text: string
  options: string[]
  correctIndex: number | null
  topic: string
  bloom: BloomLevel | null
  set: string
  explanation: string
  title: string
  inputFormat: string
  outputFormat: string
  constraints: string
  samples: Sample[]
  /** Grading-only tests (coding), never shown to students. Sent to faculty only. */
  hiddenTests?: Sample[]
  points: number | null
  language: string
  starterCode: string
  imageUrl?: string
}

export type BankQuestion = DraftQuestion & { id: string; room: string | null; source: 'csv' | 'ai' | 'manual'; createdAt: string }

export type Classroom = { id: string; label: string; year: string; branch: string; division: string; students: number; active: number }

export type StudentRow = {
  id: string
  email: string
  name: string
  rollNumber: string
  prn: string
  classroomId: string | null
  year: string
  branch: string
  division: string
  classLabel: string
  status: 'active' | 'invited'
  profileComplete: boolean
  activatedAt: string | null
  createdAt: string | null
}

export type TeacherInfo = { id: string; name: string; email: string; department: string }

export const statusMeta: Record<RoomStatus, { label: string; tone: 'amber' | 'green' | 'neutral' }> = {
  draft: { label: 'Draft', tone: 'amber' },
  open: { label: 'Live', tone: 'green' },
  closed: { label: 'Ended', tone: 'neutral' },
}

export const YEAR_OPTIONS = [
  { value: 'FY', label: 'First Year (FY)' },
  { value: 'SY', label: 'Second Year (SY)' },
  { value: 'TY', label: 'Third Year (TY)' },
  { value: 'B.Tech', label: 'B.Tech' },
]

export const BRANCH_OPTIONS = [
  { value: 'CSE', label: 'Computer Science & Engineering' },
  { value: 'AIML', label: 'Artificial Intelligence & Machine Learning' },
  { value: 'IT', label: 'Information Technology' },
  { value: 'ENTC', label: 'Electronics & Telecommunication' },
  { value: 'MECH', label: 'Mechanical Engineering' },
  { value: 'CIVIL', label: 'Civil Engineering' },
  { value: 'EE', label: 'Electrical Engineering' },
]

export const DEPARTMENT_OPTIONS = [
  'Computer Science & Engineering',
  'Artificial Intelligence & Machine Learning',
  'Information Technology',
  'Electronics & Telecommunication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Basic Sciences & Humanities',
]

/** What each student's paper has, e.g. "20 MCQ + 5 True/False + 2 coding". */
export function paperSummary(room: { questionsPerStudent: number; tfQuestions?: number; codingQuestions?: number }) {
  return [
    `${room.questionsPerStudent} MCQ`,
    room.tfQuestions ? `${room.tfQuestions} True/False` : '',
    room.codingQuestions ? `${room.codingQuestions} coding` : '',
  ].filter(Boolean).join(' + ')
}

/** How a question counts on a room's papers: on older rooms True/False questions count as MCQs. */
export function paperKind(room: { tfSeparate?: boolean }, type: string): 'mcq' | 'tf' | 'coding' {
  if (type === 'coding') return 'coding'
  return type === 'tf' && room.tfSeparate ? 'tf' : 'mcq'
}

export const LANGUAGE_LABELS: Record<string, string> = { cpp: 'C++ 17', c: 'C', java: 'Java 17', python: 'Python 3', javascript: 'JavaScript (Node)' }
export const languageLabel = (value: string) => LANGUAGE_LABELS[value] ?? (value || 'Code')

/* ---------------- Formatting (same output as the website) ---------------- */

export function formatDate(value: string | Date | null | undefined, withTime = false) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN', withTime ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' })
}

export function relativeTime(value: string | Date | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 0) {
    const ahead = -seconds
    if (ahead < 3600) return `in ${Math.max(1, Math.round(ahead / 60))} min`
    if (ahead < 86400) return `in ${Math.round(ahead / 3600)} h`
    return formatDate(date)
  }
  if (seconds < 45) return 'just now'
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.round(seconds / 3600)} h ago`
  if (seconds < 172800) return 'yesterday'
  return formatDate(date)
}

export function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`
}

export function clock(seconds: number) {
  const s = Math.max(0, seconds)
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(n => String(n).padStart(2, '0')).join(':')
}

export const letter = (index: number | null | undefined) => (index == null || index < 0 ? '—' : String.fromCharCode(65 + index))

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '?'

export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`

/** A student's own exam attempt (GET /api/student/attempts). */
export type MyAttempt = {
  id: string
  room: { title: string; code: string; status: string }
  status: 'in_progress' | 'submitted'
  startedAt: string
  endsAt: string
  submittedAt: string | null
  totalQuestions: number
  resultVisible: boolean
  score: number | null
  maxScore: number | null
  codingPending: number | null
}
