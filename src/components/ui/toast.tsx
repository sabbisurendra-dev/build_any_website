'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastProps[];
  toast: (options: Omit<ToastProps, 'id'>) => string;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    ({ title, description, variant = 'default', duration = 4000 }: Omit<ToastProps, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastProps = { id, title, description, variant, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }

      return id;
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastProps[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-0 right-0 z-50 flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-4 sm:right-4 sm:top-auto sm:flex-col md:max-w-md gap-2 pointer-events-none"
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} toast={item} onDismiss={() => onDismiss(item.id)} />
      ))}
    </div>
  );
}

const variantStyles: Record<ToastVariant, { container: string; icon: React.ReactNode }> = {
  default: {
    container: 'bg-card text-card-foreground border-border shadow-lg',
    icon: null,
  },
  success: {
    container: 'bg-emerald-50 text-emerald-950 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-100 dark:border-emerald-800 shadow-lg',
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
  },
  destructive: {
    container: 'bg-rose-50 text-rose-950 border-rose-200 dark:bg-rose-950/80 dark:text-rose-100 dark:border-rose-800 shadow-lg',
    icon: <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />,
  },
  warning: {
    container: 'bg-amber-50 text-amber-950 border-amber-200 dark:bg-amber-950/80 dark:text-amber-100 dark:border-amber-800 shadow-lg',
    icon: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />,
  },
  info: {
    container: 'bg-sky-50 text-sky-950 border-sky-200 dark:bg-sky-950/80 dark:text-sky-100 dark:border-sky-800 shadow-lg',
    icon: <Info className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" />,
  },
};

function ToastItem({ toast, onDismiss }: { toast: ToastProps; onDismiss: () => void }) {
  const { container, icon } = variantStyles[toast.variant ?? 'default'];

  return (
    <div
      role="alert"
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-lg border p-4 shadow-md transition-all duration-200 ease-out',
        container,
      )}
    >
      {icon}
      <div className="flex-1 space-y-1">
        {toast.title && <div className="text-sm font-semibold">{toast.title}</div>}
        {toast.description && (
          <div className="text-xs opacity-90 leading-relaxed">{toast.description}</div>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Close notification"
        className="rounded-md p-1 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
