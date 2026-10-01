import { CheckCircle2, Info, X, XCircle } from 'lucide-react-native'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { radius, useColors } from '@/theme'
import { Button } from './button'
import { Text } from './text'

/** Bottom sheet: the mobile counterpart of the website's Dialog. */
export function Sheet({ open, onClose, title, description, children, footer, dismissible = true, full }: {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  dismissible?: boolean
  /** Take most of the screen height (long forms, lists). */
  full?: boolean
}) {
  const c = useColors()
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => dismissible && onClose()} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.scrim} onPress={() => dismissible && onClose()} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: c.card, paddingBottom: Math.max(insets.bottom, 12), maxHeight: '92%' }, full && { height: '92%' }]}>
          <View style={[styles.grabber, { backgroundColor: c.borderStrong }]} />
          {(title || dismissible) && (
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                {title && <Text weight="semibold" size={17}>{title}</Text>}
                {description && <Text size={13} tone="mutedForeground" style={{ marginTop: 3 }}>{description}</Text>}
              </View>
              {dismissible && (
                <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close" style={({ pressed }) => [styles.close, { backgroundColor: pressed ? c.muted : c.secondary }]}>
                  <X size={16} color={c.mutedForeground} />
                </Pressable>
              )}
            </View>
          )}
          <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer && <View style={[styles.footer, { borderTopColor: c.border }]}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

/* ---------------- Toasts and confirm dialogs ---------------- */

type ToastTone = 'success' | 'error' | 'info'
type ConfirmOptions = { title: string; description?: string; confirmLabel?: string; cancelLabel?: string; tone?: 'danger' | 'default' }
type Feedback = { toast: (message: string, tone?: ToastTone) => void; confirm: (options: ConfirmOptions) => Promise<boolean> }

const FeedbackContext = createContext<Feedback | null>(null)

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const c = useColors()
  const insets = useSafeAreaInsets()
  const [toastState, setToast] = useState<{ message: string; tone: ToastTone; key: number } | null>(null)
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null)
  const [opacity] = useState(() => new Animated.Value(0))

  const toast = useCallback((message: string, tone: ToastTone = 'success') => setToast({ message, tone, key: Date.now() }), [])
  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>(resolve => setDialog({ ...options, resolve })), [])

  useEffect(() => {
    if (!toastState) return
    opacity.setValue(0)
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start()
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null))
    }, toastState.tone === 'error' ? 4200 : 2800)
    return () => clearTimeout(timer)
  }, [toastState, opacity])

  const close = (value: boolean) => { dialog?.resolve(value); setDialog(null) }
  const value = useMemo(() => ({ toast, confirm }), [toast, confirm])
  const ToastIcon = toastState?.tone === 'error' ? XCircle : toastState?.tone === 'info' ? Info : CheckCircle2
  const toastColor = toastState?.tone === 'error' ? '#fca5a5' : toastState?.tone === 'info' ? c.brand : '#86efac'

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {toastState && (
        <Animated.View pointerEvents="none" style={[styles.toast, { top: insets.top + 10, backgroundColor: c.navy, opacity, transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }]}>
          <ToastIcon size={18} color={toastColor} />
          <Text size={14} color="#ffffff" style={{ flex: 1 }}>{toastState.message}</Text>
        </Animated.View>
      )}
      <Modal visible={Boolean(dialog)} transparent animationType="fade" onRequestClose={() => close(false)} statusBarTranslucent>
        <View style={styles.center}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close(false)} />
          <View style={[styles.dialog, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text weight="semibold" size={17}>{dialog?.title}</Text>
            {dialog?.description && <Text size={14} tone="mutedForeground" leading={21} style={{ marginTop: 8 }}>{dialog.description}</Text>}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <Button variant="outline" style={{ flex: 1 }} onPress={() => close(false)}>{dialog?.cancelLabel ?? 'Cancel'}</Button>
              <Button variant={dialog?.tone === 'danger' ? 'destructive' : 'default'} style={{ flex: 1 }} onPress={() => close(true)}>{dialog?.confirmLabel ?? 'Confirm'}</Button>
            </View>
          </View>
        </View>
      </Modal>
    </FeedbackContext.Provider>
  )
}

export function useFeedback() {
  const value = useContext(FeedbackContext)
  if (!value) throw new Error('useFeedback must be used inside FeedbackProvider')
  return value
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(24,23,21,0.45)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: radius.xl + 6, borderTopRightRadius: radius.xl + 6 },
  grabber: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, marginTop: 8 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  close: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  toast: { position: 'absolute', left: 16, right: 16, zIndex: 100, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(24,23,21,0.5)' },
  dialog: { width: '100%', maxWidth: 420, borderRadius: radius.xl, borderWidth: 1, padding: 20 },
})
