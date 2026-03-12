const VerifiedBadge = ({ compact = false, className = "" }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border border-transparent bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.45)] ${compact ? "px-1.5 py-0 text-[9px]" : ""} ${className}`}
    aria-label="Verified company"
  >
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M10 2.2 4 4.6v4.8c0 3.4 2.6 6.2 6 7.3 3.4-1.1 6-3.9 6-7.3V4.6L10 2.2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m7.6 9.8 1.6 1.6 3.2-3.3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    Verified
  </span>
);

export default VerifiedBadge;
