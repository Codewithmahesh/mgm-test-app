import { useState } from 'react'
import { PdfViewer } from '@/components/pdf-viewer'
import { useFeedback } from '@/components/ui'
import { api, errorMessage } from './api'
import type { PracticalReport } from './practicals'

/**
 * Fetches a practical report and opens it as a PDF: in the phone's PDF app on Android (Google Drive's
 * viewer on most phones, with Download), in the app's viewer on iPhone (with Save / Share).
 * `exporting` is the key of the export in progress (one at a time), so the button that started it can
 * show a spinner. Render `viewer` once on the screen.
 */
export function useReportExport() {
  const { toast } = useFeedback()
  const [exporting, setExporting] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ uri: string; name: string } | null>(null)

  async function exportReport(key: string, path: string, body?: Record<string, unknown>) {
    if (exporting) return
    setExporting(key)
    try {
      const { report } = await api<{ report: PracticalReport }>(path, body ? { body } : {})
      // Loaded on first use: the PDF library is large and only needed here.
      const { openPracticalPdf } = await import('./practical-pdf')
      const opened = await openPracticalPdf(report)
      if (opened.how === 'preview') setPreview({ uri: opened.uri, name: opened.name })
    } catch (err) {
      toast(errorMessage(err, 'Could not make the PDF.'), 'error')
    } finally {
      setExporting(null)
    }
  }

  return { exporting, exportReport, viewer: <PdfViewer pdf={preview} onClose={() => setPreview(null)} /> }
}
