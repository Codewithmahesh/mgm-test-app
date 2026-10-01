import { useState } from 'react'
import { View } from 'react-native'
import { AccountSettings } from '@/components/account-settings'
import { Alert, Badge, Button, Card, CardHeader, Field, Input, Screen, ScreenHeader, Select, Text, useFeedback } from '@/components/ui'
import { DEPARTMENT_OPTIONS, api, errorMessage, initials } from '@/lib/api'
import { useSession } from '@/lib/session'
import { useColors } from '@/theme'

const OTHER = '__other__'

export default function FacultyProfile() {
  const { teacher, refresh } = useSession()
  const c = useColors()
  const { toast } = useFeedback()
  const listed = teacher ? DEPARTMENT_OPTIONS.includes(teacher.department) : true
  const [name, setName] = useState(teacher?.name ?? '')
  const [department, setDepartment] = useState(teacher?.department && !listed ? OTHER : teacher?.department ?? '')
  const [customDept, setCustomDept] = useState(teacher?.department && !listed ? teacher.department : '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  if (!teacher) return null

  async function save() {
    setError('')
    const finalDept = department === OTHER ? customDept.trim() : department
    if (name.trim().length < 2) return setError('Enter your full name.')
    setSaving(true)
    try {
      await api('/api/auth/me', { method: 'PATCH', body: { name, department: finalDept } })
      await refresh()
      toast('Profile saved.')
    } catch (err) {
      setError(err instanceof Error && err.message.includes('405') ? 'The website needs the latest update before profiles can be edited.' : errorMessage(err))
    } finally { setSaving(false) }
  }

  return (
    <Screen header={<ScreenHeader title="Profile" eyebrow="Account" />} onRefresh={refresh}>
      <Card padded style={{ alignItems: 'center', paddingVertical: 24 }}>
        <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Text weight="semibold" size={23} color={c.primaryForeground}>{initials(teacher.name)}</Text>
        </View>
        <Text weight="semibold" size={18} center style={{ marginTop: 12 }}>{teacher.name}</Text>
        <Text size={13} tone="mutedForeground" center>{teacher.email}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {teacher.department ? <Badge tone="blue">{teacher.department}</Badge> : null}
          <Badge tone="green" dot>Faculty</Badge>
        </View>
      </Card>

      {error ? <Alert>{error}</Alert> : null}
      <Card>
        <CardHeader title="Faculty details" description="Shown to students on the exam page." />
        <View style={{ gap: 16, paddingHorizontal: 16, paddingBottom: 16 }}>
          <Field label="Email" hint="Your sign-in email can't be changed."><Input value={teacher.email} editable={false} /></Field>
          <Field label="Full name" required><Input value={name} onChangeText={setName} autoComplete="name" placeholder="Prof. Riya Sharma" /></Field>
          <Field label="Department">
            <Select title="Department" value={department} onChange={setDepartment} placeholder="Select your department"
              options={[...DEPARTMENT_OPTIONS.map(d => ({ value: d, label: d })), { value: OTHER, label: 'Other / Not in list…' }]} />
          </Field>
          {department === OTHER && <Field label="Department name"><Input value={customDept} onChangeText={setCustomDept} placeholder="e.g. Data Science & Analytics" /></Field>}
        </View>
      </Card>
      <Button size="lg" full loading={saving} onPress={save}>{saving ? 'Saving…' : 'Save changes'}</Button>

      <AccountSettings email={teacher.email} account="teacher" />
    </Screen>
  )
}
