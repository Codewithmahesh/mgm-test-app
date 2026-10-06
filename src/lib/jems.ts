// JEMS: helps final-year students get hired by MSMEs. This file is the whole data layer: typed models,
// real GitHub and LeetCode data from the JEMS stats server (lib/jems-sources.ts), and an in-memory mock
// seeded with the sample data from the design for everything that has no backend yet (assessment,
// gaps, roadmap). Screens only call the async functions below, so each one can become a real `api()`
// call later without touching the UI.

import type { Tone } from '@/theme'
import { fetchGithub, fetchLeetcode, type GithubRepoData, type LeetcodeData } from './jems-sources'

/* ---------------- Models ---------------- */

export type Level = 'beginner' | 'intermediate' | 'advanced'
export const LEVELS: { value: Level; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]
export const levelLabel = (level: Level | null | undefined) => LEVELS.find(l => l.value === level)?.label ?? 'none'

export type SkillCategory = 'languages' | 'frameworks' | 'databases' | 'tools'
export type Skill = { id: string; name: string; category: SkillCategory }
export type Option = { value: string; label: string }

export type JemsProfile = { fullName: string; college: string; branch: string; year: string; roleId: string }
export type SkillRatings = Record<string, Level>
export type Links = { github: string; leetcode: string; repos: string[] }
export type Onboarding = { profile: JemsProfile; ratings: SkillRatings; links: Links }

export type Repo = {
  name: string
  language: string | null
  description: string | null
  url: string
  homepage: string | null
  topics: string[]
  stars: number
  isFork: boolean
  pushedAt: string | null
}
export type GithubLookup = { username: string; name: string | null; repoCount: number; repos: Repo[] }
export type LeetcodeLookup = {
  username: string
  ranking: number | null
  solved: number
  byDifficulty: { label: Difficulty; solved: number }[]
  /** Solved count per LeetCode tag (Array, Dynamic Programming…), most solved first. */
  tags: { name: string; solved: number }[]
}
/** What the student connected in onboarding, kept so the report can be built from it. */
export type Sources = { github: GithubLookup | null; leetcode: LeetcodeLookup | null }

/** Where the student is in the JEMS journey. */
export type JemsStatus = { onboarded: boolean; assessed: boolean; roadmapReady: boolean; roleLabel: string }

export type Difficulty = 'Easy' | 'Medium' | 'Hard'
export type Question = {
  id: string
  skill: string
  difficulty: Difficulty
  prompt: string
  code?: string
  /** `mcq` picks one option; `code` asks for a short written answer. */
  kind: 'mcq' | 'code'
  options?: string[]
}
export type Answer = number | string
export type AssessmentInfo = {
  skillCount: number
  questionCount: number
  minutes: number
  codeCount: number
  coverage: { skill: string; count: number }[]
  rules: string[]
}
export type Paper = { mode: 'main' | 'mini'; title: string; minutes: number; questions: Question[]; passPercent?: number }
/** A mini-assessment question the student got wrong (or skipped), with the right answer and why. */
export type MissedQuestion = {
  id: string
  skill: string
  topic: string
  prompt: string
  code?: string
  /** null when the question was skipped. */
  yourAnswer: string | null
  correctAnswer: string
  explain: string
}
/** A topic to go back over, ranked by how much of it was missed. */
export type RelearnTopic = { topic: string; skill: string; missed: number; total: number; lesson: string | null; url: string }
export type MiniAttempt = { percent: number; missed: MissedQuestion[]; relearn: RelearnTopic[] }
export type MiniResult = MiniAttempt & { correct: number; total: number; passed: boolean; passPercent: number; nextModuleId: string | null }

export type Verdict = 'match' | 'below' | 'above'
export type Strength = 'strong' | 'ok' | 'weak'
export type SkillReport = {
  updatedLabel: string
  readiness: number
  headline: string
  summary: string
  /** `dsa` is null when no LeetCode profile was connected. */
  scores: { assessment: number; projects: number; dsa: number | null }
  skills: { name: string; selfRated: Level; verified: Level; verdict: Verdict }[]
  dsa: {
    username: string
    solved: number
    byDifficulty: { label: Difficulty; solved: number; target: number }[]
    topics: { name: string; strength: Strength }[]
  } | null
  projects: { name: string; language: string | null; url: string; tags: { label: string; tone: Tone }[] }[]
}

export type Priority = 'critical' | 'important' | 'nice'
export type Gap = { id: string; skill: string; needs: string; you: string; priority: Priority }
export type GapAnalysis = { roleLabel: string; match: number; missing: Gap[]; weak: Gap[]; matched: { skill: string; level: string }[] }

export type ModuleStatus = 'done' | 'in_progress' | 'locked'
export type Lesson = { id: string; title: string; minutes: number; done: boolean }
export type Resource = { id: string; kind: 'video' | 'docs' | 'article'; title: string; meta: string; url: string }
export type PracticeItem = { id: string; title: string; detail?: string; done: boolean }
export type RoadmapModule = {
  id: string
  index: number
  weeks: string
  title: string
  gaps: { label: string; priority: Priority }[]
  hours: number
  status: ModuleStatus
  levelFrom: string
  levelTo: string
  why: string
  lessons: Lesson[]
  resources: Resource[]
  practice: PracticeItem[]
  /** `lastFail` keeps the analysis of the latest failed try until the module is passed. */
  mini: { questions: number; passPercent: number; passed: boolean; lastFail?: MiniAttempt | null }
}
export type Roadmap = { roleShort: string; weeks: number; gapCount: number; reassessWeek: number; modules: RoadmapModule[] }

/* ---------------- Reference data ---------------- */

