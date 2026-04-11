import { useCallback, useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { supabase } from '../../lib/supabaseClient'
import { saveHousePhoto } from '../../lib/phase1Repository'

interface UploadPhotoFlowProps {
  open: boolean
  onClose: () => void
  onPhotoReady: (url: string) => void
  userId: string | null
  profileId: string | null
}

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
}

export function UploadPhotoFlow({ open, onClose, onPhotoReady, userId, profileId }: UploadPhotoFlowProps) {
  const [token] = useState(generateToken)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Generate QR code on mount
  useEffect(() => {
    if (!open) return
    const baseUrl = import.meta.env.VITE_PUBLIC_URL?.trim() || window.location.origin
    const uploadUrl = `${baseUrl}/upload/${token}`
    QRCode.toDataURL(uploadUrl, { width: 200, margin: 2, color: { dark: '#1a2840', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [open, token])

  // Poll for mobile upload
  useEffect(() => {
    if (!open || !supabase) return
    pollRef.current = setInterval(async () => {
      if (!supabase) return
      const { data } = await supabase.storage
        .from('house-photos')
        .list('', { search: token, limit: 1 })
      if (data && data.length > 0) {
        const file = data[0]
        const { data: urlData } = supabase.storage
          .from('house-photos')
          .getPublicUrl(file.name)
        if (urlData?.publicUrl) {
          setDone(true)
          onPhotoReady(urlData.publicUrl)
          if (userId) void saveHousePhoto(userId, profileId, file.name, urlData.publicUrl, file.name)
          if (pollRef.current) clearInterval(pollRef.current)
        }
      }
    }, 2000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [open, token, onPhotoReady, userId, profileId])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !supabase) return
    setUploading(true)
    setError(null)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${token}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('house-photos')
      .upload(path, file, { contentType: file.type, upsert: true })
    if (uploadError) {
      setError("Couldn't upload that photo. Check your connection and try again.")
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage
      .from('house-photos')
      .getPublicUrl(path)
    if (urlData?.publicUrl) {
      setDone(true)
      onPhotoReady(urlData.publicUrl)
      if (userId) void saveHousePhoto(userId, profileId, path, urlData.publicUrl, file.name)
    }
    setUploading(false)
  }, [token, onPhotoReady, userId, profileId])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-sm text-slate-400 hover:text-slate-600"
        >
          Close
        </button>

        {done ? (
          <div className="py-8 text-center">
            <p className="text-lg font-semibold text-slate-900">Photo uploaded</p>
            <p className="mt-2 text-sm text-slate-600">Your house photo is loading into the visualizer.</p>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-slate-900">Upload your house photo</h3>
            <p className="mt-1 text-sm text-slate-600">
              A photo of your house becomes the canvas background. Place props right on top of it.
            </p>

            <div className="mt-6 space-y-4">
              {/* Option 1: Direct upload */}
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-brand-green/60 hover:text-brand-green disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload from this device'}
                </button>
              </div>

              {/* Option 2: Phone QR */}
              <div className="border-t border-slate-200 pt-4">
                <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                  Or use your phone
                </p>
                <div className="flex justify-center">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Scan to upload" className="h-[200px] w-[200px] rounded-lg" />
                  ) : (
                    <div className="flex h-[200px] w-[200px] items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                      Generating QR...
                    </div>
                  )}
                </div>
                <p className="mt-2 text-center text-xs text-slate-500">
                  Scan with your phone camera. Take or upload a photo there.
                </p>
              </div>

              {error && <p className="text-center text-sm text-brand-red">{error}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
