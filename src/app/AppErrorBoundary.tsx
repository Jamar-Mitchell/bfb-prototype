import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('BFB application error', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error" role="alert">
          <div>
            <span>BFB</span>
            <h1>Something went wrong.</h1>
            <p>Refresh the page to try again. Your account data has not been changed.</p>
            <button type="button" onClick={() => window.location.reload()}>
              Refresh BFB
            </button>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}

