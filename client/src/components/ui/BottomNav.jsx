import { motion } from "framer-motion";

const BottomNav = ({ items, activeTab, onChange }) => (
  <nav className="fixed inset-x-0 bottom-3 z-30 flex justify-center px-3">
    <div className="mx-auto flex w-full max-w-xl items-center justify-between rounded-3xl border border-white/10 bg-slate-900/85 p-2 shadow-[0_20px_40px_-22px_rgba(0,0,0,0.8)] backdrop-blur-xl">
      {items.map((item) => {
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`relative flex min-w-[62px] flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${
              active ? "text-slate-50" : "text-slate-300 hover:text-slate-100"
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span>{item.label}</span>
            {active && (
              <motion.span
                layoutId="bottom-nav-indicator"
                className="absolute inset-0 -z-10 rounded-2xl bg-brand/20 ring-1 ring-brand/40"
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
              />
            )}
          </button>
        );
      })}
    </div>
  </nav>
);

export default BottomNav;
