import { zodResolver } from '@hookform/resolvers/zod'
import { FileText, Paperclip, Trash2, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { TextareaField, TextField } from '../../components/forms'
import { toApiError } from '../../lib/api/errors'
import type { DraftChanges, DraftItem } from './portfolioDraft'
import { isPdf } from './PortfolioGallery'
import { isWebUrl, normalizeUrl } from './profileForm'
import { checkPortfolioFile, formatMegabytes, PORTFOLIO_UPLOAD_LIMITS, uploadFile } from './uploadsApi'
import { loadBusinessProfile } from './useBusinessProfile'

// Rules from bfb-api docs/PORTFOLIO.md (`POST /portfolio`). The server checks again.

const itemSchema = z.object({
  title: z.string().trim().min(1, 'Give this work sample a title.').max(120, 'Use 120 characters or fewer.'),
  description: z.string().trim().max(2000, 'Use 2,000 characters or fewer.'),
  link_url: z.string().trim().max(300, 'Use 300 characters or fewer.').refine(isWebUrl, 'Enter a web address, for example https://example.com.'),
})

type ItemValues = z.infer<typeof itemSchema>

const ACCEPT = PORTFOLIO_UPLOAD_LIMITS.types.join(',')

type Attachment = Pick<DraftItem, 'upload_id' | 'file' | 'original_filename'>

type UploadState = { status: 'idle' } | { status: 'uploading'; progress: number } | { status: 'error'; message: string }

function uploadProblem(error: unknown): string {
  const apiError = toApiError(error)
  switch (apiError.code) {
    case 'file_too_large':
      return `Work samples must be ${formatMegabytes(PORTFOLIO_UPLOAD_LIMITS.maxBytes)} or smaller.`
    case 'unsupported_file_type':
      return 'Choose a JPEG, PNG or WebP image, or a PDF.'
    case 'file_content_mismatch':
      return 'That file isn’t really the type its name says. Save it again as JPEG, PNG, WebP or PDF.'
    case 'empty_file':
      return 'That file is empty. Choose another one.'
    default:
      return apiError.userMessage
  }
}

interface PortfolioItemDialogProps {
  businessId: string
  /** The item to edit, or `null` to add one. */
  item: DraftItem | null
  onSubmit: (changes: DraftChanges) => void
  onClose: () => void
}

/**
 * Add or edit a work sample in the draft. A chosen file uploads at once (files must exist before
 * the batch can point at them); everything else waits for "Save portfolio".
 */
export function PortfolioItemDialog({ businessId, item, onSubmit, onClose }: PortfolioItemDialogProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [attachment, setAttachment] = useState<Attachment>({
    upload_id: item?.upload_id ?? null,
    file: item?.file ?? null,
    original_filename: item?.original_filename ?? null,
  })
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' })
  const uploading = upload.status === 'uploading'
  const live = useRef(true)

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<ItemValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: { title: item?.title ?? '', description: item?.description ?? '', link_url: item?.link_url ?? '' },
  })

  useEffect(() => {
    live.current = true
    const previous = document.activeElement as HTMLElement | null
    setFocus('title')
    return () => {
      live.current = false
      previous?.focus?.()
    }
  }, [setFocus])

  const chooseFile = async (file: File) => {
    const problem = checkPortfolioFile(file)
    if (problem) {
      setUpload({ status: 'error', message: problem })
      return
    }
    setUpload({ status: 'uploading', progress: 0 })
    try {
      const uploaded = await uploadFile(businessId, 'portfolio', file, (progress) => {
        if (live.current) setUpload({ status: 'uploading', progress })
      })
      if (!live.current) return
      setAttachment({
        upload_id: uploaded.id,
        file: { content_type: uploaded.content_type, url: uploaded.url, url_expires_at: uploaded.url_expires_at },
        original_filename: uploaded.original_filename ?? file.name,
      })
      setUpload({ status: 'idle' })
    } catch (error) {
      // In review meanwhile: reloading the business shows the read-only page.
      if (toApiError(error).code === 'profile_not_editable') void loadBusinessProfile(businessId)
      if (live.current) setUpload({ status: 'error', message: uploadProblem(error) })
    }
  }

  const submit = handleSubmit((values) => {
    const link = values.link_url ? normalizeUrl(values.link_url) : ''
    if (!attachment.upload_id && !link) {
      setError('link_url', { type: 'required', message: 'Add a file, a link, or both.' }, { shouldFocus: true })
      return
    }
    onSubmit({
      title: values.title,
      description: values.description || null,
      link_url: link || null,
      ...attachment,
    })
  })

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    } else if (event.key === 'Tab') {
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="file"]), textarea:not(:disabled)') ?? [],
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
  }

  const { file } = attachment
  const percent = uploading ? Math.round(upload.progress * 100) : 0

  return (
    <div className="modal-backdrop">
      <div className="quick-modal portfolio-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialogRef} onKeyDown={onKeyDown}>
        <div className="modal-head">
          <div><span>{item ? 'EDIT WORK SAMPLE' : 'NEW WORK SAMPLE'}</span><h2 id={titleId}>{item ? 'Edit work sample' : 'Add a work sample'}</h2></div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}><X size={19} aria-hidden="true" /></button>
        </div>
        <form onSubmit={submit} noValidate>
          <div className="modal-body portfolio-dialog-body">
            <TextField label="Title" required placeholder="e.g. Brand identity for Corner Bakery" error={errors.title?.message} {...register('title')} />
            <div className="portfolio-file-field" role="group" aria-label="File">
              <span className="form-field-label">File</span>
              {file ? (
                <div className="portfolio-file-chosen">
                  {isPdf(file) ? (
                    <span className="portfolio-file-thumb portfolio-file-thumb-pdf"><FileText size={20} aria-hidden="true" /></span>
                  ) : (
                    <img className="portfolio-file-thumb" src={file.url} alt="" />
                  )}
                  <span className="portfolio-file-name">{attachment.original_filename ?? (isPdf(file) ? 'PDF' : 'Image')}</span>
                  <button
                    type="button"
                    className="portfolio-icon-button"
                    aria-label="Remove file"
                    disabled={uploading}
                    onClick={() => setAttachment({ upload_id: null, file: null, original_filename: null })}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              ) : null}
              <button type="button" className="button button-secondary button-small portfolio-file-button" onClick={() => inputRef.current?.click()} disabled={uploading}>
                <Paperclip size={15} aria-hidden="true" /> {uploading ? 'Uploading…' : file ? 'Replace file' : 'Choose a file'}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                hidden
                aria-label="Upload work sample file"
                onChange={(event) => {
                  const chosen = event.target.files?.[0]
                  event.target.value = ''
                  if (chosen) void chooseFile(chosen)
                }}
              />
              {uploading ? (
                <div className="portfolio-upload-progress" role="progressbar" aria-label="Uploading file" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                  <span style={{ width: `${Math.max(percent, 4)}%` }} />
                </div>
              ) : null}
              <p className="form-field-hint">JPEG, PNG or WebP image, or a PDF, up to {formatMegabytes(PORTFOLIO_UPLOAD_LIMITS.maxBytes)}. Files upload now; the portfolio changes when you save it.</p>
              {upload.status === 'error' ? <p className="form-field-error" role="alert">{upload.message}</p> : null}
            </div>
            <TextField label="Link" placeholder="https://" hint="Where partners can see the work online. Optional if you add a file." error={errors.link_url?.message} {...register('link_url')} />
            <TextareaField label="Description" placeholder="What you did and the result." error={errors.description?.message} {...register('description')} />
          </div>
          <div className="modal-footer">
            <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={uploading}>{item ? 'Update item' : 'Add to portfolio'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
