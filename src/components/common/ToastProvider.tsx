import { Toaster } from 'react-hot-toast'
import { ReactNode } from 'react'

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--toast-text)',
            border: '1px solid var(--toast-border)',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          success: {
            iconTheme: {
              primary: 'var(--color-success)',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--color-error)',
              secondary: '#fff',
            },
          },
        }}
        containerStyle={{
          top: 20,
          right: 20,
        }}
      />
    </>
  )
}
