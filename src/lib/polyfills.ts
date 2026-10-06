// Loaded first by src/app/_layout.tsx.
//
// React Native's TextDecoder (from Expo) only understands UTF-8: `new TextDecoder('latin1')` throws
// "Unknown encoding: latin1". Some libraries create one as soon as they load (fast-png, pulled in by jsPDF,
// does), which crashed the screens with PDF exports. This adds the single-byte encodings on top of the
// built-in decoder, so no library can bring that crash back.

const SINGLE_BYTE = new Set(['latin1', 'l1', 'iso-8859-1', 'iso8859-1', 'iso_8859-1', 'ascii', 'us-ascii', 'windows-1252', 'cp1252', 'x-cp1252'])

type Input = ArrayBuffer | ArrayBufferView | undefined

function bytesOf(input: Input) {
  if (!input) return new Uint8Array(0)
  if (input instanceof Uint8Array) return input
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
  return new Uint8Array(input)
}

function needsPatch(Native: typeof TextDecoder | undefined) {
  if (!Native) return false
  try { new Native('latin1'); return false } catch { return true }
}

const Native = globalThis.TextDecoder
if (needsPatch(Native)) {
  class TextDecoderWithLatin1 {
    readonly encoding: string
    readonly fatal: boolean
    readonly ignoreBOM: boolean
    private inner: TextDecoder | null

    constructor(label = 'utf-8', options?: TextDecoderOptions) {
      const name = String(label).trim().toLowerCase()
      this.fatal = Boolean(options?.fatal)
      this.ignoreBOM = Boolean(options?.ignoreBOM)
      if (SINGLE_BYTE.has(name)) {
        // Per the Encoding standard, latin1 and ascii are decoded as windows-1252; the byte values map to
        // the same code points for everything libraries use them for (PNG text chunks, PDF strings).
        this.encoding = 'windows-1252'
        this.inner = null
      } else {
        this.inner = new Native(label, options)
        this.encoding = this.inner.encoding
      }
    }

    decode(input?: Input, options?: TextDecodeOptions) {
      if (this.inner) return this.inner.decode(input, options)
      const bytes = bytesOf(input)
      let out = ''
      for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      return out
    }
  }
  globalThis.TextDecoder = TextDecoderWithLatin1 as unknown as typeof TextDecoder
}

export {}
