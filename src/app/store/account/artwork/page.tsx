'use client'

import { useRef } from 'react'
// TODO [Batch G]: Replace auth-store with Supabase store-users
import { useAuthStore } from '@/lib/store/auth-store'
import Button from '@/components/store/ui/Button'

export default function ArtworkPage() {
  const user = useAuthStore((s) => s.currentUser)
  const addSavedArtwork = useAuthStore((s) => s.addSavedArtwork)
  const removeSavedArtwork = useAuthStore((s) => s.removeSavedArtwork)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      addSavedArtwork({
        id: `art_${Date.now()}`,
        fileName: file.name,
        fileSize: file.size,
        imageUrl: reader.result as string,
        uploadedAt: new Date().toISOString(),
      })
    }
    reader.readAsDataURL(file)

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">Artwork Library</h1>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.ai,.eps,.svg"
            onChange={handleUpload}
            className="hidden"
          />
          <Button size="sm" onClick={() => fileInputRef.current?.click()}>
            Upload Artwork
          </Button>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Save your artwork files for quick access when ordering. Files are stored in your browser.
      </p>

      {user.savedArtwork.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 px-6 py-16 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-200 mb-4">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p className="text-sm text-gray-500 mb-2">No saved artwork yet</p>
          <p className="text-xs text-gray-400">Upload your artwork files here for easy re-use</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {user.savedArtwork.map((art) => (
            <div
              key={art.id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden group"
            >
              {/* Preview */}
              <div className="aspect-square bg-gray-50 flex items-center justify-center relative">
                {art.imageUrl.startsWith('data:image') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={art.imageUrl}
                    alt={art.fileName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-300">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <p className="text-[10px] text-gray-400 mt-1">{art.fileName.split('.').pop()?.toUpperCase()}</p>
                  </div>
                )}

                {/* Delete button */}
                <button
                  onClick={() => removeSavedArtwork(art.id)}
                  className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition shadow-sm"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Info */}
              <div className="px-3 py-2.5">
                <p className="text-xs font-medium text-gray-900 truncate">{art.fileName}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {formatSize(art.fileSize)} ·{' '}
                  {new Date(art.uploadedAt).toLocaleDateString('en-MY', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
