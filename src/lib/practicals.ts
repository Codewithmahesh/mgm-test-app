// Shapes of the website's practicals API (mgm-test/lib/practical-types.ts). The app shows progress only;
// students solve experiments on the website, which has the code editor.

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
