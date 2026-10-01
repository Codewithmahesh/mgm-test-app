import * as ImagePicker from 'expo-image-picker'
import { send } from './api'

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
  // Through the app's XHR helper: a real timeout and a readable error on a slow mobile connection.
  const response = await send(CLOUDINARY_UPLOAD_URL, 'POST', { Accept: 'application/json' }, form, 120_000, undefined, 'the image service')
  let data: { secure_url?: string; error?: { message?: string } } = {}
  try { data = JSON.parse(response.text) } catch {}
  if (response.status < 200 || response.status >= 300 || !data.secure_url) throw new Error(data.error?.message || 'Upload failed. Please try again.')
  return data.secure_url
}
