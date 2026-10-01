import { Image } from 'expo-image'
import { Circle, CircleCheck, ImagePlus, Trash2, X } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { letter, type DraftQuestion, type Sample } from '@/lib/api'
import { BLOOM_INFO, BLOOM_LEVELS } from '@/lib/bloom'
import { pickAndUploadImage } from '@/lib/upload'
import { radius, useColors } from '@/theme'
import { Alert, Button, Field, Input, NumberInput, Segmented, Select, Sheet, Text, Textarea } from './ui'

export function blankQuestion(type: DraftQuestion['type'] = 'mcq'): DraftQuestion {
  return {
    type, text: '', options: type === 'tf' ? ['True', 'False'] : type === 'mcq' ? ['', '', '', ''] : [], correctIndex: type === 'coding' ? null : 0,
    topic: '', bloom: null, set: '', explanation: '', title: '', inputFormat: '', outputFormat: '', constraints: '',
    samples: type === 'coding' ? [{ input: '', output: '', explanation: '' }] : [], points: null, language: '', starterCode: '', imageUrl: '',
  }
}

/** Mirrors the server's rules, so errors show before saving. */
export function validateQuestion(q: DraftQuestion): string | null {
  if (!q.text.trim()) return q.type === 'coding' ? 'Write the problem statement.' : 'Write the question.'
  if (q.type === 'coding') return q.title.trim() ? null : 'Give the problem a title.'
  const options = q.options.map(o => o.trim())
  if (options.filter(Boolean).length < 2 || options.some(o => !o)) return 'Fill in every option (at least two).'
  if (new Set(options.map(o => o.toLowerCase())).size !== options.length) return 'Options must be different from each other.'
  if (q.correctIndex == null || q.correctIndex < 0 || q.correctIndex >= options.length) return 'Choose the correct answer.'
  return null
}

