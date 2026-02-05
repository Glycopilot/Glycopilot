export type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
  title: string;
  message: string;
  type?: ToastType;
  duration?: number;
}
