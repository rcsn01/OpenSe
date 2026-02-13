export interface OpenSeErrorPayload {
  scope: 'auth'
  message: string
  error: unknown
}

declare global {
  interface Window {
    __OPENSE_REPORT_ERROR__?: (payload: OpenSeErrorPayload) => void
  }
}

export const reportAuthError = (message: string, error: unknown) => {
  const payload: OpenSeErrorPayload = {
    scope: 'auth',
    message,
    error,
  }

  console.error(message, error)

  if (typeof window === 'undefined') return

  window.dispatchEvent(new CustomEvent('opense:error', { detail: payload }))

  try {
    window.__OPENSE_REPORT_ERROR__?.(payload)
  } catch (reportError) {
    console.error('Auth error reporter failed', reportError)
  }
}
