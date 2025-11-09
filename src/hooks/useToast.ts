import toast from 'react-hot-toast'

export interface ToastOptions {
  duration?: number
  icon?: string
  id?: string
}

export interface PromiseMessages<T> {
  loading: string
  success: string | ((data: T) => string)
  error: string | ((error: Error) => string)
}

export function useToast() {
  return {
    success: (message: string, options?: ToastOptions) => {
      return toast.success(message, options)
    },

    error: (message: string, options?: ToastOptions) => {
      return toast.error(message, options)
    },

    warning: (message: string, options?: ToastOptions) => {
      return toast(message, {
        ...options,
        icon: '⚠️',
        style: {
          border: '1px solid var(--color-warning)',
          background: 'var(--color-warning-bg)',
        },
      })
    },

    info: (message: string, options?: ToastOptions) => {
      return toast(message, {
        ...options,
        icon: 'ℹ️',
        style: {
          border: '1px solid var(--color-primary)',
        },
      })
    },

    promise: <T>(promise: Promise<T>, messages: PromiseMessages<T>) => {
      return toast.promise(promise, messages)
    },

    dismiss: (toastId?: string) => {
      toast.dismiss(toastId)
    },

    dismissAll: () => {
      toast.dismiss()
    },
  }
}
