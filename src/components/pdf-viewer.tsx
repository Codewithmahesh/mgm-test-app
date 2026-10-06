import { Paths } from 'expo-file-system'
import { Share2, X } from 'lucide-react-native'
import { useState } from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { Button, Spinner, Text, useFeedback } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { sharePdf } from '@/lib/pdf-share'
import { useColors } from '@/theme'

/**
 * A PDF on screen, for iPhone (Android opens PDFs in the phone's PDF app instead). iOS shows PDFs natively
 * in a web view: every page, scrolling and pinch-zoom. Save / Share offers Save to Files, Books, AirDrop, Mail.
 */
export function PdfViewer({ pdf, onClose }: { pdf: { uri: string; name: string } | null; onClose: () => void }) {
  const c = useColors()
  const insets = useSafeAreaInsets()
  const { toast } = useFeedback()
  const [sharing, setSharing] = useState(false)

  async function share() {
    if (!pdf) return
    setSharing(true)
    try { await sharePdf(pdf.uri, pdf.name) } catch (err) { toast(errorMessage(err), 'error') } finally { setSharing(false) }
  }

  return (
    <Modal visible={Boolean(pdf)} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <View style={[styles.bar, { paddingTop: insets.top + 8, borderBottomColor: c.border, backgroundColor: c.card }]}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close" style={({ pressed }) => [styles.close, { backgroundColor: pressed ? c.muted : c.secondary }]}>
            <X size={18} color={c.mutedForeground} />
          </Pressable>
          <Text size={14} weight="semibold" numberOfLines={1} style={{ flex: 1 }}>{pdf?.name ?? ''}</Text>
          <Button size="sm" icon={Share2} loading={sharing} onPress={share}>Save / Share</Button>
        </View>
        {pdf && (
          <WebView
            source={{ uri: pdf.uri }}
            // The PDF is in the app's cache folder; let the web view read files there.
            originWhitelist={['*']}
            allowingReadAccessToURL={Paths.cache.uri}
            allowFileAccess
            startInLoadingState
            renderLoading={() => <View style={styles.loading}><Spinner size="large" /></View>}
            style={{ flex: 1, backgroundColor: c.background }}
          />
        )}
        <View style={{ height: insets.bottom, backgroundColor: c.card }} />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  loading: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
})
