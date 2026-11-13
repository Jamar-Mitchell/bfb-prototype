import { useCallback, useEffect, useRef, useState } from 'react'

/** Height before the document has loaded, or if it cannot be measured. */
const FALLBACK_HEIGHT = 720

/**
 * The agreement's HTML document in a sandboxed frame. The API returns a complete document, so it
 * is never inserted into the page. The sandbox allows no scripts, forms, popups or navigation of
 * the page; `allow-same-origin` (safe without `allow-scripts`) only lets the page measure the
 * document, so the frame grows to its full height and the page scrolls, not the frame.
 */
export function AgreementFrame({ html, title }: { html: string; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState<number | null>(null)

  const measure = useCallback(() => {
    const doc = frame.current?.contentDocument
    // The root element's own height is the content's, not the frame's, so the frame can shrink too.
    const measured = doc?.documentElement ? Math.ceil(doc.documentElement.getBoundingClientRect().height) : 0
    if (measured > 0) setHeight(measured)
  }, [])

  // The document reflows when the frame's width changes (rotating a phone, resizing a window).
  useEffect(() => {
    const element = frame.current
    if (!element || typeof ResizeObserver === 'undefined') return
    let lastWidth = element.clientWidth
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === lastWidth) return
      lastWidth = element.clientWidth
      measure()
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [measure])

  return (
    <iframe
      ref={frame}
      className="agreement-frame"
      title={title}
      sandbox="allow-same-origin"
      referrerPolicy="no-referrer"
      srcDoc={html}
      onLoad={measure}
      style={{ height: height ?? FALLBACK_HEIGHT }}
    />
  )
}
