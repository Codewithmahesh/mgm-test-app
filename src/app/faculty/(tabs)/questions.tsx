import { router, useFocusEffect } from 'expo-router'
import { BookOpen, ChevronDown, Code2, DoorOpen, ExternalLink, Inbox, ListChecks, Pencil, Plus, Search, Trash2 } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { AppHeader } from '@/components/app-shell'
import { RoomStatusBadge } from '@/components/common'
import { QuestionCard } from '@/components/question-card'
import { QuestionEditor } from '@/components/question-editor'
import { Badge, Button, Card, Divider, EmptyState, IconButton, IconTile, Input, PageLoader, Screen, Segmented, Spinner, StatCard, Text, useFeedback } from '@/components/ui'
import { api, cached, errorMessage, relativeTime, type BankQuestion, type DraftQuestion, type RoomStatus } from '@/lib/api'
import { useColors } from '@/theme'

type Group = {
  key: string
  room: { id: string; title: string; code: string; status: RoomStatus } | null
  total: number; mcq: number; tf: number; coding: number
  lastAdded: string
  topics: string[]
}

/** Questions per request, and per "Show more": a few hundred cards at once make the screen slow on a phone. */
const PAGE_SIZE = 100
const SHOW_STEP = 30

const groupTitle = (g: Group) => g.room?.title ?? (g.key === 'unassigned' ? 'Not in any exam room' : 'Deleted exam room')

