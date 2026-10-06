import * as WebBrowser from 'expo-web-browser'
import { BookOpen, CircleCheck, CircleX, ExternalLink } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import { Badge, Card, CardHeader, Divider, Row, Text, useFeedback } from '@/components/ui'
import type { MissedQuestion, RelearnTopic } from '@/lib/jems'
import { radius, useColors } from '@/theme'
import { CodeBlock } from './code-block'
import { Meter, Tap } from './motion'

/** Topics the student should go back over after failing a mini-assessment, weakest first. */
export function RelearnCard({ topics, title = 'Topics to relearn' }: { topics: RelearnTopic[]; title?: string }) {
  const c = useColors()
  const { toast } = useFeedback()
  if (topics.length === 0) return null
  return (
    <Card>
      <CardHeader flush title={<Text size={17} weight="semibold">{title}</Text>}
        description="Based on the questions you missed. Start at the top." />
      {topics.map((t, i) => {
        const share = (t.missed / t.total) * 100
        return (
          <View key={t.topic}>
            {i > 0 && <Divider />}
            <Tap scaleTo={0.985} onPress={() => { WebBrowser.openBrowserAsync(t.url, { toolbarColor: c.card, controlsColor: c.primary }).catch(() => toast("Couldn't open the link.", 'error')) }}
              accessibilityRole="link" accessibilityLabel={`${t.topic}, missed ${t.missed} of ${t.total}${t.lesson ? `, revisit lesson ${t.lesson}` : ''}. Opens a study link.`}
              style={styles.topic}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row gap={8} style={{ flex: 1 }} wrap>
                  <Text size={16} weight="semibold">{t.topic}</Text>
                  <Badge tone="blue">{t.skill}</Badge>
                </Row>
                <ExternalLink size={18} color={c.mutedForeground} />
              </Row>
              <Row gap={12}>
                <Meter value={share} tone={share >= 50 ? 'red' : 'amber'} style={{ flex: 1 }} label={`Missed ${t.missed} of ${t.total}`} />
                <Text size={14} tone="mutedForeground" tabular>{`Missed ${t.missed} of ${t.total}`}</Text>
              </Row>
              {t.lesson ? (
                <Row gap={6}>
                  <BookOpen size={16} color={c.primaryInk} />
                  <Text size={14} tone="primaryInk">{`Revisit lesson: ${t.lesson}`}</Text>
                </Row>
              ) : null}
            </Tap>
          </View>
        )
      })}
    </Card>
  )
}

/** Each wrong or skipped question with the student's answer, the right one and why. */
export function MissedCard({ missed }: { missed: MissedQuestion[] }) {
  const c = useColors()
  if (missed.length === 0) return null
  return (
    <Card>
      <CardHeader flush title={<Text size={17} weight="semibold">Questions you missed</Text>}
        action={<Text size={14} tone="mutedForeground" tabular>{`${missed.length} question${missed.length === 1 ? '' : 's'}`}</Text>} />
      {missed.map((q, i) => (
        <View key={q.id}>
          {i > 0 && <Divider />}
          <View style={styles.question}>
            <Row gap={8} wrap>
              <Badge tone="blue">{q.skill}</Badge>
              <Badge>{q.topic}</Badge>
            </Row>
            <Text size={16} weight="medium" leading={23}>{q.prompt}</Text>
            {q.code ? <CodeBlock code={q.code} /> : null}
            <View style={[styles.answer, { backgroundColor: c.dangerSoft, borderColor: c.dangerBorder }]}>
              <CircleX size={18} color={c.dangerInk} />
              <Text size={14} leading={20} color={c.dangerInk} style={{ flex: 1 }}>
                {q.yourAnswer === null ? 'Skipped' : `Your answer: ${q.yourAnswer}`}
              </Text>
            </View>
            <View style={[styles.answer, { backgroundColor: c.successSoft, borderColor: c.successBorder }]}>
              <CircleCheck size={18} color={c.successInk} />
              <Text size={14} leading={20} color={c.successInk} style={{ flex: 1 }}>{`Correct: ${q.correctAnswer}`}</Text>
            </View>
            {q.explain ? <Text size={14} leading={21} tone="mutedForeground">{q.explain}</Text> : null}
          </View>
        </View>
      ))}
    </Card>
  )
}

const styles = StyleSheet.create({
  topic: { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  question: { paddingHorizontal: 16, paddingVertical: 16, gap: 10 },
  answer: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 10 },
})
