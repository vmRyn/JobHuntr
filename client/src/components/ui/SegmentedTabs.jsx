const SegmentedTabs = ({ tabs, value, onChange, className = "" }) => (
  <div className={`inline-flex w-full flex-wrap gap-1 rounded-2xl border border-white/12 bg-slate-950/72 p-1.5 ring-1 ring-white/8 ${className}`}>
    {tabs.map((tab) => {
      const active = tab.id === value;

      return (
        <button
          key={tab.id}
          type="button"
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
