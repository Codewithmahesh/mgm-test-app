import { router, useFocusEffect } from 'expo-router'
import { ChevronRight, ClipboardList, Clock3, PlayCircle } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { Pressable, View } from 'react-native'
import { AppHeader } from '@/components/app-shell'
import { Alert, Badge, Card, CardHeader, Divider, EmptyState, PageLoader, Screen, Segmented, Text } from '@/components/ui'
import { api, cached, errorMessage, formatDate, relativeTime, type MyAttempt } from '@/lib/api'
import { useColors } from '@/theme'

/** Every exam the student has started or submitted, with results. */
export default function MyExams() {
  const c = useColors()
  const [attempts, setAttempts] = useState<MyAttempt[] | null>(() => cached<{ attempts: MyAttempt[] }>('/api/student/attempts')?.attempts ?? null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'published' | 'pending'>('all')
  const load = useCallback(() => api<{ attempts: MyAttempt[] }>('/api/student/attempts').then(d => { setAttempts(d.attempts); setError('') }).catch(err => setError(errorMessage(err))), [])
  useFocusEffect(useCallback(() => { load() }, [load]))

  const ongoing = (attempts ?? []).filter(a => a.status === 'in_progress')
  const done = (attempts ?? []).filter(a => a.status === 'submitted' && (filter === 'all' || (filter === 'published' ? a.resultVisible : !a.resultVisible)))

  return (
    <Screen edges={[]} header={<AppHeader title="My exams" />} onRefresh={load}>
      {error ? <Alert>{error}</Alert> : null}
      {!attempts ? <PageLoader /> : (
        <>
          {ongoing.length > 0 && (
            <Card tone="green">
              <CardHeader flush title="In progress" description="Your timer is running" />
              {ongoing.map((a, i) => (
                <View key={a.id}>
                  {i > 0 && <Divider />}
                  <Row onPress={() => router.push(`/student/exam/${a.id}`)} title={a.room.title} line={`Ends ${relativeTime(a.endsAt)}`} icon={<Clock3 size={13} color={c.mutedForeground} />}
                    right={<Badge tone="green" icon={PlayCircle}>Resume</Badge>} />
                </View>
              ))}
            </Card>
          )}
          <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'published', label: 'Results out' }, { value: 'pending', label: 'Pending' }]} />
          <Card>
            <CardHeader flush title="Submitted exams" description="Newest first" />
            {done.length === 0 ? <EmptyState icon={ClipboardList} title="No exams here" description="When you finish an exam it shows up here with your result." /> : done.map((a, i) => {
              const percent = a.resultVisible && a.maxScore ? Math.round(((a.score ?? 0) / a.maxScore) * 100) : null
              return (
                <View key={a.id}>
                  {i > 0 && <Divider />}
                  <Row onPress={() => router.push(`/student/result/${a.id}`)} title={a.room.title} line={`${a.room.code} · ${formatDate(a.submittedAt, true)}${a.resultVisible ? ' · View analysis' : ''}`}
                    right={a.resultVisible ? (
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text weight="semibold" tabular>{a.score}<Text size={13} tone="mutedForeground"> / {a.maxScore}</Text></Text>
                        {percent != null && <Badge tone={percent >= 60 ? 'green' : percent >= 35 ? 'amber' : 'red'}>{`${percent}%`}</Badge>}
                      </View>
                    ) : <Badge>Pending</Badge>} />
                </View>
              )
            })}
          </Card>
        </>
      )}
    </Screen>
  )
}

function Row({ title, line, icon, right, onPress }: { title: string; line: string; icon?: React.ReactNode; right: React.ReactNode; onPress: () => void }) {
  const c = useColors()
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, backgroundColor: pressed ? c.muted : 'transparent' })}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="medium" numberOfLines={1}>{title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>{icon}<Text size={12} tone="mutedForeground" numberOfLines={1}>{line}</Text></View>
      </View>
      {right}
      <ChevronRight size={17} color={c.subtle} />
    </Pressable>
  )
}
