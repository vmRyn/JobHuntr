import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "../../context/ToastContext";

const toneStyles = {
  success: "bg-slate-900/95 text-emerald-100 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.32)]",
  error: "bg-slate-900/95 text-rose-100 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.35)]",
  info: "bg-slate-900/95 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.35)]",
  neutral: "bg-slate-900/95 text-slate-100 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.28)]"
};

const ToastViewport = () => {
  const { toasts, dismissToast, runToastAction } = useToast();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-3 sm:top-4"
    >
      <div className="flex w-full max-w-xl flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.section
              key={toast.id}
              role="status"
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className={`pointer-events-auto rounded-2xl px-4 py-3 backdrop-blur-lg ${
                toneStyles[toast.type] || toneStyles.info
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {toast.title && (
                    <p className="truncate text-sm font-semibold text-inherit">{toast.title}</p>
                  )}
                  {toast.message && (
                    <p className="mt-0.5 text-xs text-slate-200/90">{toast.message}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {toast.actionLabel && toast.onAction && (
                    <button
                      type="button"
                      onClick={() => runToastAction(toast.id)}
                      className="rounded-lg border border-transparent bg-slate-800/75 px-2.5 py-1 text-xs font-semibold text-slate-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] transition hover:bg-slate-700/80"
                    >
                      {toast.actionLabel}
                    </button>
                  )}

                  {toast.dismissible && (
                    <button
                      type="button"
                      onClick={() => dismissToast(toast.id)}
                      className="rounded-lg border border-transparent px-2 py-1 text-xs font-semibold text-slate-200 transition hover:bg-slate-800/80"
                      aria-label="Dismiss notification"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </motion.section>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ToastViewport;
