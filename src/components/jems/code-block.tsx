import { ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui'
import { dark } from '@/theme/colors'
import { radius, useColors } from '@/theme'

// The block always sits on the dark navy panel, so its colours come from the dark palette in both themes.
const INK = 'rgba(255,255,255,0.88)'
const COMMENT = 'rgba(255,255,255,0.42)'
const TOKEN = /(\/\/.*|--.*|#.*)|('[^']*'|"[^"]*"|`[^`]*`)|\b(const|let|var|function|return|if|else|async|await|new|def|print|for|in|import|export|typeof|interface|type|SELECT|FROM|WHERE|COUNT|GROUP|BY|ORDER|JOIN|NULL)\b|\b(\d+(?:\.\d+)?)\b/g

function highlight(line: string) {
  const parts: { text: string; color: string }[] = []
  let last = 0
  for (const match of line.matchAll(TOKEN)) {
    const at = match.index ?? 0
    if (at > last) parts.push({ text: line.slice(last, at), color: INK })
    const color = match[1] ? COMMENT : match[2] ? dark.violet : match[3] ? dark.brand : dark.primaryInk
    parts.push({ text: match[0], color })
    last = at + match[0].length
  }
  if (last < line.length) parts.push({ text: line.slice(last), color: INK })
  return parts
}

/** Dark, monospaced code panel with light syntax colouring. Scrolls sideways for long lines. */
export function CodeBlock({ code }: { code: string }) {
  const c = useColors()
  return (
    <View style={[styles.block, { backgroundColor: c.navy }]} accessible accessibilityLabel={`Code: ${code}`}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 18 }}>
        <View>
          {code.split('\n').map((line, i) => (
            <Text key={i} mono size={14} leading={22} color={INK}>
              {line ? highlight(line).map((part, j) => <Text key={j} mono size={14} leading={22} color={part.color}>{part.text}</Text>) : ' '}
            </Text>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  block: { borderRadius: radius.lg, overflow: 'hidden' },
})
