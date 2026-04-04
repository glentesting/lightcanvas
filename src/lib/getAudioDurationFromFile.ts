/** Read duration in seconds from a browser File (e.g. MP3) via metadata. */
export function getAudioDurationFromFile(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    audio.src = url

    const cleanup = () => {
      URL.revokeObjectURL(url)
    }

    audio.onloadedmetadata = () => {
      const d = audio.duration
      cleanup()
      if (!Number.isFinite(d) || d <= 0) {
        reject(new Error('Could not read audio duration.'))
        return
      }
      resolve(Math.round(d))
    }

    audio.onerror = () => {
      cleanup()
      reject(new Error('Could not load audio file.'))
    }
  })
}
