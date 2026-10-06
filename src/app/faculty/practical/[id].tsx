import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Check, ChevronRight, FileDown, FlaskConical, Lock, Search, Sparkles, Users } from 'lucide-react-native'
import { AddWithAiSheet, PracticalJobsBanner } from '@/components/practical-ai'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { Alert, Badge, Button, Card, Divider, EmptyState, IconButton, Input, PageLoader, Progress, Screen, ScreenHeader, Segmented, Sheet, Spinner, Text, useFeedback } from '@/components/ui'
import { api, cached, errorMessage, languageLabel, relativeTime } from '@/lib/api'
import type { CellStatus, PracticalSubject, Progress as ProgressData, StudentSubmission } from '@/lib/practicals'
import { useReportExport } from '@/lib/use-report-export'
import { radius, useColors } from '@/theme'

type Tab = 'students' | 'experiments'
type StudentRow = ProgressData['students'][number]

/** One practical: each student's levels and each experiment's solve rate, plus a student's submissions. */
export default function PracticalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const c = useColors()
  const [subject, setSubject] = useState<PracticalSubject | null>(() => cached<{ subject: PracticalSubject }>(`/api/practicals/${id}`)?.subject ?? null)
  const [progress, setProgress] = useState<ProgressData | null>(() => cached<ProgressData>(`/api/practicals/${id}/progress`) ?? null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('students')
  const [query, setQuery] = useState('')
  const [student, setStudent] = useState<StudentRow | null>(null)
  const [adding, setAdding] = useState(false)
  // Bumped when a background job starts, so its banner shows right away.
  const [jobsKey, setJobsKey] = useState(0)
  const { toast } = useFeedback()

  const load = useCallback(() => Promise.all([
    api<{ subject: PracticalSubject }>(`/api/practicals/${id}`).then(d => setSubject(d.subject)),
    api<ProgressData>(`/api/practicals/${id}/progress`).then(setProgress),
  ]).then(() => setError('')).catch(err => setError(errorMessage(err))), [id])
  useFocusEffect(useCallback(() => { load() }, [load]))

  const visible = useMemo(() => (progress?.students ?? []).filter(s => !query || `${s.name} ${s.rollNumber} ${s.classLabel}`.toLowerCase().includes(query.toLowerCase())), [progress, query])
  const header = <ScreenHeader title={subject?.title ?? 'Practical'} eyebrow={subject?.code || 'Practical'} onBack={() => (router.canGoBack() ? router.back() : router.replace('/faculty/practicals'))} />
  if (error && !progress) return <Screen header={header}><Alert>{error}</Alert></Screen>
  if (!subject || !progress) return <Screen header={header}><PageLoader /></Screen>
  const total = progress.experiments.length

  return (
    <Screen header={header} onRefresh={load}>
      {error ? <Alert>{error}</Alert> : null}
      {/* One compact card: three full stat cards don't fit side by side on a phone. */}
      <Card style={{ flexDirection: 'row' }}>
        <MiniStat label="Experiments" value={total} icon={FlaskConical} color={c.violet} />
        <View style={{ width: 1, backgroundColor: c.border, marginVertical: 12 }} />
        <MiniStat label="Students" value={progress.students.length} icon={Users} color={c.primary} />
        <View style={{ width: 1, backgroundColor: c.border, marginVertical: 12 }} />
        <MiniStat label="Solved" value={subject.completionPercent == null ? '—' : `${subject.completionPercent}%`} icon={Check} color={c.success} />
      </Card>
      <Button icon={Sparkles} onPress={() => setAdding(true)}>Add experiments with AI</Button>
      <PracticalJobsBanner subjectId={id} refreshKey={jobsKey} onAdded={load} />
      <Segmented value={tab} onChange={setTab} options={[{ value: 'students', label: 'Students', count: progress.students.length }, { value: 'experiments', label: 'Experiments', count: total }]} />

      {tab === 'students' ? (
        <>
          <View>
            <Input value={query} onChangeText={setQuery} placeholder="Search students" style={{ paddingLeft: 38 }} autoCorrect={false} />
            <Search size={16} color={c.subtle} style={{ position: 'absolute', left: 12, top: 14 }} />
          </View>
          <Card>
            {visible.length === 0 ? <EmptyState icon={Users} title={progress.students.length ? 'No students match' : 'No students yet'} description={progress.students.length ? 'Try a different search.' : 'No activated students in the chosen classes yet.'} />
              : visible.map((s, i) => (
                <View key={s.id}>
                  {i > 0 && <Divider />}
                  <Pressable onPress={() => setStudent(s)} style={({ pressed }) => ({ padding: 14, gap: 8, backgroundColor: pressed ? c.muted : 'transparent' })}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text weight="semibold" numberOfLines={1}>{s.name}</Text>
                        <Text size={12} tone="mutedForeground" numberOfLines={1}>{[s.rollNumber && `Roll ${s.rollNumber}`, s.classLabel, s.lastActivity && `active ${relativeTime(s.lastActivity)}`].filter(Boolean).join(' · ')}</Text>
                      </View>
                      <Text size={13} weight="semibold" tabular>{s.solved}/{total}</Text>
                      <ChevronRight size={18} color={c.subtle} />
                    </View>
                    <LevelStrip cells={s.cells.map(cell => cell.status)} />
                    {s.practiceAttempted > 0 && <Text size={12} tone="mutedForeground">{`Practice: ${s.practiceSolved} solved of ${s.practiceAttempted} tried`}</Text>}
                  </Pressable>
                </View>
              ))}
          </Card>
        </>
      ) : (
        <Card>
          {total === 0 ? <EmptyState icon={FlaskConical} title="No experiments yet" description="Add them with AI from a topic or a photo of your practical list, or write them on the website." />
            : progress.experiments.map((e, i) => (
              <View key={e.id}>
                {i > 0 && <Divider />}
                <View style={{ padding: 14, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 32, height: 32, borderRadius: radius.md, backgroundColor: c.violetSoft, alignItems: 'center', justifyContent: 'center' }}><Text size={13} weight="semibold" color={c.violet}>{e.order}</Text></View>
                    <Text weight="medium" numberOfLines={2} style={{ flex: 1 }}>{e.title}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Progress value={progress.students.length ? (e.solvedBy / progress.students.length) * 100 : 0} tone="green" style={{ flex: 1 }} />
                    <Text size={12} tone="mutedForeground" tabular>{e.solvedBy}/{progress.students.length} solved</Text>
                  </View>
                  {e.attemptedBy > e.solvedBy && <Text size={12} tone="warning">{e.attemptedBy - e.solvedBy} tried, not solved yet</Text>}
                </View>
              </View>
            ))}
        </Card>
      )}

      <AddWithAiSheet subjectId={id} open={adding} onClose={() => setAdding(false)}
        onStarted={() => { setAdding(false); setJobsKey(k => k + 1); toast("Started in the background. We've emailed you, and will again when it's done.") }} />
      <SubmissionsSheet subjectId={id} student={student} experiments={progress.experiments} onClose={() => setStudent(null)} />
    </Screen>
  )
}

