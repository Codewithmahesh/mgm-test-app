// Shapes of the website's practicals API (mgm-test/lib/practical-types.ts). The app shows progress and
// exports the practical PDF; students solve experiments on the website, which has the code editor.

export type PracticalSubject = {
  id: string
  title: string
  code: string
  description: string
  classLabels: string[]
  experiments: number
  students: number
  completionPercent: number | null
}

export type CellStatus = 'solved' | 'attempted' | 'open' | 'locked'

export type Progress = {
  experiments: { id: string; order: number; title: string; solvedBy: number; attemptedBy: number }[]
  students: {
    id: string
    name: string
    rollNumber: string
    classLabel: string
    solved: number
    practiceSolved: number
    practiceAttempted: number
    lastActivity: string | null
    cells: { experiment: string; status: CellStatus; attempts: number; solvedAt: string | null; hiddenPassed: number | null; hiddenTotal: number | null; practiceSolved: number; practiceAttempted: number }[]
  }[]
}

export type StudentSubmission = {
  id: string
  experiment: { id: string; order: number; title: string } | null
  practice: { id: string; title: string; source: 'faculty' | 'ai' } | null
  language: string
  code: string
  samplesPassed: number
  samplesTotal: number
  hiddenPassed: number
  hiddenTotal: number
  solved: boolean
  compileError: string
  createdAt: string
}

export type MyPractical = {
  id: string
  title: string
  code: string
  description: string
  faculty: string
  experiments: number
  solved: number
  next: { id: string; order: number; title: string } | null
  practiceSolved: number
}

export type MyLevel = {
  id: string
  order: number
  title: string
  topic: string
  status: 'solved' | 'open' | 'locked'
  attempts: number
  solvedAt: string | null
  hiddenPassed: number | null
  hiddenTotal: number
  practiceSolved: number
}

/** A background AI job writing experiments for a practical (GET /api/practicals/:id/jobs). */
export type PracticalJob = {
  id: string
  kind: 'import' | 'draft'
  status: 'running' | 'finished' | 'cancelled'
  level: string
  total: number
  done: number
  failed: number
  /** The experiment being written now. */
  current: string
  nextRetryAt: string | null
  lastError: string
  items: { title: string; status: 'pending' | 'running' | 'done' | 'failed'; error: string; order: number | null }[]
  createdAt: string
  finishedAt: string | null
}

export type ReportStatus = 'solved' | 'not_solved' | 'compile_error' | 'not_submitted' | 'locked'

/** One experiment (or practice problem) in a practical report: the problem, the student's code and how it ran. */
export type ReportEntry = {
  order: number
  title: string
  practice: { title: string; source: 'faculty' | 'ai' } | null
  /** Null when the student may not see it yet (a locked experiment in their own report). */
  problem: { text: string; inputFormat: string; outputFormat: string; constraints: string; samples: { input: string; output: string; explanation: string }[] } | null
  status: ReportStatus
  attempts: number
  submittedAt: string | null
  solvedAt: string | null
  score: { samplesPassed: number; samplesTotal: number; hiddenPassed: number; hiddenTotal: number } | null
  /** The latest submission's code, or the student's unsubmitted draft. */
  code: { language: string; text: string; draft: boolean } | null
  /** The code run on the sample inputs. `note` says why there is no output when there is none. */
  execution: { compileError: string; results: { testCase: number; passed: boolean; input: string; expected: string; actual: string }[]; note: string }
}

/** Everything the practical PDF needs: who, which practical, and each experiment's work. */
export type PracticalReport = {
  generatedAt: string
  student: { name: string; rollNumber: string; email: string; classLabel: string }
  subject: { title: string; code: string }
  entries: ReportEntry[]
}
