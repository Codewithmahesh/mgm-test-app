import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { ChevronRight, Search, Trash2, Upload, UserCheck, UserPlus, Users } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { AppHeader } from '@/components/app-shell'
import { Alert, Badge, Button, Card, DetailRow, Divider, EmptyState, Field, Input, PageLoader, Screen, Segmented, Select, Sheet, Spinner, StatCard, Text, Textarea, useFeedback } from '@/components/ui'
import { api, errorMessage, formatDate, initials, type Classroom, type StudentRow } from '@/lib/api'
import { useColors } from '@/theme'

const LIMIT = 50
type Detail = { student: StudentRow; attempts: { id: string; room: string; code: string; status: string; score: number; maxScore: number; submittedAt: string | null; startedAt: string; tabSwitches: number }[] }

export default function StudentsTab() {
  const params = useLocalSearchParams<{ add?: string }>()
  const c = useColors()
  const { toast, confirm } = useFeedback()
  const [rows, setRows] = useState<StudentRow[] | null>(null)
  const [total, setTotal] = useState(0)
  const [active, setActive] = useState(0)
  const [domains, setDomains] = useState<string[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [unassigned, setUnassigned] = useState(0)
  const [query, setQuery] = useState('')
  const [classroom, setClassroom] = useState('all')
  const [status, setStatus] = useState<'all' | 'active' | 'invited'>('all')
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [addOpen, setAddOpen] = useState(params.add === '1')
  const [detail, setDetail] = useState<Detail | null>(null)
  const [opening, setOpening] = useState<string | null>(null)
  const request = useRef(0)

  const load = useCallback(async (nextPage = 1) => {
    const id = ++request.current
    const search = new URLSearchParams({ page: String(nextPage), limit: String(LIMIT) })
    if (query.trim()) search.set('q', query.trim())
    if (classroom !== 'all') search.set('classroom', classroom)
    if (status !== 'all') search.set('status', status)
    try {
      const d = await api<{ students: StudentRow[]; total: number; active: number; domains: string[] }>(`/api/students?${search}`)
      if (id !== request.current) return
      setRows(list => (nextPage === 1 ? d.students : [...(list ?? []), ...d.students]))
      setTotal(d.total); setActive(d.active); setDomains(d.domains); setPage(nextPage)
    } catch (err) { toast(errorMessage(err), 'error') }
  }, [query, classroom, status, toast])

  const loadClasses = useCallback(() => api<{ classrooms: Classroom[]; unassigned: number }>('/api/classrooms').then(d => { setClassrooms(d.classrooms); setUnassigned(d.unassigned) }).catch(() => {}), [])

  useEffect(() => { const t = setTimeout(() => { load(1) }, 250); return () => clearTimeout(t) }, [load])
  useFocusEffect(useCallback(() => { loadClasses() }, [loadClasses]))
  const [addParam, setAddParam] = useState(params.add)
  if (addParam !== params.add) { setAddParam(params.add); if (params.add === '1') setAddOpen(true) }

  async function remove(student: StudentRow) {
    if (!(await confirm({ title: `Remove ${student.name || student.email}?`, description: 'They will no longer be able to sign in. Their past exam results are kept.', confirmLabel: 'Remove student', tone: 'danger' }))) return
    setRows(list => list?.filter(s => s.id !== student.id) ?? null)
    setDetail(null)
    try { await api(`/api/students/${student.id}`, { method: 'DELETE' }); toast('Student removed.') } catch (err) { toast(errorMessage(err), 'error') }
    load(1); loadClasses()
  }

  async function open(student: StudentRow) {
    setOpening(student.id)
    try { setDetail(await api<Detail>(`/api/students/${student.id}`)) } catch (err) { toast(errorMessage(err), 'error') } finally { setOpening(null) }
  }

  const allTotal = classrooms.reduce((sum, cl) => sum + cl.students, 0) + unassigned
  const allActive = classrooms.reduce((sum, cl) => sum + cl.active, 0)
  const hasMore = (rows?.length ?? 0) < total

  return (
    <Screen edges={[]} header={<AppHeader title="Students" subtitle="They activate with an OTP to their email" />} onRefresh={() => Promise.all([load(1), loadClasses()])}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatCard label="On the list" value={allTotal} icon={Users} tone="blue" />
        <StatCard label="Activated" value={allActive} icon={UserCheck} tone="green" hint={allTotal ? `${Math.round((allActive / allTotal) * 100)}% of the list` : undefined} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Input value={query} onChangeText={setQuery} placeholder="Name, email, roll or PRN" style={{ paddingLeft: 38 }} autoCapitalize="none" />
          <Search size={16} color={c.subtle} style={{ position: 'absolute', left: 12, top: 14 }} />
        </View>
        <Button icon={UserPlus} onPress={() => setAddOpen(true)} style={{ height: 44 }}>Add</Button>
      </View>
      <Select title="Class" value={classroom} onChange={setClassroom} options={[
        { value: 'all', label: `All classes (${classrooms.length})` },
        ...classrooms.map(cl => ({ value: cl.id, label: `${cl.label} (${cl.students})` })),
        ...(unassigned > 0 ? [{ value: 'none', label: `No class yet (${unassigned})` }] : []),
      ]} />
      <Segmented value={status} onChange={setStatus} options={[{ value: 'all', label: 'Any status' }, { value: 'active', label: 'Activated' }, { value: 'invited', label: 'Not activated' }]} />

      {!rows ? <PageLoader /> : (
        <Card>
          {rows.length === 0 ? (
            <EmptyState icon={Users} title="No students found" description={query || classroom !== 'all' || status !== 'all' ? 'Try different filters.' : 'Add students by their college email to get started.'} action={<Button icon={UserPlus} onPress={() => setAddOpen(true)}>Add students</Button>} />
          ) : rows.map((s, i) => (
            <View key={s.id}>
              {i > 0 && <Divider />}
              <Pressable disabled={Boolean(opening)} onPress={() => open(s)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: pressed || opening === s.id ? c.muted : 'transparent' })}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Text size={13} weight="semibold" tone="primaryInk">{initials(s.name || s.email)}</Text></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text size={14} weight="medium" numberOfLines={1} tone={s.name ? 'foreground' : 'mutedForeground'}>{s.name || 'Name not set'}</Text>
                  <Text size={12} tone="mutedForeground" numberOfLines={1}>{[s.classLabel, s.rollNumber && `Roll ${s.rollNumber}`].filter(Boolean).join(' · ') || s.email}</Text>
                </View>
                {s.status === 'active' ? <Badge tone="green" dot>Active</Badge> : <Badge tone="amber">Invited</Badge>}
                {opening === s.id ? <Spinner /> : <ChevronRight size={17} color={c.subtle} />}
              </Pressable>
            </View>
          ))}
          <Divider />
          <View style={{ padding: 12, alignItems: 'center', gap: 8 }}>
            <Text size={12} tone="mutedForeground">{total} student{total === 1 ? '' : 's'}{status !== 'all' || classroom !== 'all' || query ? ' match' : ''} · {active} activated</Text>
            {hasMore && <Button variant="outline" size="sm" loading={loadingMore} onPress={async () => { setLoadingMore(true); await load(page + 1); setLoadingMore(false) }}>Load more</Button>}
          </View>
        </Card>
      )}

      <AddStudentsSheet open={addOpen} onClose={() => setAddOpen(false)} domains={domains} onAdded={() => { load(1); loadClasses() }} />

      <Sheet open={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.student.name || detail?.student.email || ''} description={detail?.student.email}
        footer={detail ? <Button variant="destructive-outline" icon={Trash2} style={{ flex: 1 }} onPress={() => remove(detail.student)}>Remove student</Button> : undefined}>
        {detail && (
          <View style={{ gap: 16 }}>
            <View>
              <DetailRow label="Status" value={detail.student.status === 'active' ? 'Activated' : 'Not activated'} />
              <DetailRow label="Class" value={detail.student.classLabel || '—'} />
              <DetailRow label="Roll no." value={detail.student.rollNumber || '—'} />
              <DetailRow label="PRN" value={detail.student.prn || '—'} />
              <DetailRow label="Activated" value={formatDate(detail.student.activatedAt)} />
              <DetailRow label="Added" value={formatDate(detail.student.createdAt)} />
            </View>
            <View style={{ gap: 8 }}>
              <Text size={14} weight="semibold">Exam history</Text>
              {detail.attempts.length === 0 ? <Text size={13} tone="mutedForeground">No exams taken yet.</Text> : detail.attempts.map(a => (
                <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text size={13} weight="medium" numberOfLines={1}>{a.room}</Text>
                    <Text size={12} tone="mutedForeground">{formatDate(a.submittedAt ?? a.startedAt)} · {a.tabSwitches} leave{a.tabSwitches === 1 ? '' : 's'}</Text>
                  </View>
                  {a.status === 'submitted' ? <Text size={14} weight="semibold" tabular>{a.score} / {a.maxScore}</Text> : <Badge tone="green">Writing</Badge>}
                </View>
              ))}
            </View>
          </View>
        )}
      </Sheet>
    </Screen>
  )
}