export const BRANCHES: Option[] = [
  { value: 'cse', label: 'Computer Sci. & Engg.' },
  { value: 'it', label: 'Information Technology' },
  { value: 'entc', label: 'Electronics & Telecom' },
  { value: 'electrical', label: 'Electrical Engg.' },
  { value: 'mechanical', label: 'Mechanical Engg.' },
  { value: 'civil', label: 'Civil Engg.' },
]
export const YEARS: Option[] = [
  { value: 'second', label: 'Second year' },
  { value: 'third', label: 'Third year' },
  { value: 'final', label: 'Final year' },
]
export const ROLES: (Option & { short: string })[] = [
  { value: 'frontend', label: 'Frontend Developer', short: 'Frontend' },
  { value: 'backend', label: 'Backend Developer', short: 'Backend' },
  { value: 'fullstack', label: 'Full Stack Developer', short: 'Full Stack' },
  { value: 'mobile', label: 'Mobile App Developer', short: 'Mobile' },
  { value: 'data', label: 'Data Analyst', short: 'Data' },
  { value: 'qa', label: 'QA / Testing', short: 'QA' },
]
export const SKILL_CATEGORIES: { value: SkillCategory; label: string }[] = [
  { value: 'languages', label: 'Languages' },
  { value: 'frameworks', label: 'Frameworks' },
  { value: 'databases', label: 'Databases' },
  { value: 'tools', label: 'Tools' },
]
export const MIN_SKILLS = 5
export const MAX_REPOS = 3

const SKILLS: Skill[] = [
  ...['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Kotlin'].map(name => ({ name, category: 'languages' as const })),
  ...['React', 'Node.js', 'Express', 'Next.js', 'React Native', 'Django', 'Spring Boot'].map(name => ({ name, category: 'frameworks' as const })),
  ...['SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis'].map(name => ({ name, category: 'databases' as const })),
  ...['Git and GitHub', 'Docker', 'Jest', 'Linux', 'Postman', 'AWS'].map(name => ({ name, category: 'tools' as const })),
].map(s => ({ ...s, id: s.name.toLowerCase().replace(/[^a-z0-9+]+/g, '-') }))

/* ---------------- Mock backend ---------------- */

