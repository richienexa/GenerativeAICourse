import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-lg font-semibold text-on-surface">Algo salió mal</p>
          <p className="max-w-md text-sm text-on-surface-variant">
            {this.state.error.message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
