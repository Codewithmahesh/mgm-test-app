// Talks to the JEMS stats server (the `trial` Express app), which reads a student's public GitHub repos and
// LeetCode stats. Only lib/jems.ts uses it; the screens keep going through that data layer.

import { JEMS_API_URL } from '@/config'
import { ApiError, send } from './api'

/* ---------------- Response shapes (mirror trial/src/app.js) ---------------- */

export type GithubRepoData = {
  name: string
  fullName: string
  description: string | null
  url: string
  homepage: string | null
  language: string | null
  topics: string[]
  stars: number
  forks: number
  isFork: boolean
  isArchived: boolean
  createdAt: string
  pushedAt: string | null
}

export type GithubData = {
  username: string
  profile: { username: string; name: string | null; avatarUrl: string; profileUrl: string; publicRepos: number; followers: number }
  repos: GithubRepoData[]
}

export type LeetcodeTag = { tagName: string; tagSlug: string; problemsSolved: number }

export type LeetcodeData = {
  username: string
  ranking: number | null
  solved: { difficulty: 'All' | 'Easy' | 'Medium' | 'Hard'; count: number; submissions: number }[]
  solvedByTopic: { fundamental: LeetcodeTag[]; intermediate: LeetcodeTag[]; advanced: LeetcodeTag[] }
}

/* ---------------- Requests ---------------- */

async function get<T>(path: string): Promise<T> {
  const response = await send(`${JEMS_API_URL}${path}`, 'GET', { Accept: 'application/json' }, undefined, 30_000, undefined, JEMS_API_URL)
  let data: { error?: string } = {}
  try { data = response.text ? JSON.parse(response.text) : {} } catch {}
  if (response.status < 200 || response.status >= 300) throw new ApiError(response.status, data.error || `Request failed (${response.status})`)
  return data as T
}

export const fetchGithub = (username: string) => get<GithubData>(`/api/github/${encodeURIComponent(username)}`)
export const fetchLeetcode = (username: string) => get<LeetcodeData>(`/api/leetcode/${encodeURIComponent(username)}`)
