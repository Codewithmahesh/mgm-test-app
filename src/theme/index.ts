import { useColorScheme } from 'react-native'
import { dark, light, type Palette } from './colors'

export { toneColors, type Palette, type Tone } from './colors'

/** The website's type families: Inter for UI, Source Serif 4 for headings, JetBrains Mono for codes. */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  serif: 'SourceSerif4_500Medium',
  serifSemibold: 'SourceSerif4_600SemiBold',
  mono: 'JetBrainsMono_400Regular',
  monoSemibold: 'JetBrainsMono_600SemiBold',
}

/** --radius is 0.625rem (10px) on the website; sm/md/xl follow its multipliers. */
export const radius = { sm: 6, md: 8, lg: 10, xl: 14, full: 999 }

export function useColors(): Palette {
  return useColorScheme() === 'dark' ? dark : light
}

export function useIsDark() {
  return useColorScheme() === 'dark'
}
