import { router, useFocusEffect } from 'expo-router'
import { ChevronRight, FlaskConical, Trophy } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { Pressable, View } from 'react-native'
import { AppHeader } from '@/components/app-shell'
import { Alert, Badge, Card, Divider, EmptyState, PageLoader, Progress, Screen, Text } from '@/components/ui'
import { api, cached, errorMessage } from '@/lib/api'
import type { MyPractical } from '@/lib/practicals'
import { useColors } from '@/theme'

/** The student's practicals and how far they've got in each. Solving happens on the website. */
export default function MyPracticalsTab() {
  const c = useColors()
  const [subjects, setSubjects] = useState<MyPractical[] | null>(() => cached<{ subjects: MyPractical[] }>('/api/student/practicals')?.subjects ?? null)
  const [error, setError] = useState('')
  const load = useCallback(() => api<{ subjects: MyPractical[] }>('/api/student/practicals').then(d => { setSubjects(d.subjects); setError('') }).catch(err => setError(errorMessage(err))), [])
  useFocusEffect(useCallback(() => { load() }, [load]))

  return (
    <Screen edges={[]} header={<AppHeader title="Practicals" subtitle="Solve each experiment to unlock the next" />} onRefresh={load}>
      {error ? <Alert>{error}</Alert> : null}
      {!subjects ? <PageLoader /> : (
        <Card>
          {subjects.length === 0 ? (
            <EmptyState icon={FlaskConical} title="No practicals yet" description="Your faculty hasn't added a practical for your class yet." />
          ) : subjects.map((subject, i) => {
            const done = subject.experiments > 0 && subject.solved === subject.experiments
            return (
              <View key={subject.id}>
                {i > 0 && <Divider />}
                <Pressable onPress={() => router.push(`/student/practical/${subject.id}`)} style={({ pressed }) => ({ padding: 16, gap: 10, backgroundColor: pressed ? c.muted : 'transparent' })}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text weight="semibold" numberOfLines={1}>{subject.title}</Text>
                      <Text size={12} tone="mutedForeground" numberOfLines={1} style={{ marginTop: 3 }}>{[subject.code, subject.faculty].filter(Boolean).join(' · ')}</Text>
                    </View>
                    {done ? <Badge tone="green" icon={Trophy}>Complete</Badge> : <Badge tone="violet">{`${subject.solved}/${subject.experiments}`}</Badge>}
                    <ChevronRight size={18} color={c.subtle} />
                  </View>
                  <Progress value={subject.experiments ? (subject.solved / subject.experiments) * 100 : 0} tone="green" />
                  <Text size={12} tone="mutedForeground" numberOfLines={1}>
                    {subject.next ? `Next: ${subject.next.order}. ${subject.next.title}` : subject.experiments ? 'All experiments solved' : 'No experiments yet'}
                    {subject.practiceSolved ? ` · ${subject.practiceSolved} practice solved` : ''}
                  </Text>
                </Pressable>
              </View>
            )
          })}
        </Card>
      )}
    </Screen>
  )
}
