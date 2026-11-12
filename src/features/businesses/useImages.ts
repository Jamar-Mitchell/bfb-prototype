import { useCallback, useEffect, useState } from 'react'

import { toApiError } from '../../lib/api/errors'
import { updateProfile } from './profileApi'
import { checkImageFile, formatMegabytes, getUpload, UPLOAD_LIMITS, uploadImage, type ImageCategory, type Upload } from './uploadsApi'
import { loadBusinessProfile, setBusinessProfile } from './useBusinessProfile'

// Signed URLs expire (15 minutes by default). Keep each in memory until a minute before then;
// the profile itself only ever stores upload IDs.
const urls = new Map<string, { url: string; expiresAt: number }>()
const EARLY_MS = 60_000

function rememberUrl(upload: Pick<Upload, 'id' | 'url' | 'url_expires_at'>) {
  urls.set(upload.id, { url: upload.url, expiresAt: Date.parse(upload.url_expires_at) - EARLY_MS })
}

function cachedUrl(uploadId: string): string | null {
  const entry = urls.get(uploadId)
  return entry && entry.expiresAt > Date.now() ? entry.url : null
}

/** For tests: forget the signed URLs. */
export function resetImageUrls() {
  urls.clear()
}

/**
 * A fresh signed URL for one of the business's uploads, or `null` while it loads (or without
 * an upload). Call `refresh` when the image fails to load: the link may have expired.
 */
export function useUploadUrl(businessId: string, uploadId: string | null) {
  const [state, setState] = useState<{ id: string | null; url: string | null; attempt: number }>({ id: null, url: null, attempt: 0 })

  useEffect(() => {
    if (!uploadId) return
    const known = cachedUrl(uploadId)
    if (known) {
      setState((current) => ({ ...current, id: uploadId, url: known }))
      return
    }
    let live = true
    getUpload(businessId, uploadId).then(
      (upload) => {
        rememberUrl(upload)
        if (live) setState((current) => ({ ...current, id: uploadId, url: upload.url }))
      },
      () => {
        // No preview; the profile still has the image. The placeholder stays.
      },
    )
    return () => {
      live = false
    }
  }, [businessId, uploadId, state.attempt])

  const refresh = useCallback(() => {
    if (!uploadId) return
    urls.delete(uploadId)
    // One retry per page view, so a broken file doesn't loop.
    setState((current) => (current.attempt > 0 ? { ...current, url: null } : { id: uploadId, url: null, attempt: current.attempt + 1 }))
  }, [uploadId])

  return { url: uploadId && state.id === uploadId ? state.url : null, refresh }
}

export type ImageUploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | { status: 'error'; message: string }

function uploadProblem(category: ImageCategory, error: unknown): string {
  const apiError = toApiError(error)
  const limits = UPLOAD_LIMITS[category]
  switch (apiError.code) {
    case 'file_too_large': {
      const maxBytes = (apiError.details as { max_bytes?: number } | undefined)?.max_bytes ?? limits.maxBytes
      return `Your ${limits.label} must be ${formatMegabytes(maxBytes)} or smaller.`
    }
    case 'unsupported_file_type':
      return `Choose a JPEG, PNG or WebP image for your ${limits.label}.`
    default:
      return apiError.userMessage
  }
}

/**
 * Upload a logo or cover and put it on the profile straight away: check the file, upload it
 * with progress, then save its ID with `PATCH /profile`.
 */
export function useImageUpload(businessId: string, category: ImageCategory) {
  const [state, setState] = useState<ImageUploadState>({ status: 'idle' })

  const upload = useCallback(
    async (file: File) => {
      const problem = checkImageFile(category, file)
      if (problem) {
        setState({ status: 'error', message: problem })
        return false
      }

      setState({ status: 'uploading', progress: 0 })
      try {
        const uploaded = await uploadImage(businessId, category, file, (progress) => setState({ status: 'uploading', progress }))
        rememberUrl(uploaded)
        const field = category === 'logo' ? 'logo_upload_id' : 'cover_upload_id'
        setBusinessProfile(await updateProfile(businessId, { [field]: uploaded.id }))
        setState({ status: 'idle' })
        return true
      } catch (error) {
        // In review meanwhile: reloading shows the read-only page.
        if (toApiError(error).code === 'profile_not_editable') void loadBusinessProfile(businessId)
        setState({ status: 'error', message: uploadProblem(category, error) })
        return false
      }
    },
    [businessId, category],
  )

  const dismiss = useCallback(() => setState({ status: 'idle' }), [])

  return { state, upload, dismiss }
}
