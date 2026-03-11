import { motion } from "framer-motion";

const BottomNav = ({ items, activeTab, onChange }) => (
  <nav className="fixed inset-x-0 bottom-3 z-30 flex justify-center px-3 md:bottom-4">
    <div className="mx-auto flex w-full max-w-xl items-center justify-between rounded-[1.45rem] border border-white/15 bg-slate-950/78 p-2 shadow-soft backdrop-blur-2xl ring-1 ring-white/8">
      {items.map((item) => {
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`relative flex min-w-[62px] flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] transition ${
              active ? "text-slate-50" : "text-slate-400 hover:text-slate-100"
            }`}
          >
            <span className="relative text-base leading-none">
              {item.icon}
              {item.badge > 0 && (
                <span className="absolute -right-3 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-negative px-1 text-[10px] font-bold leading-4 text-white">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </span>
            <span>{item.label}</span>
            {active && (
              <motion.span
                layoutId="bottom-nav-indicator"
                className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-brand/25 to-brandStrong/20 ring-1 ring-brand/55"
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
