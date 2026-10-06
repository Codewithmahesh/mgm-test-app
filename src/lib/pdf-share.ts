import * as Sharing from 'expo-sharing'

// Kept apart from practical-pdf.ts so the viewer can offer sharing without loading the PDF library.

/** Opens the share sheet for a saved PDF (Save to Files, Drive, Books, Mail…). */
export async function sharePdf(uri: string, name: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.')
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: name })
}
