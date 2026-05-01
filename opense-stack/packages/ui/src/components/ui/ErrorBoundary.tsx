import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './Button'

type ErrorBoundaryFallbackProps = {
  error: Error
  reset: () => void
}

type ErrorBoundaryProps = {
  children: ReactNode
  fallback?: ReactNode | ((props: ErrorBoundaryFallbackProps) => ReactNode)
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

type ErrorBoundaryState = {
  error: Error | null
}

const DefaultErrorFallback = ({ reset }: ErrorBoundaryFallbackProps) => (
  <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] flex items-center justify-center p-6">
    <div
      role="alert"
      className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-lg)]"
    >
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
        The app hit an unexpected error. Try again, or refresh the page if it
        keeps happening.
      </p>
      <div className="mt-4 flex justify-end">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  </div>
)

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    error: null,
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    const { children, fallback } = this.props
    const { error } = this.state

    if (error) {
      if (typeof fallback === 'function') {
        return fallback({ error, reset: this.reset })
      }

      if (fallback) {
        return fallback
      }

      return <DefaultErrorFallback error={error} reset={this.reset} />
    }

    return children
  }
}
