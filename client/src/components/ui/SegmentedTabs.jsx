const SegmentedTabs = ({ tabs, value, onChange, className = "", ariaLabel = "Options" }) => (
  <div
    role="radiogroup"
    aria-label={ariaLabel}
    className={`inline-flex w-full flex-wrap gap-1 rounded-2xl border border-white/12 bg-slate-950/72 p-1.5 ring-1 ring-white/8 ${className}`}
  >
    {tabs.map((tab, index) => {
      const active = tab.id === value;

      return (
        <button
          key={tab.id}
          type="button"
          role="radio"
          aria-checked={active}
          tabIndex={active ? 0 : -1}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
              return;
            }

            event.preventDefault();
            const delta = event.key === "ArrowRight" ? 1 : -1;
            const nextIndex = (index + delta + tabs.length) % tabs.length;
            onChange(tabs[nextIndex].id);
          }}
          onClick={() => onChange(tab.id)}
          className={`tab-trigger flex-1 text-center ${active ? "tab-trigger-active" : ""}`}
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);

export default SegmentedTabs;
