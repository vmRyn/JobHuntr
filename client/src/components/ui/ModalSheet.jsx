import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Button from "./Button";

const focusableSelector =
  "a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";

const ModalSheet = ({ open, title, subtitle, onClose, children }) => {
  const titleId = useId();
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      const firstFocusable = modalRef.current?.querySelector(focusableSelector);

      if (firstFocusable instanceof HTMLElement) {
        firstFocusable.focus();
        return;
      }

      modalRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;

      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [open]);

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== "Tab" || !modalRef.current) {
      return;
    }

    const focusableElements = Array.from(modalRef.current.querySelectorAll(focusableSelector));

    if (!focusableElements.length) {
      event.preventDefault();
      modalRef.current.focus();
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-3 backdrop-blur-md md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="surface-card w-full max-w-2xl p-4 md:p-6"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.24 }}
            onKeyDown={handleKeyDown}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 id={titleId} className="font-display text-2xl text-slate-50">
                  {title}
                </h3>
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
};

export default ModalSheet;
