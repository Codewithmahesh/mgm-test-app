import type { LucideIcon } from 'lucide-react-native'
import { StyleSheet, type ColorValue } from 'react-native'
import { fonts, useColors } from '@/theme'

/** Shared bottom-tab styling for the student and faculty apps. */
export function useTabOptions() {
  const c = useColors()
  return {
    headerShown: false,
    tabBarActiveTintColor: c.primary,
    tabBarInactiveTintColor: c.subtle,
    tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6, elevation: 0, shadowOpacity: 0 },
    tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11, marginTop: 2 },
    sceneStyle: { backgroundColor: c.background },
  }
}

export const tabIcon = (Icon: LucideIcon) => function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
  return <Icon size={22} color={color as string} strokeWidth={focused ? 2.3 : 1.9} />
}