const wait = (ms = 450) => new Promise(resolve => setTimeout(resolve, ms))
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const QUESTIONS: (Question & { answer?: number })[] = [
  // JavaScript (6)
  { id: 'js1', skill: 'JavaScript', difficulty: 'Easy', kind: 'mcq', prompt: 'What does typeof null return?', options: ['"null"', '"object"', '"undefined"', '"number"'], answer: 1 },
  { id: 'js2', skill: 'JavaScript', difficulty: 'Easy', kind: 'mcq', prompt: 'What does this log?', code: 'console.log(\n  [1, 2, 3].map(n => n * 2).filter(n => n > 2)\n)', options: ['[2, 4, 6]', '[4, 6]', '[1, 2, 3]', '[]'], answer: 1 },
  { id: 'js3', skill: 'JavaScript', difficulty: 'Easy', kind: 'mcq', prompt: 'What is 0.1 + 0.2 === 0.3?', options: ['true', 'false', 'TypeError', 'undefined'], answer: 1 },
  { id: 'js4', skill: 'JavaScript', difficulty: 'Easy', kind: 'mcq', prompt: 'Which declaration cannot be reassigned?', options: ['var', 'let', 'const', 'function'], answer: 2 },
  { id: 'js5', skill: 'JavaScript', difficulty: 'Medium', kind: 'mcq', prompt: 'In what order are the letters logged?', code: "console.log('a')\nsetTimeout(() => console.log('b'), 0)\nPromise.resolve().then(() => console.log('c'))\nconsole.log('d')", options: ['a b c d', 'a d c b', 'a d b c', 'a c d b'], answer: 1 },
  { id: 'js6', skill: 'JavaScript', difficulty: 'Medium', kind: 'code', prompt: 'Write unique(arr): return the array without duplicates, keeping the first time each value appears.', code: 'function unique(arr) {\n  // your code\n}' },
  // React (6)
  { id: 'r1', skill: 'React', difficulty: 'Medium', kind: 'mcq', prompt: 'After one tap on the button that calls add(), what does n show?', code: 'const [n, setN] = useState(0)\n\nconst add = () => {\n  setN(n + 1)\n  setN(n + 1)\n}', options: ['0', '1', '2', 'It throws an error'], answer: 1 },
  { id: 'r2', skill: 'React', difficulty: 'Easy', kind: 'mcq', prompt: 'Which hook runs after render to sync with something outside React?', options: ['useMemo', 'useEffect', 'useRef', 'useId'], answer: 1 },
  { id: 'r3', skill: 'React', difficulty: 'Easy', kind: 'mcq', prompt: 'Why do list items need a key?', options: ['To style them', 'So React can match items between renders', 'For screen readers', 'Keys do nothing'], answer: 1 },
  { id: 'r4', skill: 'React', difficulty: 'Medium', kind: 'mcq', prompt: 'When does clearInterval run?', code: 'useEffect(() => {\n  const id = setInterval(tick, 1000)\n  return () => clearInterval(id)\n}, [])', options: ['Every second', 'Before each re-render', 'When the component unmounts', 'Never'], answer: 2 },
  { id: 'r5', skill: 'React', difficulty: 'Medium', kind: 'mcq', prompt: 'What happens when you change ref.current?', options: ['The component re-renders', 'Nothing re-renders', 'React throws in strict mode', 'State resets'], answer: 1 },
  { id: 'r6', skill: 'React', difficulty: 'Easy', kind: 'mcq', prompt: '"Lifting state up" means…', options: ['Moving state to the closest common parent', 'Using global variables', 'Keeping state in a ref', 'Using context for everything'], answer: 0 },
  // TypeScript (4)
  { id: 'ts1', skill: 'TypeScript', difficulty: 'Easy', kind: 'mcq', prompt: "What is the type of x in: const x = 'hi'?", options: ['string', '"hi"', 'any', 'unknown'], answer: 1 },
  { id: 'ts2', skill: 'TypeScript', difficulty: 'Medium', kind: 'mcq', prompt: 'What is the type of n?', code: 'function first<T>(items: T[]): T | undefined {\n  return items[0]\n}\nconst n = first([1, 2, 3])', options: ['number', 'number | undefined', 'T', 'any'], answer: 1 },
  { id: 'ts3', skill: 'TypeScript', difficulty: 'Medium', kind: 'mcq', prompt: 'How is unknown different from any?', options: ['They are the same', 'unknown must be narrowed before use', 'any is safer', 'unknown only works on objects'], answer: 1 },
  { id: 'ts4', skill: 'TypeScript', difficulty: 'Easy', kind: 'mcq', prompt: 'What does Partial<User> do?', options: ['Makes every property optional', 'Removes all properties', 'Makes properties readonly', 'Picks one property'], answer: 0 },
  // Node.js (5)
  { id: 'n1', skill: 'Node.js', difficulty: 'Easy', kind: 'mcq', prompt: 'Which built-in module reads files?', options: ['http', 'fs', 'path', 'os'], answer: 1 },
  { id: 'n2', skill: 'Node.js', difficulty: 'Medium', kind: 'mcq', prompt: 'What does GET /users/42 return?', code: "app.get('/users/:id', (req, res) => {\n  res.json({ id: req.params.id })\n})", options: ['{ "id": 42 }', '{ "id": "42" }', '404 Not Found', '{ "id": ":id" }'], answer: 1 },
  { id: 'n3', skill: 'Node.js', difficulty: 'Easy', kind: 'mcq', prompt: 'Which status code means a resource was created?', options: ['200', '201', '204', '301'], answer: 1 },
  { id: 'n4', skill: 'Node.js', difficulty: 'Medium', kind: 'mcq', prompt: 'How does Node run your JavaScript?', options: ['One main thread with an event loop', 'One thread per request', 'A new process per function', 'Inside a browser'], answer: 0 },
  { id: 'n5', skill: 'Node.js', difficulty: 'Easy', kind: 'mcq', prompt: 'Where should a database password live?', options: ['In the source code', 'In an environment variable', 'In package.json', 'In the README'], answer: 1 },
  // Python (4)
  { id: 'p1', skill: 'Python', difficulty: 'Easy', kind: 'mcq', prompt: 'What is len({1, 2, 2, 3})?', options: ['4', '3', '2', 'Error'], answer: 1 },
  { id: 'p2', skill: 'Python', difficulty: 'Easy', kind: 'mcq', prompt: 'What does this print?', code: 'nums = [1, 2, 3, 4]\nprint([n * n for n in nums if n % 2 == 0])', options: ['[1, 9]', '[4, 16]', '[2, 4]', '[1, 4, 9, 16]'], answer: 1 },
  { id: 'p3', skill: 'Python', difficulty: 'Medium', kind: 'mcq', prompt: 'What is wrong with this function?', code: 'def add(x, items=[]):\n    items.append(x)\n    return items', options: ['It is a syntax error', 'The list is shared between calls', 'Nothing, it is faster', 'append returns None'], answer: 1 },
  { id: 'p4', skill: 'Python', difficulty: 'Easy', kind: 'mcq', prompt: 'Which of these is immutable?', options: ['list', 'dict', 'tuple', 'set'], answer: 2 },
  // SQL (5)
  { id: 's1', skill: 'SQL', difficulty: 'Easy', kind: 'mcq', prompt: 'Which clause filters groups after aggregation?', options: ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'], answer: 1 },
  { id: 's2', skill: 'SQL', difficulty: 'Medium', kind: 'mcq', prompt: 'What does this return?', code: 'SELECT COUNT(*)\nFROM orders\nWHERE status = NULL;', options: ['Orders with no status', '0, because = NULL is never true', 'An error', 'Every row'], answer: 1 },
  { id: 's3', skill: 'SQL', difficulty: 'Easy', kind: 'mcq', prompt: 'An INNER JOIN returns…', options: ['All rows of both tables', 'Only rows with a match in both tables', 'Only rows from the left table', 'Rows without a match'], answer: 1 },
  { id: 's4', skill: 'SQL', difficulty: 'Easy', kind: 'mcq', prompt: 'A primary key…', options: ['Can repeat', 'Uniquely identifies a row and is never NULL', 'Must be text', 'Is required on every column'], answer: 1 },
  { id: 's5', skill: 'SQL', difficulty: 'Medium', kind: 'code', prompt: "Write a query that returns each customer's total order amount, highest first.", code: '-- orders(customer_id, amount)' },
]

// Extra TypeScript questions for the module 1 mini-assessment (10 with the four above).
const TS_EXTRA: (Question & { answer: number })[] = [
  { id: 'ts5', skill: 'TypeScript', difficulty: 'Easy', kind: 'mcq', prompt: 'A readonly property…', options: ['Can be changed once', 'Cannot be reassigned after creation', 'Is private', 'Is optional'], answer: 1 },
  { id: 'ts6', skill: 'TypeScript', difficulty: 'Easy', kind: 'mcq', prompt: 'What is keyof { a: 1; b: 2 }?', options: ['"a" | "b"', '1 | 2', 'string', 'object'], answer: 0 },
  { id: 'ts7', skill: 'TypeScript', difficulty: 'Medium', kind: 'mcq', prompt: 'What is the type of x inside the if?', code: "function f(x: string | number) {\n  if (typeof x === 'string') {\n    x\n  }\n}", options: ['string | number', 'string', 'number', 'never'], answer: 1 },
  { id: 'ts8', skill: 'TypeScript', difficulty: 'Easy', kind: 'mcq', prompt: 'Record<string, number> is…', options: ['An object with string keys and number values', 'An array of numbers', 'A tuple', 'A Map'], answer: 0 },
  { id: 'ts9', skill: 'TypeScript', difficulty: 'Medium', kind: 'mcq', prompt: "What type does ['a', 'b'] as const have?", options: ['string[]', 'readonly ["a", "b"]', 'any[]', '("a" | "b")[]'], answer: 1 },
  { id: 'ts10', skill: 'TypeScript', difficulty: 'Easy', kind: 'mcq', prompt: 'user?.address?.city when address is undefined gives…', options: ['A TypeError', 'undefined', 'null', 'an empty string'], answer: 1 },
]

// What each question tests and why the right answer is right. Kept apart from the questions so it
// never reaches the student before they submit.
const REVIEW: Record<string, { topic: string; explain: string }> = {
  js1: { topic: 'Types and typeof', explain: 'typeof null is "object", a bug kept since the first version of JavaScript. Check for null with === null.' },
  js2: { topic: 'Array methods', explain: 'map doubles every item to [2, 4, 6], then filter keeps the ones above 2: [4, 6].' },
  js3: { topic: 'Numbers and precision', explain: 'Floating point cannot store 0.1 or 0.2 exactly, so the sum is 0.30000000000000004.' },
  js4: { topic: 'Variables and scope', explain: 'A const binding cannot be reassigned. let and var can.' },
  js5: { topic: 'Event loop', explain: 'Sync code runs first (a, d), then microtasks like promises (c), then timers (b).' },
  r1: { topic: 'State updates', explain: 'Both calls read the same n from this render, so both set it to 1. Use setN(n => n + 1) to stack updates.' },
  r2: { topic: 'Effects', explain: 'useEffect runs after render, which is the place to sync with timers, subscriptions or the network.' },
  r3: { topic: 'Lists and keys', explain: 'Keys let React tell which item is which between renders, so it updates the right rows.' },
  r4: { topic: 'Effects', explain: 'With an empty dependency array the cleanup runs once, when the component unmounts.' },
  r5: { topic: 'Refs', explain: 'A ref is a mutable box. Changing ref.current never triggers a re-render.' },
  r6: { topic: 'State updates', explain: 'Move shared state to the closest common parent and pass it down as props.' },
  ts1: { topic: 'Type inference', explain: 'A const string can never change, so TypeScript infers the literal type "hi".' },
  ts2: { topic: 'Generics', explain: 'T is inferred as number from the argument, and the function returns T | undefined.' },
  ts3: { topic: 'Type narrowing', explain: 'unknown accepts anything but must be narrowed (typeof, instanceof…) before you use it. any skips every check.' },
  ts4: { topic: 'Utility types', explain: 'Partial<T> makes every property of T optional.' },
  ts5: { topic: 'Object types', explain: 'A readonly property is set when the object is created and cannot be reassigned after.' },
  ts6: { topic: 'Type operators', explain: 'keyof gives a union of the property names: "a" | "b".' },
  ts7: { topic: 'Type narrowing', explain: 'Inside the typeof x === "string" check, TypeScript narrows x to string.' },
  ts8: { topic: 'Utility types', explain: 'Record<K, V> is an object type whose keys are K and values are V.' },
  ts9: { topic: 'Type inference', explain: 'as const keeps the literal values and makes the array a readonly tuple.' },
  ts10: { topic: 'Object types', explain: 'Optional chaining stops at the first null or undefined and gives undefined instead of throwing.' },
  n1: { topic: 'Core modules', explain: 'fs is the file system module: readFile, writeFile and friends.' },
  n2: { topic: 'Routing and params', explain: 'Route params are always strings, so id is "42", not 42.' },
  n3: { topic: 'HTTP status codes', explain: '201 Created is the response for a request that made a new resource.' },
  n4: { topic: 'Event loop', explain: 'Node runs your JavaScript on one thread and uses the event loop to handle I/O without blocking.' },
  n5: { topic: 'Configuration and secrets', explain: 'Secrets go in environment variables so they never get committed with the code.' },
  p1: { topic: 'Built-in collections', explain: 'A set drops duplicates, so {1, 2, 2, 3} has 3 items.' },
  p2: { topic: 'Comprehensions', explain: 'Only even numbers pass the if, and each is squared: [4, 16].' },
  p3: { topic: 'Function defaults', explain: 'Default values are created once, so every call shares the same list. Default to None and create it inside.' },
  p4: { topic: 'Built-in collections', explain: 'Tuples cannot be changed after creation. Lists, dicts and sets can.' },
  s1: { topic: 'Grouping and aggregation', explain: 'WHERE filters rows before grouping. HAVING filters the groups after aggregation.' },
  s2: { topic: 'NULL handling', explain: 'Nothing equals NULL, not even NULL. Use IS NULL instead.' },
  s3: { topic: 'Joins', explain: 'An INNER JOIN keeps only the rows that have a match in both tables.' },
  s4: { topic: 'Keys and constraints', explain: 'A primary key is unique and never NULL, so it identifies exactly one row.' },
}

// Where to relearn each topic: the module lesson that covers it (if the module has it) and a reference.
const TOPIC_GUIDE: Record<string, { lesson?: string; url: string }> = {
  'Type inference': { lesson: 'Types and interfaces', url: 'https://www.typescriptlang.org/docs/handbook/type-inference.html' },
  'Object types': { lesson: 'Types and interfaces', url: 'https://www.typescriptlang.org/docs/handbook/2/objects.html' },
  'Type narrowing': { lesson: 'Types and interfaces', url: 'https://www.typescriptlang.org/docs/handbook/2/narrowing.html' },
  'Type operators': { lesson: 'Utility types', url: 'https://www.typescriptlang.org/docs/handbook/2/keyof-types.html' },
  Generics: { lesson: 'Generics', url: 'https://www.typescriptlang.org/docs/handbook/2/generics.html' },
  'Utility types': { lesson: 'Utility types', url: 'https://www.typescriptlang.org/docs/handbook/utility-types.html' },
  'Types and typeof': { url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof' },
  'Array methods': { url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map' },
  'Numbers and precision': { url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/EPSILON' },
  'Variables and scope': { url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const' },
  'Event loop': { url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop' },
  'State updates': { url: 'https://react.dev/learn/queueing-a-series-of-state-updates' },
  Effects: { url: 'https://react.dev/learn/synchronizing-with-effects' },
  'Lists and keys': { url: 'https://react.dev/learn/rendering-lists' },
  Refs: { url: 'https://react.dev/learn/referencing-values-with-refs' },
  'Core modules': { url: 'https://nodejs.org/api/fs.html' },
  'Routing and params': { url: 'https://expressjs.com/en/guide/routing.html' },
  'HTTP status codes': { url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status' },
  'Configuration and secrets': { url: 'https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs' },
  'Built-in collections': { url: 'https://docs.python.org/3/tutorial/datastructures.html' },
  Comprehensions: { url: 'https://docs.python.org/3/tutorial/datastructures.html#list-comprehensions' },
  'Function defaults': { url: 'https://docs.python.org/3/tutorial/controlflow.html#default-argument-values' },
  'Grouping and aggregation': { url: 'https://www.postgresql.org/docs/current/tutorial-agg.html' },
  'NULL handling': { url: 'https://www.postgresql.org/docs/current/functions-comparison.html' },
  Joins: { url: 'https://www.postgresql.org/docs/current/tutorial-join.html' },
  'Keys and constraints': { url: 'https://www.postgresql.org/docs/current/ddl-constraints.html' },
}

/** The assessment part of the report. Mocked until the assessment is graded on a server. */
const ASSESSMENT = {
  score: 71,
  skills: [
    { name: 'JavaScript', selfRated: 'intermediate', verified: 'intermediate', verdict: 'match' },
    { name: 'TypeScript', selfRated: 'beginner', verified: 'beginner', verdict: 'match' },
    { name: 'React', selfRated: 'intermediate', verified: 'intermediate', verdict: 'match' },
    { name: 'Node.js', selfRated: 'intermediate', verified: 'beginner', verdict: 'below' },
    { name: 'Python', selfRated: 'intermediate', verified: 'beginner', verdict: 'below' },
    { name: 'SQL', selfRated: 'beginner', verified: 'beginner', verdict: 'match' },
  ] as SkillReport['skills'],
}

/* ---------------- Report from GitHub and LeetCode ---------------- */

const DAY = 24 * 60 * 60 * 1000
const daysSince = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / DAY : Infinity)

/** Own, maintained work first (most recently pushed), then forks and archived repos. */
function toRepos(repos: GithubRepoData[]): Repo[] {
  const rank = (r: GithubRepoData) => (r.isFork || r.isArchived ? 1 : 0)
  return [...repos]
    .sort((a, b) => rank(a) - rank(b) || daysSince(a.pushedAt) - daysSince(b.pushedAt))
    .map(r => ({ name: r.name, language: r.language, description: r.description, url: r.url, homepage: r.homepage || null, topics: r.topics, stars: r.stars, isFork: r.isFork, pushedAt: r.pushedAt }))
}

function toLeetcode(data: LeetcodeData): LeetcodeLookup {
  const count = (difficulty: string) => data.solved.find(s => s.difficulty === difficulty)?.count ?? 0
  const { fundamental, intermediate, advanced } = data.solvedByTopic
  return {
    username: data.username,
    ranking: data.ranking,
    solved: count('All'),
    byDifficulty: (['Easy', 'Medium', 'Hard'] as const).map(label => ({ label, solved: count(label) })),
    tags: [...fundamental, ...intermediate, ...advanced]
      .map(t => ({ name: t.tagName, solved: t.problemsSolved }))
      .sort((a, b) => b.solved - a.solved),
  }
}

/** Roughly what a candidate who clears most MSME coding rounds has solved. */
const DSA_TARGETS: Record<Difficulty, number> = { Easy: 140, Medium: 170, Hard: 150 }
const DSA_WEIGHT: Record<Difficulty, number> = { Easy: 1, Medium: 2, Hard: 3 }
/** The topics coding rounds lean on, shown on the report whether or not the student has touched them. */
const CORE_TOPICS = ['Array', 'String', 'Hash Table', 'Tree', 'Binary Search', 'Dynamic Programming', 'Graph']
const strengthOf = (solved: number): Strength => (solved >= 20 ? 'strong' : solved >= 8 ? 'ok' : 'weak')

function dsaPart(lc: LeetcodeLookup) {
  const byDifficulty = lc.byDifficulty.map(d => ({ ...d, target: DSA_TARGETS[d.label] }))
  // Harder problems count for more; anything past the target doesn't add.
  const max = byDifficulty.reduce((sum, d) => sum + d.target * DSA_WEIGHT[d.label], 0)
  const got = byDifficulty.reduce((sum, d) => sum + Math.min(d.solved, d.target) * DSA_WEIGHT[d.label], 0)
  const topics = CORE_TOPICS.map(name => ({ name, strength: strengthOf(lc.tags.find(t => t.name === name)?.solved ?? 0) }))
  return { score: Math.round((got / max) * 100), dsa: { username: lc.username, solved: lc.solved, byDifficulty, topics } }
}

/** A quick review of one repo from its public metadata: how alive, documented and presentable it is. */
function reviewRepo(repo: Repo) {
  const age = daysSince(repo.pushedAt)
  const tags: { label: string; tone: Tone }[] = []
  let score = 0
  if (age <= 90) { tags.push({ label: 'Active', tone: 'green' }); score += 30 }
  else if (age <= 365) { tags.push({ label: 'Updated this year', tone: 'amber' }); score += 15 }
  else tags.push({ label: 'Stale', tone: 'red' })
  if (repo.description) { tags.push({ label: 'Description', tone: 'green' }); score += 25 }
  else tags.push({ label: 'No description', tone: 'red' })
  if (repo.homepage) { tags.push({ label: 'Live demo', tone: 'green' }); score += 20 }
  if (repo.topics.length) score += 10
  if (repo.stars > 0) { tags.push({ label: `${repo.stars} ${repo.stars === 1 ? 'star' : 'stars'}`, tone: 'blue' }); score += 10 }
  if (repo.isFork) tags.push({ label: 'Fork', tone: 'amber' })
  else score += 5
  return { score, project: { name: repo.name, language: repo.language, url: repo.url, tags } }
}

function buildReport(sources: Sources, picked: string[], roleShort: string): SkillReport {
  const reviews = (sources.github?.repos ?? []).filter(r => picked.includes(r.name)).map(reviewRepo)
  const projects = reviews.length ? Math.round(reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length) : 0
  const lc = sources.leetcode ? dsaPart(sources.leetcode) : null
  const parts = [ASSESSMENT.score, projects, ...(lc ? [lc.score] : [])]
  const readiness = Math.round(parts.reduce((sum, n) => sum + n, 0) / parts.length)
  const weak = [projects < 60 && 'your projects', lc && lc.score < 60 && 'DSA'].filter(Boolean) as string[]
  return {
    updatedLabel: 'Updated today',
    readiness,
    headline: `${readiness >= 70 ? 'Strong' : 'Solid'} base for ${roleShort} roles`,
    summary: !lc ? 'Connect LeetCode to get your DSA checked too.'
      : weak.length ? `${weak.join(' and ').replace(/^./, ch => ch.toUpperCase())} ${weak.length > 1 ? 'are' : 'is'} holding you back.`
      : 'Keep building and practising to stay ahead.',
    scores: { assessment: ASSESSMENT.score, projects, dsa: lc?.score ?? null },
    skills: ASSESSMENT.skills,
    dsa: lc?.dsa ?? null,
    projects: reviews.map(r => r.project),
  }
}

const GAPS: Omit<GapAnalysis, 'roleLabel'> = {
  match: 58,
  missing: [
    { id: 'rest', skill: 'REST API design', needs: 'Intermediate', you: 'none', priority: 'critical' },
    { id: 'jest', skill: 'Testing with Jest', needs: 'Intermediate', you: 'none', priority: 'critical' },
    { id: 'docker', skill: 'Docker', needs: 'Beginner', you: 'none', priority: 'nice' },
  ],
  weak: [
    { id: 'ts', skill: 'TypeScript', needs: 'Intermediate', you: 'Beginner', priority: 'critical' },
    { id: 'node', skill: 'Node.js', needs: 'Intermediate', you: 'Beginner', priority: 'critical' },
    { id: 'sql', skill: 'SQL', needs: 'Intermediate', you: 'Beginner', priority: 'important' },
    { id: 'dsa', skill: 'DSA: trees and DP', needs: 'Medium problems', you: 'Easy only', priority: 'important' },
  ],
  matched: [
    { skill: 'JavaScript', level: 'Intermediate' },
    { skill: 'React', level: 'Intermediate' },
    { skill: 'Git and GitHub', level: 'Intermediate' },
  ],
}

const lockedModule = (index: number, weeks: string, title: string, gaps: RoadmapModule['gaps'], hours: number, levelFrom: string, levelTo: string, why: string): RoadmapModule => ({
  id: `m${index}`, index, weeks, title, gaps, hours, status: 'locked', levelFrom, levelTo, why,
  lessons: [
    { id: `m${index}-l1`, title: 'Core ideas', minutes: 25, done: false },
    { id: `m${index}-l2`, title: 'Hands-on walkthrough', minutes: 30, done: false },
    { id: `m${index}-l3`, title: 'Common mistakes', minutes: 20, done: false },
  ],
  resources: [],
  practice: [{ id: `m${index}-p1`, title: 'Build a small example and push it to GitHub', done: false }],
  mini: { questions: 10, passPercent: 70, passed: false },
})

const ROADMAP_SEED: Omit<Roadmap, 'roleShort'> = {
  weeks: 8,
  gapCount: 6,
  reassessWeek: 8,
  modules: [
    {
      id: 'm1', index: 1, weeks: 'Weeks 1–2', title: 'TypeScript Fundamentals', hours: 10, status: 'in_progress',
      gaps: [{ label: 'TypeScript', priority: 'critical' }], levelFrom: 'Beginner', levelTo: 'Intermediate',
      why: 'Companies hiring full stack developers expect typed code. Your assessment showed solid JavaScript, but shaky ground on types, generics and how they prevent bugs before the code runs. Closing this gap is the quickest way to lift your match score.',
      lessons: [
        { id: 'm1-l1', title: 'Types and interfaces', minutes: 30, done: true },
        { id: 'm1-l2', title: 'Generics', minutes: 25, done: false },
        { id: 'm1-l3', title: 'Utility types', minutes: 20, done: false },
      ],
      resources: [
        { id: 'r1', kind: 'video', title: 'Generics explained with examples', meta: 'Video · 18 min', url: 'https://www.youtube.com/results?search_query=typescript+generics+explained' },
        { id: 'r2', kind: 'docs', title: 'Official handbook: Generics', meta: 'Docs · 12 min read', url: 'https://www.typescriptlang.org/docs/handbook/2/generics.html' },
        { id: 'r3', kind: 'article', title: 'Utility types by example', meta: 'Article · 8 min read', url: 'https://www.typescriptlang.org/docs/handbook/utility-types.html' },
      ],
      practice: [
        { id: 'm1-p1', title: 'Type a small API response', done: true },
        { id: 'm1-p2', title: 'Convert 3 JavaScript functions to TypeScript', done: false },
        { id: 'm1-p3', title: 'Mini-project: a typed API client', detail: "Push it to a GitHub repo and we'll review it for your project score.", done: false },
      ],
      mini: { questions: 10, passPercent: 70, passed: false },
    },
    lockedModule(2, 'Weeks 3–4', 'Node.js and REST APIs', [{ label: 'Node.js', priority: 'critical' }, { label: 'REST API design', priority: 'critical' }], 14, 'Beginner', 'Intermediate',
      'Most MSME full stack roles are backend-heavy. Building clean REST APIs in Node.js is the skill interviewers test most after JavaScript.'),
    lockedModule(3, 'Week 5', 'Testing with Jest', [{ label: 'Testing', priority: 'critical' }], 6, 'None', 'Intermediate',
      'Neither of your reviewed repos has tests. Teams want developers who can prove their code works and keep it working.'),
    lockedModule(4, 'Week 6', 'SQL and data modeling', [{ label: 'SQL', priority: 'important' }], 6, 'Beginner', 'Intermediate',
      'Almost every business app stores data in a relational database. Joins, grouping and good table design come up in every backend task.'),
    lockedModule(5, 'Weeks 7–8', 'DSA: trees and DP', [{ label: 'DSA', priority: 'important' }], 12, 'Easy only', 'Medium problems',
      'Your LeetCode history is mostly easy problems. Trees and dynamic programming are where most coding rounds filter candidates.'),
  ],
}

/** In-memory "server". Lost when the app restarts, like any mock. */
const db = {
  onboarding: null as Onboarding | null,
  sources: { github: null, leetcode: null } as Sources,
  assessed: false,
  roadmap: null as Omit<Roadmap, 'roleShort'> | null,
}

const roleOf = (roleId: string | undefined) => ROLES.find(r => r.value === roleId) ?? ROLES[2]

/* ---------------- API ---------------- */

export async function getStatus(): Promise<JemsStatus> {
  await wait(150)
  return { onboarded: Boolean(db.onboarding), assessed: db.assessed, roadmapReady: Boolean(db.roadmap), roleLabel: roleOf(db.onboarding?.profile.roleId).label }
}

export async function getOnboarding(): Promise<Onboarding | null> {
  await wait(150)
  return db.onboarding ? clone(db.onboarding) : null
}

export async function getSkillCatalog(): Promise<Skill[]> {
  return SKILLS
}

export async function saveOnboarding(data: Onboarding, sources?: Sources): Promise<void> {
  await wait()
  db.onboarding = clone(data)
  if (sources) db.sources = clone(sources)
}

export const GITHUB_PATTERN = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})\/?$/
export const LEETCODE_PATTERN = /^(?:https?:\/\/)?(?:www\.)?leetcode\.com\/(?:u\/)?([A-Za-z0-9_-]{1,40})\/?$/

/** Looks up a public GitHub profile and its repos through the JEMS stats server. */
export async function verifyGithub(link: string): Promise<GithubLookup> {
  const username = GITHUB_PATTERN.exec(link.trim())?.[1]
  if (!username) throw new Error('Use a link like github.com/your-name')
  try {
    const data = await fetchGithub(username)
    return { username: data.username, name: data.profile.name, repoCount: data.profile.publicRepos, repos: toRepos(data.repos) }
  } catch (err) {
    throw notFound(err, "We couldn't find that GitHub profile.")
  }
}

/** Looks up a public LeetCode profile through the JEMS stats server. */
export async function verifyLeetcode(link: string): Promise<LeetcodeLookup> {
  const username = LEETCODE_PATTERN.exec(link.trim())?.[1]
  if (!username) throw new Error('Use a link like leetcode.com/u/your-name')
  try {
    return toLeetcode(await fetchLeetcode(username))
  } catch (err) {
    throw notFound(err, "We couldn't find that LeetCode profile.")
  }
}

/** A friendlier message for a 404; anything else (offline, rate limit) keeps the server's own message. */
const notFound = (err: unknown, message: string) => (err && typeof err === 'object' && 'status' in err && err.status === 404 ? new Error(message) : err)

export async function getAssessmentInfo(): Promise<AssessmentInfo> {
  await wait(250)
  const coverage = ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'SQL'].map(skill => ({ skill, count: QUESTIONS.filter(q => q.skill === skill).length }))
  return {
    skillCount: coverage.length,
    questionCount: QUESTIONS.length,
    minutes: 45,
    codeCount: QUESTIONS.filter(q => q.kind === 'code').length,
    coverage,
    rules: ['Use a stable connection. Answers save automatically.', 'The test submits itself when time runs out.', 'Stay in the app. Leaving it is recorded.'],
  }
}

const ORDER = ['JavaScript', 'React', 'TypeScript', 'Node.js', 'Python', 'SQL']
const strip = ({ answer: _answer, ...q }: Question & { answer?: number }): Question => q

/** The paper for the skill assessment, or a module's mini-assessment when `moduleId` is given. */
export async function getPaper(moduleId?: string): Promise<Paper> {
  await wait(300)
  if (!moduleId) {
    const questions = [...QUESTIONS].sort((a, b) => ORDER.indexOf(a.skill) - ORDER.indexOf(b.skill)).map(strip)
    return { mode: 'main', title: 'Skill assessment', minutes: 45, questions }
  }
  const mod = (db.roadmap ?? ROADMAP_SEED).modules.find(m => m.id === moduleId)
  if (!mod) throw new Error('Module not found.')
  const skill = moduleId === 'm1' ? 'TypeScript' : ORDER[mod.index % ORDER.length]
  const pool = [...QUESTIONS, ...TS_EXTRA].filter(q => q.skill === skill && q.kind === 'mcq')
  const questions = (pool.length >= mod.mini.questions ? pool : [...pool, ...QUESTIONS.filter(q => q.kind === 'mcq' && q.skill !== skill)]).slice(0, mod.mini.questions).map(strip)
  return { mode: 'mini', title: `Module ${mod.index} mini-assessment`, minutes: 15, questions, passPercent: mod.mini.passPercent }
}

export async function submitAssessment(answers: Record<string, Answer>, meta: { leftApp: number }): Promise<void> {
  await wait(600)
  void answers
  void meta
  db.assessed = true
}

/**
 * Works out which questions were missed and which topics to relearn, weakest topic first.
 * A lesson is only suggested when this module actually has a lesson for that topic.
 */
function analyseMini(mod: RoadmapModule, questions: Question[], answers: Record<string, Answer>, keyed: Map<string, number | undefined>): MiniAttempt {
  const missed: MissedQuestion[] = []
  const topics = new Map<string, RelearnTopic>()
  for (const q of questions) {
    const right = keyed.get(q.id)
    const given = answers[q.id]
    const review = REVIEW[q.id] ?? { topic: q.skill, explain: '' }
    const guide = TOPIC_GUIDE[review.topic]
    const topic = topics.get(review.topic) ?? {
      topic: review.topic, skill: q.skill, missed: 0, total: 0,
      lesson: mod.lessons.find(l => l.title === guide?.lesson)?.title ?? null,
      url: guide?.url ?? `https://www.google.com/search?q=${encodeURIComponent(`${q.skill} ${review.topic}`)}`,
    }
    topic.total += 1
    topics.set(review.topic, topic)
    if (given === right) continue
    topic.missed += 1
    missed.push({
      id: q.id, skill: q.skill, topic: review.topic, prompt: q.prompt, code: q.code,
      yourAnswer: typeof given === 'number' ? q.options?.[given] ?? null : null,
      correctAnswer: right === undefined ? '' : q.options?.[right] ?? '',
      explain: review.explain,
    })
  }
  const relearn = [...topics.values()].filter(t => t.missed > 0)
    .sort((a, b) => b.missed / b.total - a.missed / a.total || b.missed - a.missed)
  return { percent: Math.round(((questions.length - missed.length) / questions.length) * 100), missed, relearn }
}

export async function submitMiniAssessment(moduleId: string, answers: Record<string, Answer>): Promise<MiniResult> {
  await wait(700)
  const paper = await getPaper(moduleId)
  const keyed = new Map([...QUESTIONS, ...TS_EXTRA].map(q => [q.id, q.answer]))
  const analysis = analyseMini(findModule(moduleId), paper.questions, answers, keyed)
  const total = paper.questions.length
  const passPercent = paper.passPercent ?? 70
  const passed = analysis.percent >= passPercent
  let nextModuleId: string | null = null
  const roadmap = db.roadmap!
  const i = roadmap.modules.findIndex(m => m.id === moduleId)
  const mod = roadmap.modules[i]
  // Keep the analysis on the module so the module and roadmap screens can point at what to relearn.
  mod.mini.lastFail = passed ? null : clone(analysis)
  if (passed) {
    mod.mini.passed = true
    mod.status = 'done'
    mod.lessons.forEach(l => { l.done = true })
    mod.practice.forEach(p => { p.done = true })
    const next = roadmap.modules[i + 1]
    if (next && next.status === 'locked') { next.status = 'in_progress'; nextModuleId = next.id }
  }
  return { ...analysis, correct: total - analysis.missed.length, total, passed, passPercent, nextModuleId }
}

export async function getReport(): Promise<SkillReport | null> {
  await wait()
  if (!db.assessed) return null
  return buildReport(db.sources, db.onboarding?.links.repos ?? [], roleOf(db.onboarding?.profile.roleId).short)
}

export async function getGapAnalysis(): Promise<GapAnalysis | null> {
  await wait()
  if (!db.assessed) return null
  return { ...clone(GAPS), roleLabel: roleOf(db.onboarding?.profile.roleId).label }
}

export async function generateRoadmap(): Promise<void> {
  await wait(800)
  if (!db.roadmap) db.roadmap = clone(ROADMAP_SEED)
}

export async function getRoadmap(): Promise<Roadmap | null> {
  await wait()
  if (!db.roadmap) return null
  return { ...clone(db.roadmap), roleShort: roleOf(db.onboarding?.profile.roleId).short }
}

export async function getModule(id: string): Promise<RoadmapModule> {
  await wait(250)
  const mod = (db.roadmap ?? ROADMAP_SEED).modules.find(m => m.id === id)
  if (!mod) throw new Error('Module not found.')
  return clone(mod)
}

function findModule(id: string) {
  const mod = db.roadmap?.modules.find(m => m.id === id)
  if (!mod) throw new Error('Generate your roadmap first.')
  return mod
}

/** Marks the next open lesson of a module as done. */
export async function completeLesson(moduleId: string, lessonId: string): Promise<RoadmapModule> {
  await wait(350)
  const mod = findModule(moduleId)
  const lesson = mod.lessons.find(l => l.id === lessonId)
  if (lesson) lesson.done = true
  return clone(mod)
}

export async function setPracticeDone(moduleId: string, itemId: string, done: boolean): Promise<RoadmapModule> {
  await wait(200)
  const mod = findModule(moduleId)
  const item = mod.practice.find(p => p.id === itemId)
  if (item) item.done = done
  return clone(mod)
}

/* ---------------- Display helpers ---------------- */

export const PRIORITY_META: Record<Priority, { label: string; tone: Tone }> = {
  critical: { label: 'Critical', tone: 'red' },
  important: { label: 'Important', tone: 'amber' },
  nice: { label: 'Nice to have', tone: 'neutral' },
}

export const VERDICT_META: Record<Verdict, { label: string; tone: Tone }> = {
  match: { label: 'Match', tone: 'green' },
  below: { label: 'Below', tone: 'amber' },
  above: { label: 'Above', tone: 'blue' },
}

export const STRENGTH_TONE: Record<Strength, Tone> = { strong: 'green', ok: 'amber', weak: 'red' }

/** The mini-assessment opens once every lesson and practice item is done. */
export const miniUnlocked = (m: RoadmapModule) => m.status !== 'locked' && m.lessons.every(l => l.done) && m.practice.every(p => p.done)
export const nextLesson = (m: RoadmapModule) => m.lessons.find(l => !l.done) ?? null