function AddStudentsSheet({ open, onClose, domains, onAdded }: { open: boolean; onClose: () => void; domains: string[]; onAdded: () => void }) {
  const { toast } = useFeedback()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ added: number; alreadyListed: number; invalid: string[] } | null>(null)
  const [error, setError] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) { setWasOpen(open); if (open) { setText(''); setResult(null); setError('') } }
  const count = new Set(text.match(/[^\s,;<>"']+@[^\s,;<>"']+/g) ?? []).size

  async function submit() {
    setSaving(true)
    setError('')
    try {
      const data = await api<{ added: number; alreadyListed: number; invalid: string[] }>('/api/students', { body: { text } })
      setResult(data)
      if (data.added) { toast(`${data.added} student${data.added === 1 ? '' : 's'} added.`); onAdded() }
    } catch (err) { setError(errorMessage(err)) } finally { setSaving(false) }
  }

  async function pickFile() {
    const picked = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel', 'application/octet-stream'], copyToCacheDirectory: true })
    if (picked.canceled) return
    try {
      const content = await new File(picked.assets[0].uri).text()
      setText(t => `${t}${t ? '\n' : ''}${content}`)
    } catch (err) { setError(errorMessage(err)) }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add students" description="Paste college emails, or pick a CSV / text file. Students then activate their own accounts with an OTP."
      footer={result ? <Button style={{ flex: 1 }} onPress={onClose}>Done</Button> : <>
        <Button variant="outline" style={{ flex: 1 }} onPress={onClose}>Cancel</Button>
        <Button style={{ flex: 1 }} disabled={!count} loading={saving} onPress={submit}>{saving ? 'Adding…' : `Add ${count || ''} student${count === 1 ? '' : 's'}`}</Button>
      </>}>
      {result ? (
        <View style={{ gap: 12 }}>
          <Alert tone="green">{`${result.added} added${result.alreadyListed ? ` · ${result.alreadyListed} were already on the list` : ''}.`}</Alert>
          {result.invalid.length > 0 && (
            <Alert tone="amber">
              <Text size={13} weight="medium" tone="warningInk">{result.invalid.length} skipped:</Text>
              {result.invalid.slice(0, 20).map(item => <Text key={item} size={12} tone="warningInk">• {item}</Text>)}
            </Alert>
          )}
          <Text size={13} tone="mutedForeground">Tell students to open the app or the portal, choose Student → Activate your account, and enter their college email.</Text>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {error ? <Alert>{error}</Alert> : null}
          <Field label="College emails" hint={domains.length ? `One per line, or separated by commas. Only @${domains.join(', @')} addresses are accepted.` : 'One per line, or separated by commas.'}>
            <Textarea rows={7} mono value={text} onChangeText={setText} autoCapitalize="none" autoCorrect={false} placeholder={'sd24_student_one@mgmcen.ac.in\nsd24_student_two@mgmcen.ac.in'} />
          </Field>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Button variant="outline" size="sm" icon={Upload} onPress={pickFile}>CSV / TXT file</Button>
            <Text size={13} tone="mutedForeground">{count} email{count === 1 ? '' : 's'} detected</Text>
          </View>
        </View>
      )}
    </Sheet>
  )
}
