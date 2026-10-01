import * as ImagePicker from 'expo-image-picker'

// Same unsigned Cloudinary preset the website uses for question images (mgm-test/lib/imageuploader.ts).
const CLOUDINARY_CLOUD_NAME = 'rbpepl7c'
const CLOUDINARY_UPLOAD_PRESET = 'website'
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`

/** Lets the faculty member pick a photo or diagram and uploads it. Returns its URL, or null if cancelled. */
export async function pickAndUploadImage(): Promise<string | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: true })
  if (picked.canceled || !picked.assets?.length) return null
  const asset = picked.assets[0]
  const form = new FormData()
  // React Native's FormData takes { uri, name, type } for a local file.
  form.append('file', { uri: asset.uri, name: asset.fileName ?? 'question.jpg', type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob)
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  const response = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: form })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error?.message || 'Upload failed')
  return data.secure_url as string
}
