const LoadingSpinner = ({ label = "Loading..." }) => (
  <div className="flex min-h-[160px] w-full items-center justify-center">
    <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm font-semibold text-slate-200">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
      {label}
    </div>
  </div>
);

export default LoadingSpinner;
