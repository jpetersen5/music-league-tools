import { Toaster } from 'react-hot-toast'
import { ReactNode } from 'react'

export interface ToastProviderProps {
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
            boxShadow: 'var(--toast-shadow)',
          },
          success: {
            iconTheme: {
              primary: 'var(--color-success)',
              secondary: 'var(--toast-icon-secondary)',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--color-error)',
              secondary: 'var(--toast-icon-secondary)',
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