export function QuestionEditor({ open, initial, onClose, onSave, title }: { open: boolean; initial: DraftQuestion | null; onClose: () => void; onSave: (question: DraftQuestion) => Promise<void> | void; title?: string }) {
  const c = useColors()
  const [q, setQ] = useState<DraftQuestion>(initial ?? blankQuestion())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [shownFor, setShownFor] = useState<{ open: boolean; initial: DraftQuestion | null }>({ open, initial })
  if (shownFor.open !== open || shownFor.initial !== initial) {
    setShownFor({ open, initial })
    if (open) { setQ(initial ?? blankQuestion()); setError('') }
  }

  const set = <K extends keyof DraftQuestion>(key: K, value: DraftQuestion[K]) => setQ(current => ({ ...current, [key]: value }))
  const setType = (type: DraftQuestion['type']) => setQ(current => ({ ...blankQuestion(type), text: current.text, topic: current.topic, bloom: current.bloom, set: current.set, explanation: current.explanation, imageUrl: current.imageUrl }))
  const setSample = (index: number, key: keyof Sample, value: string) => set('samples', q.samples.map((s, i) => (i === index ? { ...s, [key]: value } : s)))

  async function save() {
    const problem = validateQuestion(q)
    if (problem) return setError(problem)
    setSaving(true)
    try { await onSave({ ...q, options: q.options.map(o => o.trim()) }); onClose() } catch (err) { setError(err instanceof Error ? err.message : 'Could not save.') } finally { setSaving(false) }
  }

  async function attach() {
    setUploading(true)
    try { const url = await pickAndUploadImage(); if (url) set('imageUrl', url) } catch (err) { setError(err instanceof Error ? err.message : 'Upload failed.') } finally { setUploading(false) }
  }

  return (
    <Sheet open={open} onClose={onClose} full title={title ?? (initial ? 'Edit question' : 'New question')}
      footer={<>
        <Button variant="outline" style={{ flex: 1 }} onPress={onClose}>Cancel</Button>
        <Button style={{ flex: 1 }} loading={saving} onPress={save}>{saving ? 'Saving…' : 'Save question'}</Button>
      </>}>
      <View style={{ gap: 16 }}>
        {error ? <Alert>{error}</Alert> : null}
        <Segmented value={q.type} onChange={setType} options={[{ value: 'mcq', label: 'MCQ' }, { value: 'tf', label: 'True / False' }, { value: 'coding', label: 'Coding' }]} />

        {q.type === 'coding' ? (
          <>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Field label="Problem title" required style={{ flex: 1 }}><Input value={q.title} onChangeText={v => set('title', v)} placeholder="e.g. Pair Sum" /></Field>
              <Field label="Marks" style={{ width: 90 }}><NumberInput value={q.points == null ? '' : String(q.points)} onChangeText={v => set('points', v ? Number(v) : null)} placeholder="Default" /></Field>
            </View>
            <Field label="Problem statement" required><Textarea rows={5} value={q.text} onChangeText={v => set('text', v)} placeholder="Describe the task clearly…" /></Field>
            <Field label="Input format"><Textarea rows={2} value={q.inputFormat} onChangeText={v => set('inputFormat', v)} placeholder="The first line contains N…" /></Field>
            <Field label="Output format"><Textarea rows={2} value={q.outputFormat} onChangeText={v => set('outputFormat', v)} placeholder="Print a single integer…" /></Field>
            <Field label="Constraints"><Textarea rows={2} mono value={q.constraints} onChangeText={v => set('constraints', v)} placeholder={'1 ≤ N ≤ 10^5'} /></Field>
            <Field label="Sample tests" right={<Text size={13} weight="medium" tone="primary" onPress={() => set('samples', [...q.samples, { input: '', output: '', explanation: '' }])}>+ Add</Text>}>
              <View style={{ gap: 10 }}>
                {q.samples.map((sample, index) => (
                  <View key={index} style={{ borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: 10, gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text size={12} weight="medium" tone="mutedForeground">Test case {index + 1}</Text>
                      <Pressable hitSlop={8} onPress={() => set('samples', q.samples.filter((_, i) => i !== index))} accessibilityLabel="Remove test case"><Trash2 size={15} color={c.subtle} /></Pressable>
                    </View>
                    <Textarea rows={2} mono value={sample.input} onChangeText={v => setSample(index, 'input', v)} placeholder="Input (stdin)" />
                    <Textarea rows={2} mono value={sample.output} onChangeText={v => setSample(index, 'output', v)} placeholder="Expected output (stdout)" />
                    <Input value={sample.explanation} onChangeText={v => setSample(index, 'explanation', v)} placeholder="Explanation (optional)" />
                  </View>
                ))}
              </View>
            </Field>
          </>
        ) : (
          <>
            <Field label="Question" required><Textarea rows={3} value={q.text} onChangeText={v => set('text', v)} placeholder="Type the question…" /></Field>
            <Field label="Options — tap the circle to mark the correct one" right={q.type === 'mcq' && q.options.length < 6 ? <Text size={13} weight="medium" tone="primary" onPress={() => set('options', [...q.options, ''])}>+ Add</Text> : undefined}>
              <View style={{ gap: 8 }}>
                {q.options.map((option, index) => {
                  const correct = q.correctIndex === index
                  return (
                    <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radius.md, paddingLeft: 8, borderColor: correct ? c.success : c.border, backgroundColor: correct ? c.successSoft : c.card }}>
                      <Pressable onPress={() => set('correctIndex', index)} hitSlop={8} accessibilityLabel={`Mark option ${letter(index)} correct`}>
                        {correct ? <CircleCheck size={22} color={c.success} /> : <Circle size={22} color={c.borderStrong} />}
                      </Pressable>
                      <Text mono size={12} weight="semibold" tone="mutedForeground">{letter(index)}</Text>
                      <Input value={option} editable={q.type !== 'tf'} onChangeText={v => set('options', q.options.map((o, i) => (i === index ? v : o)))} placeholder={`Option ${letter(index)}`}
                        style={{ flex: 1, borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 4 }} />
                      {q.type === 'mcq' && q.options.length > 2 && (
                        <Pressable hitSlop={8} style={{ paddingHorizontal: 10 }} accessibilityLabel="Remove option"
                          onPress={() => { set('options', q.options.filter((_, i) => i !== index)); if ((q.correctIndex ?? 0) >= index && (q.correctIndex ?? 0) > 0) set('correctIndex', (q.correctIndex ?? 1) - 1) }}>
                          <Trash2 size={15} color={c.subtle} />
                        </Pressable>
                      )}
                    </View>
                  )
                })}
              </View>
            </Field>
            <Field label="Explanation" hint="Optional. Shown to students in their result review."><Textarea rows={2} value={q.explanation} onChangeText={v => set('explanation', v)} /></Field>
          </>
        )}

        <Field label="Image" hint="Optional diagram or figure shown with the question.">
          {q.imageUrl ? (
            <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: 4 }}>
              <Image source={{ uri: q.imageUrl }} style={{ width: '100%', height: 160, borderRadius: radius.sm }} contentFit="contain" />
              <Pressable onPress={() => set('imageUrl', '')} accessibilityLabel="Remove image" style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
                <X size={15} color="#fff" />
              </Pressable>
            </View>
          ) : <Button variant="outline" icon={ImagePlus} loading={uploading} onPress={attach}>{uploading ? 'Uploading…' : 'Attach image'}</Button>}
        </Field>

        <Field label="Topic"><Input value={q.topic} onChangeText={v => set('topic', v)} placeholder="e.g. Linked lists" /></Field>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Field label="Bloom's level" style={{ flex: 1 }}>
            <Select title="Bloom's level" value={q.bloom ?? 'none'} onChange={v => set('bloom', v === 'none' ? null : (v as DraftQuestion['bloom']))}
              options={[{ value: 'none', label: 'Not set' }, ...BLOOM_LEVELS.map(level => ({ value: level, label: `L${BLOOM_INFO[level].n} · ${BLOOM_INFO[level].label}`, hint: BLOOM_INFO[level].hint }))]} />
          </Field>
          <Field label="Set" hint="Blank = every set." style={{ width: 100 }}>
            <Input value={q.set} maxLength={12} autoCapitalize="characters" onChangeText={v => set('set', v.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="A" />
          </Field>
        </View>
      </View>
    </Sheet>
  )
}
