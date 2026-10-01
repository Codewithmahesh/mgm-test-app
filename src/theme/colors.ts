// Same palette as the website (mgm-test/app/globals.css): warm cream canvas, warm ink and a
// coral accent in light; warm charcoal in dark. Screens only use these names, never raw hex.

export const light = {
  background: '#faf9f5',
  foreground: '#141413',
  card: '#ffffff',
  popover: '#ffffff',

  primary: '#c6613f',
  primaryHover: '#a9583e',
  primarySoft: '#f7ebe5',
  primaryBorder: '#eccbbd',
  primaryInk: '#97462b',
  primaryForeground: '#ffffff',

  secondary: '#efe9de',
  muted: '#f5f0e8',
  mutedForeground: '#6c6a64',
  subtle: '#8e8b82',

  border: '#e6dfd8',
  borderStrong: '#d4cbbd',
  input: '#dcd4c7',

  navy: '#181715',
  navy2: '#252320',
  brand: '#e8a55a',
  chart: '#c6613f',

  sidebar: '#f3efe6',
  sidebarForeground: '#3d3d3a',
  sidebarMuted: '#8e8b82',
  sidebarBorder: '#e6dfd8',
  sidebarHover: '#ebe5d9',
  sidebarActive: '#e4dccd',

  success: '#2f8a4a',
  successSoft: '#eaf4ea',
  successBorder: '#c8e2cb',
  successInk: '#256b3a',
  warning: '#b7791f',
  warningSoft: '#fbf1dc',
  warningBorder: '#ecd6a6',
  warningInk: '#8a5a12',
  danger: '#c64545',
  dangerSoft: '#fbe9e7',
  dangerBorder: '#f0c7c2',
  dangerInk: '#a33434',
  violet: '#2f8a78',
  violetSoft: '#e4f2ee',
  violetBorder: '#bfe0d7',
}

export type Palette = typeof light

export const dark: Palette = {
  background: '#262624',
  foreground: '#faf9f5',
  card: '#30302e',
  popover: '#353532',

  primary: '#d97757',
  primaryHover: '#e38a6c',
  primarySoft: '#3d2c25',
  primaryBorder: '#6b4232',
  primaryInk: '#f0ab91',
  primaryForeground: '#ffffff',

  secondary: '#3a3936',
  muted: '#383733',
  mutedForeground: '#b7b5a9',
  subtle: '#8b8a82',

  border: '#3e3d38',
  borderStrong: '#52504a',
  input: '#4a4843',

  navy: '#1a1918',
  navy2: '#232220',
  brand: '#e8a55a',
  chart: '#d27052',

  sidebar: '#1f1e1d',
  sidebarForeground: '#d8d6cc',
  sidebarMuted: '#8b8a82',
  sidebarBorder: '#33322f',
  sidebarHover: '#2a2927',
  sidebarActive: '#353431',

  success: '#6cc485',
  successSoft: '#1f3024',
  successBorder: '#2e4a35',
  successInk: '#93d9a6',
  warning: '#e2b34a',
  warningSoft: '#3a3020',
  warningBorder: '#5a4a2a',
  warningInk: '#eccb7a',
  danger: '#e57373',
  dangerSoft: '#3d2524',
  dangerBorder: '#5e3634',
  dangerInk: '#f3a5a5',
  violet: '#6fcab8',
  violetSoft: '#1e3430',
  violetBorder: '#2f524b',
}

/** Tones used by badges and icon tiles, matching the website's Badge tones. */
export type Tone = 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'violet'

export function toneColors(c: Palette, tone: Tone) {
  switch (tone) {
    case 'blue': return { bg: c.primarySoft, fg: c.primaryInk, border: c.primaryBorder, solid: c.primary }
    case 'green': return { bg: c.successSoft, fg: c.successInk, border: c.successBorder, solid: c.success }
    case 'amber': return { bg: c.warningSoft, fg: c.warningInk, border: c.warningBorder, solid: c.warning }
    case 'red': return { bg: c.dangerSoft, fg: c.dangerInk, border: c.dangerBorder, solid: c.danger }
    case 'violet': return { bg: c.violetSoft, fg: c.violet, border: c.violetBorder, solid: c.violet }
    default: return { bg: c.muted, fg: c.mutedForeground, border: c.border, solid: c.subtle }
  }
}