export default function QuestionBank() {
  const c = useColors()
  const { toast, confirm } = useFeedback()
  const [groups, setGroups] = useState<Group[] | null>(() => cached<{ groups: Group[] }>('/api/questions/groups')?.groups ?? null)
  const [questions, setQuestions] = useState<Record<string, BankQuestion[] | undefined>>({})
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'all' | 'mcq' | 'tf' | 'coding'>('all')
  const [editing, setEditing] = useState<{ group: string; question: BankQuestion } | null>(null)
  const [limits, setLimits] = useState<Record<string, number>>({})

  const loadGroups = useCallback(() => api<{ groups: Group[] }>('/api/questions/groups').then(d => setGroups(d.groups)).catch(err => toast(errorMessage(err), 'error')), [toast])

  /** All questions of one group, objective first then coding. Shown as each page arrives, not after the last one. */
  const fetchGroup = useCallback(async (key: string) => {
    const all: BankQuestion[] = []
    for (let page = 1; page < 200; page++) {
      const data = await api<{ questions: BankQuestion[]; total: number }>(`/api/questions?room=${key}&order=paper&limit=${PAGE_SIZE}&page=${page}`)
      all.push(...data.questions)
      const ordered = [...all.filter(q => q.type !== 'coding'), ...all.filter(q => q.type === 'coding')]
      setQuestions(map => ({ ...map, [key]: ordered }))
      if (all.length >= data.total || !data.questions.length) break
    }
  }, [])

  // Refresh on focus (e.g. after adding questions), including any groups already open.
  useFocusEffect(useCallback(() => {
    loadGroups()
    open.forEach(key => { fetchGroup(key).catch(() => {}) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadGroups, fetchGroup]))

  function toggle(key: string) {
    setOpen(set => {
      const next = new Set(set)
      if (next.has(key)) next.delete(key)
      else { next.add(key); if (!questions[key]) fetchGroup(key).catch(err => toast(errorMessage(err), 'error')) }
      return next
    })
  }

  async function removeGroup(group: Group) {
    const ok = await confirm({ title: `Delete all ${group.total} question${group.total === 1 ? '' : 's'} in "${groupTitle(group)}"?`, description: group.room ? 'The exam room stays, but its question pool will be empty. Papers students already received are not changed.' : 'These questions are removed from your bank permanently.', confirmLabel: 'Delete questions', tone: 'danger' })
    if (!ok) return
    setGroups(list => list?.filter(g => g.key !== group.key) ?? null)
    try { const d = await api<{ deleted: number }>('/api/questions', { method: 'DELETE', body: { room: group.key } }); toast(`${d.deleted} question${d.deleted === 1 ? '' : 's'} deleted.`) } catch (err) { toast(errorMessage(err), 'error') }
    setQuestions(map => ({ ...map, [group.key]: undefined }))
    loadGroups()
  }

  async function removeQuestion(group: string, question: BankQuestion) {
    if (!(await confirm({ title: 'Delete this question?', description: 'It is removed from the bank and from its exam room.', confirmLabel: 'Delete', tone: 'danger' }))) return
    setQuestions(map => ({ ...map, [group]: map[group]?.filter(q => q.id !== question.id) }))
    try { await api(`/api/questions/${question.id}`, { method: 'DELETE' }); toast('Question deleted.') } catch (err) { toast(errorMessage(err), 'error') }
    loadGroups()
  }

  async function save(question: DraftQuestion) {
    if (!editing) return
    await api(`/api/questions/${editing.question.id}`, { method: 'PATCH', body: question })
    toast('Question updated.')
    await fetchGroup(editing.group)
  }

  const visible = useMemo(() => (groups ?? []).filter(g => {
    if (type !== 'all' && !g[type]) return false
    const q = query.trim().toLowerCase()
    return !q || `${groupTitle(g)} ${g.room?.code ?? ''} ${g.topics.join(' ')}`.toLowerCase().includes(q)
  }), [groups, query, type])
  const totals = useMemo(() => (groups ?? []).reduce((t, g) => ({ total: t.total + g.total, mcq: t.mcq + g.mcq + g.tf, coding: t.coding + g.coding }), { total: 0, mcq: 0, coding: 0 }), [groups])

  return (
    <Screen edges={[]} header={<AppHeader title="Question bank" subtitle="Your questions, grouped by exam" />} onRefresh={loadGroups}>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatCard label="Questions" value={totals.total} icon={BookOpen} tone="blue" />
          <StatCard label="Exam groups" value={groups?.filter(g => g.room).length ?? 0} icon={DoorOpen} tone="violet" />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatCard label="Objective" value={totals.mcq} icon={ListChecks} tone="green" />
          <StatCard label="Coding" value={totals.coding} icon={Code2} tone="amber" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Input value={query} onChangeText={setQuery} placeholder="Search exam, code or topic" style={{ paddingLeft: 38 }} />
          <Search size={16} color={c.subtle} style={{ position: 'absolute', left: 12, top: 14 }} />
        </View>
        <Button icon={Plus} onPress={() => router.push('/faculty/add-questions?method=ai')} style={{ height: 44 }}>Add</Button>
      </View>
      <Segmented value={type} onChange={setType} options={[{ value: 'all', label: 'All' }, { value: 'mcq', label: 'MCQ' }, { value: 'tf', label: 'T/F' }, { value: 'coding', label: 'Coding' }]} />

      {!groups ? <PageLoader /> : visible.length === 0 ? (
        <Card><EmptyState icon={BookOpen} title={groups.length ? 'No exams match' : 'Your question bank is empty'} description={groups.length ? 'Try a different search.' : 'Generate questions with AI from a PDF or notes, or import a CSV.'}
          action={!groups.length ? <Button icon={Plus} onPress={() => router.push('/faculty/add-questions?method=ai')}>Add questions</Button> : undefined} /></Card>
      ) : visible.map(group => {
        const expanded = open.has(group.key)
        const list = questions[group.key]
        const shown = list?.filter(q => type === 'all' || q.type === type)
        const limit = limits[group.key] ?? SHOW_STEP
        return (
          <Card key={group.key}>
            <Pressable onPress={() => toggle(group.key)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: pressed ? c.muted : 'transparent' })} accessibilityState={{ expanded }}>
              <IconTile icon={group.room ? DoorOpen : Inbox} tone={group.room ? 'blue' : 'neutral'} size={42} />
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Text size={15} weight="semibold" numberOfLines={1}>{groupTitle(group)}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                  {group.room && <Text mono size={11} weight="semibold" tone="mutedForeground" tracking={1}>{group.room.code}</Text>}
                  {group.room && <RoomStatusBadge status={group.room.status} />}
                  <Badge tone="blue">{`${group.total} question${group.total === 1 ? '' : 's'}`}</Badge>
                </View>
                <Text size={12} tone="mutedForeground" numberOfLines={1}>{[group.mcq && `${group.mcq} MCQ`, group.tf && `${group.tf} T/F`, group.coding && `${group.coding} coding`].filter(Boolean).join(' · ')} · added {relativeTime(group.lastAdded)}</Text>
              </View>
              <ChevronDown size={20} color={c.mutedForeground} style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }} />
            </Pressable>
            {expanded && (
              <>
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 12 }}>
                  {group.room && <Button variant="outline" size="sm" icon={ExternalLink} style={{ flex: 1 }} onPress={() => router.push(`/faculty/room/${group.room!.id}?tab=questions`)}>Open room</Button>}
                  <Button variant="outline" size="sm" icon={Plus} style={{ flex: 1 }} onPress={() => router.push(group.room ? `/faculty/add-questions?roomId=${group.room.id}&method=ai` : '/faculty/add-questions?method=ai')}>Add</Button>
                  <Button variant="destructive-outline" size="sm" icon={Trash2} onPress={() => removeGroup(group)} accessibilityLabel="Delete all questions" />
                </View>
                {!list ? <View style={{ paddingVertical: 20, alignItems: 'center' }}><Spinner /></View> : !shown?.length ? <Text size={13} tone="mutedForeground" center style={{ paddingVertical: 20 }}>No questions of this type.</Text> : shown.slice(0, limit).map((question, index) => (
                  <View key={question.id}>
                    <Divider />
                    <QuestionCard question={question} index={index} meta={question.source === 'ai' ? 'AI' : question.source === 'csv' ? 'CSV' : 'Manual'} actions={<>
                      <IconButton icon={Pencil} label="Edit question" size={32} onPress={() => setEditing({ group: group.key, question })} />
                      <IconButton icon={Trash2} label="Delete question" size={32} onPress={() => removeQuestion(group.key, question)} />
                    </>} />
                  </View>
                ))}
                {shown && shown.length > limit && (
                  <View style={{ padding: 14, paddingTop: 4 }}>
                    <Divider />
                    <Button variant="outline" size="sm" style={{ marginTop: 12 }} onPress={() => setLimits(map => ({ ...map, [group.key]: limit + SHOW_STEP }))}>{`Show more (${shown.length - limit} left)`}</Button>
                  </View>
                )}
              </>
            )}
          </Card>
        )
      })}

      <QuestionEditor open={Boolean(editing)} initial={editing?.question ?? null} onClose={() => setEditing(null)} onSave={save} />
    </Screen>
  )
}
