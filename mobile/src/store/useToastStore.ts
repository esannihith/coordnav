import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastOptions {
  title?: string;
  durationMs?: number;
}

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  title: string;
  message: string;
  durationMs: number;
  createdAtMs: number;
}

interface ToastStoreState {
  toasts: ToastMessage[];
  pushToast: (variant: ToastVariant, message: string, options?: ToastOptions) => string;
  success: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

const DEFAULT_TITLES: Record<ToastVariant, string> = {
  success: 'Success',
  error: 'Error',
  info: 'Info',
};

const DEFAULT_DURATIONS_MS: Record<ToastVariant, number> = {
  success: 2_600,
  error: 3_600,
  info: 2_600,
};

function createToastId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useToastStore = create<ToastStoreState>((set, get) => ({
  toasts: [],

  pushToast: (variant, message, options) => {
    const id = createToastId();
    const toast: ToastMessage = {
      id,
      variant,
      title: options?.title || DEFAULT_TITLES[variant],
      message,
      durationMs: options?.durationMs ?? DEFAULT_DURATIONS_MS[variant],
      createdAtMs: Date.now(),
    };

    set((state) => ({
      toasts: [...state.toasts, toast].slice(-4),
    }));

    return id;
  },

  success: (message, options) => get().pushToast('success', message, options),
  error: (message, options) => get().pushToast('error', message, options),
  info: (message, options) => get().pushToast('info', message, options),

  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),

  clearToasts: () => set({ toasts: [] }),
}));
