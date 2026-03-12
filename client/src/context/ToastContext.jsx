import { createContext, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);

const createToastId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const clearToastTimer = (toastId) => {
    const timerId = timersRef.current.get(toastId);
    if (timerId) {
      window.clearTimeout(timerId);
      timersRef.current.delete(toastId);
    }
  };

  const dismissToast = (toastId) => {
    clearToastTimer(toastId);
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  };

  const runToastAction = (toastId) => {
    let toastAction;

    setToasts((prev) => {
      const toast = prev.find((item) => item.id === toastId);
      toastAction = toast?.onAction;
      return prev.filter((item) => item.id !== toastId);
    });

    clearToastTimer(toastId);

    if (typeof toastAction === "function") {
      toastAction();
    }
  };

  const showToast = ({
    title,
    message = "",
    type = "info",
    duration = 4200,
    actionLabel = "",
    onAction = null,
    dismissible = true
  }) => {
    const toastId = createToastId();

    const nextToast = {
      id: toastId,
      title,
      message,
      type,
      actionLabel,
      onAction,
      dismissible
    };

    setToasts((prev) => [...prev, nextToast].slice(-4));

    if (duration > 0) {
      const timerId = window.setTimeout(() => {
        dismissToast(toastId);
      }, duration);

      timersRef.current.set(toastId, timerId);
    }

    return toastId;
  };

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      dismissToast,
      runToastAction
    }),
    [toasts]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
};
