import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Alert, Button, Checkbox, Field, Input, Sheet, Spinner, Text, Textarea } from '@/components/ui'
import { api, errorMessage, type Classroom } from '@/lib/api'
import type { PracticalSubject } from '@/lib/practicals'

/**
 * Create a practical (a lab subject): its name, course code, description and the classes that take it.
 * Same request as the website's dialog (POST /api/practicals). Experiments are added next, with AI or on
 * the website.
 */
export function NewPracticalSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (subject: PracticalSubject) => void }) {
  const [title, setTitle] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Mounted fresh each time it opens (see the practicals tab), so the form always starts empty.
  useEffect(() => {
    api<{ classrooms: Classroom[] }>('/api/classrooms').then(d => setClassrooms(d.classrooms)).catch(err => setError(errorMessage(err)))
  }, [])

  async function save() {
    if (!title.trim()) return setError('Give the practical a name.')
    if (!selected.length) return setError('Choose at least one class.')
    setSaving(true)
    setError('')
    try {
      const { subject } = await api<{ subject: PracticalSubject }>('/api/practicals', { body: { title, code, description, classrooms: selected } })
      onCreated(subject)
    } catch (err) { setError(errorMessage(err)) } finally { setSaving(false) }
  }

  const toggle = (id: string) => setSelected(list => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]))

  return (
    <Sheet open={open} onClose={onClose} full dismissible={!saving} title="New practical" description="A lab subject: experiments students solve in order, one level at a time."
      footer={<Button full loading={saving} onPress={save}>Create practical</Button>}>
      <View style={{ gap: 16 }}>
        {error ? <Alert>{error}</Alert> : null}
        <Field label="Subject" required><Input value={title} onChangeText={setTitle} placeholder="e.g. Data Structures Lab" /></Field>
        <Field label="Course code"><Input value={code} onChangeText={value => setCode(value.toUpperCase())} placeholder="CS301" autoCapitalize="characters" /></Field>
        <Field label="Description" hint="Optional. Shown to students."><Textarea rows={3} value={description} onChangeText={setDescription} placeholder="What students practise in this lab" /></Field>
        <Field label="Classes" required hint="Every activated student in these classes gets this practical.">
          {!classrooms ? <Spinner /> : classrooms.length === 0 ? <Text size={13} tone="mutedForeground">No classes yet. Add students with their class first.</Text> : (
            <View style={{ gap: 10 }}>
              {classrooms.map(classroom => (
                <Checkbox key={classroom.id} checked={selected.includes(classroom.id)} onChange={() => toggle(classroom.id)}
                  label={`${classroom.label}${classroom.active ? ` · ${classroom.active} active` : ''}`} />
              ))}
            </View>
          )}
        </Field>
      </View>
    </Sheet>
  )
}