/** One figure in the stats card: icon, number and label, shrinking to fit a third of the width. */
function MiniStat({ label, value, icon: Icon, color }: { label: string; value: React.ReactNode; icon: typeof Check; color: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 4, paddingVertical: 14, paddingHorizontal: 6 }}>
      <Icon size={18} color={color} />
      <Text size={20} weight="semibold" tabular numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text size={12} tone="mutedForeground" numberOfLines={1}>{label}</Text>
    </View>
  )
}

/** A row of small squares, one per experiment: solved, tried, unlocked or locked. */
function LevelStrip({ cells }: { cells: CellStatus[] }) {
  const c = useColors()
  const color: Record<CellStatus, string> = { solved: c.success, attempted: c.warning, open: c.primary, locked: c.border }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }} accessibilityLabel={`${cells.filter(s => s === 'solved').length} of ${cells.length} solved`}>
      {cells.map((status, i) => <View key={i} style={{ width: 18, height: 8, borderRadius: 2, backgroundColor: color[status] }} />)}
    </View>
  )
}

/** One student's levels and submissions (newest first), with the code. */
function SubmissionsSheet({ subjectId, student, experiments, onClose }: { subjectId: string; student: StudentRow | null; experiments: ProgressData['experiments']; onClose: () => void }) {
  return (
    <Sheet open={Boolean(student)} onClose={onClose} full title={student?.name ?? ''} description={student ? `${student.solved} of ${experiments.length} experiments solved` : undefined}>
      {/* Keyed by student so its state starts fresh for each one. */}
      {student && <StudentDetail key={student.id} subjectId={subjectId} student={student} experiments={experiments} />}
    </Sheet>
  )
}

