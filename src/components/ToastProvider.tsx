"use client";

// Système de notifications "toast" global.
// Remplace les alert() natifs par des messages élégants, empilés en haut,
// avec auto-disparition et variantes (succès / erreur / info).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
});

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const tm = timers.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = ++counter;
      setToasts((t) => [...t, { id, message, variant }]);
      const tm = setTimeout(() => remove(id), 4200);
      timers.current.set(id, tm);
    },
    [remove],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((tm) => clearTimeout(tm));
  }, []);

  const value: ToastContextValue = {
    toast,
    success: (m) => toast(m, "success"),
    error: (m) => toast(m, "error"),
    info: (m) => toast(m, "info"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed z-[100] inset-x-0 top-3 md:top-4 flex flex-col items-center gap-2 px-3 pointer-events-none">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const styles: Record<ToastVariant, { ring: string; icon: ReactNode }> = {
    success: {
      ring: "border-green-200",
      icon: (
        <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      ),
    },
    error: {
      ring: "border-red-200",
      icon: (
        <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" d="M6 6l12 12M6 18L18 6" />
          </svg>
        </span>
      ),
    },
    info: {
      ring: "border-black/10",
      icon: (
        <span className="w-5 h-5 rounded-full bg-black/[0.06] text-black/50 flex items-center justify-center shrink-0">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8h.01M11 12h1v4h1" />
          </svg>
        </span>
      ),
    },
  };
  const s = styles[toast.variant];

  return (
    <div
      role="status"
      className={
        "pointer-events-auto flex items-center gap-2.5 max-w-[92vw] sm:max-w-md w-full sm:w-auto bg-white border rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] px-3.5 py-2.5 animate-toast-in " +
        s.ring
      }
    >
      {s.icon}
      <span className="text-[13px] text-black/80 flex-1">{toast.message}</span>
      <button
        onClick={onClose}
        className="w-6 h-6 flex items-center justify-center rounded-full text-black/25 hover:text-black/60 hover:bg-black/[0.05] transition-colors shrink-0"
        aria-label="Fermer"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" d="M6 6l12 12M6 18L18 6" />
        </svg>
      </button>
    </div>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
