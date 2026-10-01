import { Image } from 'expo-image'
import { Check, ChevronDown, Paperclip } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { letter, type DraftQuestion } from '@/lib/api'
import { radius, useColors } from '@/theme'
import { BloomBadge, TypeBadge } from './common'
import { Checkbox, Text } from './ui'

/** Compact, expandable preview of a question (MCQ options with the answer, or a coding problem's details). */
export function QuestionCard({ question, index, actions, meta, selectable }: {
  question: DraftQuestion
  index?: number
  actions?: React.ReactNode
  meta?: string
  selectable?: { checked: boolean; onChange: () => void }
}) {
  const c = useColors()
  const [open, setOpen] = useState(false)
  return (
    <View style={{ paddingHorizontal: 14, paddingVertical: 12, backgroundColor: selectable?.checked ? c.primarySoft : 'transparent' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        {selectable && <View style={{ paddingTop: 2 }}><Checkbox checked={selectable.checked} onChange={selectable.onChange} label="" /></View>}
        {index !== undefined && <Text mono size={12} tone="subtle" style={{ width: 24, textAlign: 'right', marginTop: 2 }}>{index + 1}.</Text>}
        <Pressable onPress={() => (selectable ? selectable.onChange() : setOpen(v => !v))} style={{ flex: 1, minWidth: 0 }}>
          <Text size={14} leading={21} numberOfLines={open ? undefined : 2} weight={question.type === 'coding' ? 'semibold' : 'regular'}>
            {question.type === 'coding' ? question.title || 'Untitled problem' : question.text}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <TypeBadge type={question.type} />
            <BloomBadge level={question.bloom} />
            {question.imageUrl ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Paperclip size={11} color={c.primary} /><Text size={11} weight="medium" tone="primary">Image</Text></View> : null}
            {question.set ? <Text size={11} weight="semibold" tone="mutedForeground">Set {question.set}</Text> : null}
            {question.topic ? <Text size={12} tone="mutedForeground" numberOfLines={1}>{question.topic}</Text> : null}
            {question.type === 'coding' && question.points != null ? <Text size={12} tone="mutedForeground">· {question.points} marks</Text> : null}
            {meta ? <Text size={12} tone="mutedForeground">· {meta}</Text> : null}
          </View>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {actions}
          {!selectable && (
            <Pressable onPress={() => setOpen(v => !v)} hitSlop={6} accessibilityLabel={open ? 'Collapse' : 'Expand'} style={{ padding: 6 }}>
              <ChevronDown size={17} color={c.subtle} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
            </Pressable>
          )}
        </View>
      </View>
      {open && (
        <View style={{ marginTop: 10, marginLeft: index !== undefined ? 34 : 0, gap: 8 }}>
          {question.imageUrl ? <Image source={{ uri: question.imageUrl }} style={{ width: '100%', height: 160, borderRadius: radius.md }} contentFit="contain" /> : null}
          {question.type === 'coding' ? (
            <View style={{ gap: 8, borderRadius: radius.md, backgroundColor: c.muted, padding: 10 }}>
              <Text size={13} leading={19}>{question.text}</Text>
              {question.inputFormat ? <Section label="Input">{question.inputFormat}</Section> : null}
              {question.outputFormat ? <Section label="Output">{question.outputFormat}</Section> : null}
              {question.constraints ? <Section label="Constraints">{question.constraints}</Section> : null}
              {question.samples.map((s, i) => <Section key={i} label={`Sample ${i + 1}`}>{`Input:\n${s.input}\nOutput:\n${s.output}`}</Section>)}
              <Text size={12} tone="mutedForeground">{question.hiddenTests?.length ? `+ ${question.hiddenTests.length} hidden test${question.hiddenTests.length === 1 ? '' : 's'} used for grading` : 'No hidden tests: graded on the samples only'}</Text>
            </View>
          ) : (
            <>
              {question.options.map((option, i) => {
                const correct = i === question.correctIndex
                return (
                  <View key={i} style={{ flexDirection: 'row', gap: 8, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 7, borderColor: correct ? c.successBorder : c.border, backgroundColor: correct ? c.successSoft : 'transparent' }}>
                    <Text mono size={12} weight="semibold" color={correct ? c.successInk : c.mutedForeground}>{letter(i)}</Text>
                    <Text size={13} style={{ flex: 1 }} weight={correct ? 'medium' : 'regular'} color={correct ? c.successInk : c.mutedForeground}>{option}</Text>
                    {correct && <Check size={14} color={c.successInk} />}
                  </View>
                )
              })}
              {question.explanation ? <Text size={12} tone="mutedForeground" leading={18}><Text size={12} weight="medium">Explanation: </Text>{question.explanation}</Text> : null}
            </>
          )}
        </View>
      )}
    </View>
  )
}

function Section({ label, children }: { label: string; children: string }) {
  return (
    <View>
      <Text size={10} weight="semibold" tone="subtle" uppercase tracking={0.6}>{label}</Text>
      <Text size={13} leading={19} style={{ marginTop: 2 }}>{children}</Text>
    </View>
  )
}