function StudentDetail({ subjectId, student, experiments }: { subjectId: string; student: StudentRow; experiments: ProgressData['experiments'] }) {
  const c = useColors()
  const [submissions, setSubmissions] = useState<StudentSubmission[] | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const { exporting, exportReport, viewer } = useReportExport()
  const reportPath = `/api/practicals/${subjectId}/students/${student.id}/report`
  useEffect(() => {
    api<{ submissions: StudentSubmission[] }>(`/api/practicals/${subjectId}/students/${student.id}`).then(d => setSubmissions(d.submissions)).catch(err => setError(errorMessage(err)))
  }, [subjectId, student.id])

  return (
    <>
      <Button variant="outline" icon={FileDown} loading={exporting === 'journal'} disabled={Boolean(exporting)} onPress={() => exportReport('journal', reportPath)} style={{ marginBottom: 14 }}>
        {exporting === 'journal' ? 'Preparing PDF…' : 'Download journal PDF'}
      </Button>
      <View style={{ gap: 2, marginBottom: 14 }}>
        {student.cells.map((cell, i) => {
          const e = experiments[i]
          return (
            <View key={cell.experiment} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {cell.status === 'solved' ? <Check size={15} color={c.success} /> : cell.status === 'locked' ? <Lock size={14} color={c.subtle} /> : <View style={{ width: 15, height: 15, borderRadius: 8, borderWidth: 2, borderColor: cell.status === 'attempted' ? c.warning : c.primary }} />}
              <Text size={13} numberOfLines={1} style={{ flex: 1 }}>{`${e?.order}. ${e?.title}`}</Text>
              <Text size={12} tone="mutedForeground" tabular>
                {cell.status === 'solved' ? (cell.hiddenTotal ? `hidden ${cell.hiddenPassed}/${cell.hiddenTotal}` : 'solved') : cell.status === 'attempted' ? `${cell.attempts} tries` : cell.status === 'open' ? 'not started' : 'locked'}
              </Text>
              {exporting === cell.experiment ? <View style={{ width: 34, alignItems: 'center' }}><Spinner /></View>
                : <IconButton icon={FileDown} size={34} label={`Download the PDF of experiment ${e?.order}`} disabled={Boolean(exporting)} onPress={() => exportReport(cell.experiment, `${reportPath}?experiment=${cell.experiment}`)} />}
            </View>
          )
        })}
      </View>
      {error ? <Alert>{error}</Alert> : !submissions ? <PageLoader /> : submissions.length === 0 ? <Text size={13} tone="mutedForeground">No submissions yet.</Text> : (
        <View style={{ gap: 8 }}>
          <Text size={12} weight="semibold" tone="subtle" uppercase tracking={0.6}>Submissions</Text>
          {submissions.map(s => (
            <Card key={s.id}>
              <Pressable onPress={() => setOpen(open === s.id ? null : s.id)} style={{ padding: 12, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Badge tone={s.solved ? 'green' : s.compileError ? 'red' : 'amber'}>{s.solved ? 'Solved' : s.compileError ? 'Compile error' : 'Not solved'}</Badge>
                  {s.practice && <Badge tone="violet" icon={s.practice.source === 'ai' ? Sparkles : undefined}>Practice</Badge>}
                  <Text size={12} tone="mutedForeground" style={{ marginLeft: 'auto' }}>{relativeTime(s.createdAt)}</Text>
                </View>
                <Text size={13} weight="medium" numberOfLines={2}>{`E${s.experiment?.order} · ${s.practice ? s.practice.title : s.experiment?.title}`}</Text>
                <Text size={12} tone="mutedForeground" tabular>{`${languageLabel(s.language)} · samples ${s.samplesPassed}/${s.samplesTotal}${s.hiddenTotal ? ` · hidden ${s.hiddenPassed}/${s.hiddenTotal}` : ''}`}</Text>
              </Pressable>
              {open === s.id && (
                <ScrollView horizontal style={{ borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.muted }} contentContainerStyle={{ padding: 12 }}>
                  <Text mono size={12} leading={18} selectable>{s.compileError ? `${s.compileError}\n\n${s.code}` : s.code}</Text>
                </ScrollView>
              )}
            </Card>
          ))}
        </View>
      )}
      {/* Inside the sheet, so on iPhone it opens on top of it. */}
      {viewer}
    </>
  )
}
