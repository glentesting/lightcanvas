import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { LightCanvasWordmark } from '../components/LightCanvasWordmark'

export default function MobileUploadPage() {
  const { token } = useParams<{ token: string }>()
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token || !supabase) return
    setUploading(true)
    setError(null)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${token}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('house-photos')
      .upload(path, file, { contentType: file.type, upsert: true })
    if (uploadError) {
      setError('Upload failed. Try again.')
      setUploading(false)
      return
    }
    setDone(true)
    setUploading(false)
  }, [token])

  if (!token) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white p-6">
        <p className="text-sm text-slate-600">Invalid upload link.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col items-center bg-white px-6 py-10">
      <LightCanvasWordmark className="mb-10 text-lg font-semibold tracking-tight text-slate-900" />

      {done ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-4 text-4xl">&#10003;</div>
          <p className="text-lg font-semibold text-slate-900">Photo uploaded</p>
          <p className="mt-2 text-sm text-slate-600">
            Go back to your computer — the photo will appear in the visualizer.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center">
          <label className="flex cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-300 px-12 py-16 transition hover:border-brand-green">
            <svg className="h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            <span className="text-base font-medium text-slate-700">
              {uploading ? 'Uploading...' : 'Take or choose a photo'}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFile}
              disabled={uploading}
            />
          </label>
          <p className="mt-6 text-center text-xs text-slate-500">
            Take a photo of your house at night for best results.
          </p>
          {error && <p className="mt-3 text-center text-sm text-brand-red">{error}</p>}
        </div>
      )}
    </div>
  )
}
