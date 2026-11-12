export function Logo({ light = false }: { light?: boolean }) {
  return (
    <button className={`brand ${light ? 'brand-light' : ''}`} onClick={() => window.scrollTo(0, 0)}>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 96 46">
          <path className="brand-b-shape" fillRule="evenodd" d="M2 3h12c7 0 11 4 11 10 0 4-2 7-5 9 4 2 6 5 6 9 0 7-5 11-13 11H2V3Zm8 7v8h4c3 0 4-2 4-4s-1-4-4-4h-4Zm0 15v10h5c3 0 5-2 5-5s-2-5-5-5h-5Z" />
          <g transform="translate(68 0)">
            <path className="brand-b-shape" fillRule="evenodd" d="M2 3h12c7 0 11 4 11 10 0 4-2 7-5 9 4 2 6 5 6 9 0 7-5 11-13 11H2V3Zm8 7v8h4c3 0 4-2 4-4s-1-4-4-4h-4Zm0 15v10h5c3 0 5-2 5-5s-2-5-5-5h-5Z" />
          </g>
          <rect className="brand-f-stem" x="33" y="3" width="7" height="40" rx="3.5" />
          <path className="brand-arrow-shape" d="M38 7h19l-5-5h8l8 8-8 8h-8l5-5H38V7Z" />
          <path className="brand-arrow-shape" d="M64 25H47l5-5h-8l-9 8 9 8h8l-5-5h17v-6Z" />
        </svg>
      </span>
      <span className="brand-copy">
        <strong>BUSINESS FOR BUSINESS</strong>
        <small>Trade value. Grow together.</small>
      </span>
    </button>
  )
}
