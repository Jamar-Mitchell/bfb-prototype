import { ArrowUpRight, FileText, Link2 } from 'lucide-react'
import type { ReactNode } from 'react'

import type { PortfolioEntry, PortfolioFile } from './portfolioApi'
import { displayUrl } from './profileLabels'
import './Portfolio.css'

export function isPdf(file: PortfolioFile | null): boolean {
  return file?.content_type === 'application/pdf'
}

interface PortfolioTileProps {
  item: PortfolioEntry
  /** Shown under the title: a file name in the editor. */
  meta?: ReactNode
  /** Badges over the preview, such as "Unsaved". */
  badge?: ReactNode
  /** Editing controls under the text. */
  children?: ReactNode
  onImageError?: () => void
}

/**
 * One work sample: an image preview, a PDF tile or a link tile, with its title, description and
 * links. Files open their signed URL in a new tab.
 */
export function PortfolioTile({ item, meta, badge, children, onImageError }: PortfolioTileProps) {
  const { file } = item
  const image = file && !isPdf(file)
  const previewHref = file?.url ?? item.link_url

  const preview = image ? (
    <img src={file.url} alt="" loading="lazy" onError={onImageError} />
  ) : file ? (
    <span className="portfolio-preview-icon"><FileText size={26} aria-hidden="true" /><small>PDF</small></span>
  ) : (
    <span className="portfolio-preview-icon"><Link2 size={26} aria-hidden="true" /><small>{item.link_url ? displayUrl(item.link_url) : 'Link'}</small></span>
  )

  return (
    <article className="portfolio-tile">
      <div className={`portfolio-preview ${image ? '' : 'portfolio-preview-plain'}`}>
        {previewHref ? (
          <a href={previewHref} target="_blank" rel="noopener noreferrer nofollow" tabIndex={-1} aria-hidden="true">{preview}</a>
        ) : (
          preview
        )}
        {badge}
      </div>
      <div className="portfolio-tile-body">
        <h3>{item.title}</h3>
        {meta}
        {item.description ? <p>{item.description}</p> : null}
        {file || item.link_url ? (
          <div className="portfolio-tile-links">
            {file ? (
              <a href={file.url} target="_blank" rel="noopener noreferrer" aria-label={`${isPdf(file) ? 'Open PDF' : 'View image'}: ${item.title}`}>
                {isPdf(file) ? 'Open PDF' : 'View image'} <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            ) : null}
            {item.link_url ? (
              <a href={item.link_url} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Visit link: ${item.title}`}>
                Visit link <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </article>
  )
}

/** Read-only grid of work samples, for the public profile and admin review. */
export function PortfolioGallery({ items, label }: { items: readonly PortfolioEntry[]; label: string }) {
  return (
    <ol className="portfolio-grid" aria-label={label}>
      {items.map((item) => (
        <li key={item.id}><PortfolioTile item={item} /></li>
      ))}
    </ol>
  )
}
