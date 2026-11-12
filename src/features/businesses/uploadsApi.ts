import type { AxiosProgressEvent } from 'axios'

import { apiClient } from '../../lib/api/client'
import { apiGet } from '../../lib/api/requests'
import type { components } from '../../lib/api/schema'
import { businessPath } from '../../lib/businesses/activeBusiness'

export type Upload = components['schemas']['UploadResponse']
export type ImageCategory = 'logo' | 'cover'
export type UploadCategory = ImageCategory | 'portfolio'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** Limits from bfb-api docs/UPLOADS.md (`src/services/uploads.py`). The server checks again. */
export const UPLOAD_LIMITS: Record<ImageCategory, { types: readonly string[]; maxBytes: number; label: string }> = {
  logo: { types: IMAGE_TYPES, maxBytes: 5 * 1024 * 1024, label: 'logo' },
  cover: { types: IMAGE_TYPES, maxBytes: 10 * 1024 * 1024, label: 'cover image' },
}

/** Portfolio work samples: images or a PDF, up to 15 MB. */
export const PORTFOLIO_UPLOAD_LIMITS = { types: [...IMAGE_TYPES, 'application/pdf'] as readonly string[], maxBytes: 15 * 1024 * 1024 }

const EXTENSION_TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' }

/** The type the server will see: the browser's, with `image/jpg` as JPEG, or a guess from the extension. */
export function fileType(file: File): string {
  if (file.type === 'image/jpg') return 'image/jpeg'
  if (file.type) return file.type
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSION_TYPES[extension] ?? ''
}

export function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

/** Why `file` can't be the business's logo or cover, or `null` if it can. Checked before uploading. */
export function checkImageFile(category: ImageCategory, file: File): string | null {
  const limits = UPLOAD_LIMITS[category]
  if (!limits.types.includes(fileType(file))) return `Choose a JPEG, PNG or WebP image for your ${limits.label}.`
  if (file.size === 0) return 'That file is empty. Choose another image.'
  if (file.size > limits.maxBytes) return `Your ${limits.label} must be ${formatMegabytes(limits.maxBytes)} or smaller.`
  return null
}

/** Why `file` can't be a portfolio work sample, or `null` if it can. Checked before uploading. */
export function checkPortfolioFile(file: File): string | null {
  if (!PORTFOLIO_UPLOAD_LIMITS.types.includes(fileType(file))) return 'Choose a JPEG, PNG or WebP image, or a PDF.'
  if (file.size === 0) return 'That file is empty. Choose another one.'
  if (file.size > PORTFOLIO_UPLOAD_LIMITS.maxBytes) return `Work samples must be ${formatMegabytes(PORTFOLIO_UPLOAD_LIMITS.maxBytes)} or smaller.`
  return null
}

/**
 * Upload a file for the business (owners and administrators): a logo, a cover or a portfolio
 * work sample. Resolves with the upload, whose `id` the record stores and whose `url` is a
 * short-lived preview link.
 */
export async function uploadFile(
  businessId: string,
  category: UploadCategory,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<Upload> {
  const form = new FormData()
  form.append('category', category)
  form.append('file', file, file.name)
  const response = await apiClient.post<Upload>(businessPath(businessId, '/uploads'), form, {
    // multipart: the browser adds the boundary. (The client's JSON default would turn FormData into JSON.)
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000,
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (onProgress && event.total) onProgress(Math.min(1, event.loaded / event.total))
    },
  })
  return response.data
}

/** The upload with a fresh signed `url`. Any member. Never store the URL: it expires. */
export function getUpload(businessId: string, uploadId: string) {
  return apiGet('/businesses/{business_id}/uploads/{upload_id}', { path: { business_id: businessId, upload_id: uploadId } })
}
