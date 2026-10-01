import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { BRANCH_OPTIONS, YEAR_OPTIONS, api, errorMessage, type Classroom, type StudentRow } from '@/lib/api'
import { useSession } from '@/lib/session'
import { Alert, Button, Card, CardHeader, Field, Input, Select, useFeedback } from './ui'

const CUSTOM = '__custom__'

/** Student details (PATCH /api/student/me), used for first-time setup and the Profile tab. */
export function ProfileForm({ student, firstTime }: { student: StudentRow; firstTime: boolean }) {
  const { refresh } = useSession()
  const { toast } = useFeedback()
  const [form, setForm] = useState({ name: student.name, classroomId: student.classroomId ?? '', year: student.year, branch: student.branch, division: student.division, rollNumber: student.rollNumber, prn: student.prn })
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [custom, setCustom] = useState(Boolean(student.year && !student.classroomId))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api<{ classrooms: Classroom[] }>('/api/classrooms').then(d => {
      setClassrooms(d.classrooms)
      // Match an existing class from the details the college has on record.
      if (student.classroomId || !student.year || !student.branch || !student.division) return
      const match = d.classrooms.find(c => c.year.toLowerCase() === student.year.toLowerCase() && c.branch.toLowerCase() === student.branch.toLowerCase() && c.division.toLowerCase() === student.division.toLowerCase())
      if (match) { setForm(v => (v.classroomId ? v : { ...v, classroomId: match.id })); setCustom(false) }
    }).catch(() => {})
  }, [student])

  const set = (key: keyof typeof form) => (value: string) => setForm(v => ({ ...v, [key]: value }))

  async function save() {
    setError('')
    if (form.name.trim().length < 2) return setError('Enter your full name.')
    if (!custom && !form.classroomId) return setError('Please select your class.')
    if (!form.rollNumber.trim()) return setError('Enter your roll number.')
    setSaving(true)
    try {
      await api('/api/student/me', { method: 'PATCH', body: form })
      await refresh()
      if (!firstTime) toast('Profile saved.')
    } catch (err) { setError(errorMessage(err)) } finally { setSaving(false) }
  }

  return (
    <View style={{ gap: 16 }}>
      {firstTime && student.name ? <Alert tone="blue">We&apos;ve filled in what your college has on record. Check it and correct anything that&apos;s wrong.</Alert> : null}
      {error ? <Alert>{error}</Alert> : null}
      <Card>
        <CardHeader title="Student details" />
        <View style={{ gap: 16, paddingHorizontal: 16, paddingBottom: 16 }}>
          <Field label="College email" hint="Your sign-in email. Ask your faculty if it needs to change."><Input value={student.email} editable={false} /></Field>
          <Field label="Full name" required><Input value={form.name} onChangeText={set('name')} placeholder="As on your college ID" autoComplete="name" /></Field>
          <Field label="Class" required hint="Select your class and division (e.g. SY CSE A)">
            <Select title="Your class" value={custom ? CUSTOM : form.classroomId} placeholder="Select your class"
              options={[...classrooms.map(c => ({ value: c.id, label: c.label })), { value: CUSTOM, label: 'Other / Not in list (enter manually)…' }]}
              onChange={value => {
                if (value === CUSTOM) { setCustom(true); setForm(v => ({ ...v, classroomId: '' })); return }
                const picked = classrooms.find(c => c.id === value)
                setCustom(false)
                if (picked) setForm(v => ({ ...v, classroomId: picked.id, year: picked.year, branch: picked.branch, division: picked.division }))
              }} />
          </Field>
          {custom && (
            <>
              <Field label="Year" required><Select title="Year" value={form.year} onChange={set('year')} placeholder="Select year" options={YEAR_OPTIONS} /></Field>
              <Field label="Branch" required><Select title="Branch" value={form.branch} onChange={set('branch')} placeholder="Select branch" options={BRANCH_OPTIONS.map(o => ({ value: o.value, label: `${o.value} — ${o.label}` }))} /></Field>
              <Field label="Division" required><Input value={form.division} maxLength={2} autoCapitalize="characters" onChangeText={v => set('division')(v.toUpperCase())} placeholder="A" /></Field>
            </>
          )}
          <Field label="Roll number" required><Input value={form.rollNumber} onChangeText={set('rollNumber')} placeholder="e.g. 42" /></Field>
          <Field label="PRN" hint="Permanent registration number, if you have one."><Input value={form.prn} onChangeText={set('prn')} mono autoCapitalize="characters" /></Field>
        </View>
      </Card>
      <Button size="lg" full loading={saving} onPress={save}>{saving ? 'Saving…' : firstTime ? 'Save and continue' : 'Save changes'}</Button>
    </View>
  )
}
