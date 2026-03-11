import { AnimatePresence, motion } from "framer-motion";
import Button from "./Button";

const ModalSheet = ({ open, title, subtitle, onClose, children }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-3 md:items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-2xl rounded-3xl border border-white/15 bg-slate-900 p-4 shadow-[0_24px_48px_-18px_rgba(0,0,0,0.85)] md:p-6"
          initial={{ y: 24, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.24 }}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl text-slate-100">{title}</h3>
              {subtitle && <p className="mt-1 text-sm text-slate-300">{subtitle}</p>}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </header>

          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default ModalSheet;
