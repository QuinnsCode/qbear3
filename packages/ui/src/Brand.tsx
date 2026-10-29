/** The QNTBR mark: an accent tile with a white Q. */
export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg className="q-brand-mark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="var(--q-accent)" />
      <g fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="11.5" cy="11.5" r="4.6" />
        <path d="M14.6 14.8 18 18.2" />
      </g>
    </svg>
  );
}
