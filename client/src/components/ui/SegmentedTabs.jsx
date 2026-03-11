const SegmentedTabs = ({ tabs, value, onChange, className = "" }) => (
  <div className={`inline-flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 ${className}`}>
    {tabs.map((tab) => {
      const active = tab.id === value;

      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`tab-trigger ${active ? "tab-trigger-active" : ""}`}
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);

export default SegmentedTabs;
