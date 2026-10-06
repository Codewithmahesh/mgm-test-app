import { View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { Text } from '@/components/ui'
import { radius, useColors } from '@/theme'

/** JEMS brand mark: the coral "J" tile from the sign-in design. */
export function JemsMark({ size = 48 }: { size?: number }) {
  const c = useColors()
  return (
    <View style={{ width: size, height: size, borderRadius: radius.xl, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="JEMS">
      <Text serif weight="semibold" size={Math.round(size * 0.5)} leading={Math.round(size * 0.6)} color={c.primaryForeground}>J</Text>
    </View>
  )
}

/** GitHub's mark (lucide 1.x dropped brand icons). */
export function GithubMark({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" accessibilityLabel="GitHub">
      <Path fill={color} d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </Svg>
  )
}
