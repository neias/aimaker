'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';

interface Toast {
  id: number;
  type: 'error' | 'success';
  message: string;
}

let toastId = 0;
let addToastFn: ((toast: Omit<Toast, 'id'>) => void) | null = null;

export function showToast(type: 'error' | 'success', message: string) {
  addToastFn?.({ type, message });
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 rounded-lg border p-3.5 shadow-lg backdrop-blur-sm animate-in slide-in-from-bottom-2 ${
            toast.type === 'error'
              ? 'border-red-500/20 bg-red-950/80 text-red-200'
              : 'border-emerald-500/20 bg-emerald-950/80 text-emerald-200'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          )}
          <p className="text-xs leading-relaxed flex-1">{toast.message}</p>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="text-zinc-500 hover:text-zinc-300 shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
