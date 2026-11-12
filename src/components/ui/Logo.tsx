// Geometry exported from the "BFB Logo" component in the rendezview-branding Figma file
// (BFB page). Colours come from CSS (.brand-letters / .brand-f / .brand-return) so the same
// artwork serves the Primary (light backgrounds) and Reverse (`light` prop, dark backgrounds)
// colourways. Standalone SVGs for every variant live in public/brand/.
const B_PATH =
  'M11 85.957H48.714C57.05 85.957 65.044 89.269 70.938 95.163C76.832 101.056 80.143 109.05 80.143 117.386C80.143 125.721 76.832 133.715 70.938 139.609C65.044 145.503 57.05 148.814 48.714 148.814H11V23.1H42.429C50.764 23.1 58.758 26.411 64.652 32.305C70.546 38.199 73.857 46.193 73.857 54.529C73.857 62.864 70.546 70.858 64.652 76.752C58.758 82.646 50.764 85.957 42.429 85.957'

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <button
      type="button"
      className={`brand ${light ? 'brand-light' : ''}`}
      aria-label="BFB — Business for Business"
      onClick={() => window.scrollTo(0, 0)}
    >
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 297 160" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <g className="brand-letters" stroke="currentColor" strokeWidth="22">
            <path d={B_PATH} />
            <path d={B_PATH} transform="translate(205.714 0)" />
          </g>
          <g className="brand-f" stroke="currentColor">
            <path d="M121.429 23.1H172.025" strokeWidth="22" strokeLinecap="butt" />
            <path d="M190.414 23.1L171.424 3.3V42.9Z" fill="currentColor" strokeWidth="6.6" />
            <path d="M114.143 148.814V23.1H145.571" strokeWidth="22" />
          </g>
          <g className="brand-return" stroke="currentColor">
            <path d="M213.429 85.957H158.833" strokeWidth="22" strokeLinecap="butt" />
            <path d="M140.443 85.957L159.433 66.157V105.757Z" fill="currentColor" strokeWidth="6.6" />
          </g>
        </svg>
      </span>
      <span className="brand-copy">
        <strong>BUSINESS FOR BUSINESS</strong>
        <small>Trade value. Grow together.</small>
      </span>
    </button>
  )
}
