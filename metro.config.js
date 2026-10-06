// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// jsPDF uses these only to render HTML or SVG into a PDF, or to embed PNG images, which the app never does
// (src/lib/practical-pdf.ts draws text and shapes). Leave them out of the bundle. fast-png in particular
// must go: it creates a TextDecoder('latin1') when it loads, and React Native's TextDecoder is UTF-8 only,
// so it threw "Unknown encoding: latin1" as soon as a screen importing the PDF code opened.
const UNUSED = new Set(['html2canvas', 'dompurify', 'canvg', 'fast-png'])
const resolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (UNUSED.has(moduleName)) return { type: 'empty' }
  return (resolveRequest ?? context.resolveRequest)(context, moduleName, platform)
}

module.exports = config
