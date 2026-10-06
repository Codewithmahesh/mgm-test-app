import type { LucideIcon } from 'lucide-react-native'
import { StyleSheet, type ColorValue } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { fonts, useColors } from '@/theme'

/** Room for the icon, the label and the padding above them, without the system navigation area. */
const BAR_HEIGHT = 58

/** Shared bottom-tab styling for the student and faculty apps. */
export function useTabOptions() {
  const c = useColors()
  // Sized here rather than left to the navigator: its fixed 49 px height left no room for our top padding,
  // pushing the labels into Android's navigation buttons / gesture bar. Keep a small gap even when the
  // device reports no bottom inset.
  const bottom = Math.max(useSafeAreaInsets().bottom, 8)
  return {
    headerShown: false,
    tabBarActiveTintColor: c.primary,
    tabBarInactiveTintColor: c.subtle,
    tabBarStyle: {
      backgroundColor: c.card, borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth, elevation: 0, shadowOpacity: 0,
      height: BAR_HEIGHT + bottom, paddingTop: 6, paddingBottom: bottom,
    },
    tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11, marginTop: 2 },
    sceneStyle: { backgroundColor: c.background },
  }
}

export const tabIcon = (Icon: LucideIcon) => function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
  return <Icon size={22} color={color as string} strokeWidth={focused ? 2.3 : 1.9} />
}
