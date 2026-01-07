import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    })
    console.error('Error caught by boundary:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    if (confirm('This will clear all wallet data. Continue?')) {
      localStorage.clear()
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2em',
          textAlign: 'center',
          background: '#1a1a1a',
          color: '#fff'
        }}>
          <div style={{ maxWidth: '500px' }}>
            <h1 style={{ fontSize: '3em', marginBottom: '0.3em' }}>⚠️</h1>
            <h2 style={{ marginBottom: '1em' }}>Something went wrong</h2>
            <p style={{ marginBottom: '2em', opacity: 0.8 }}>
              The app encountered an unexpected error. Try reloading, or reset your wallet data if the problem persists.
            </p>

            {this.state.error && (
              <details style={{
                marginBottom: '2em',
                textAlign: 'left',
                background: '#2a2a2a',
                padding: '1em',
                borderRadius: '8px',
                fontSize: '0.85em'
              }}>
                <summary style={{ cursor: 'pointer', marginBottom: '0.5em' }}>
                  Error Details
                </summary>
                <pre style={{
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo && '\n\n' + this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', gap: '1em', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '0.8em 1.5em',
                  fontSize: '1em',
                  background: '#FF8C00',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Reload App
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '0.8em 1.5em',
                  fontSize: '1em',
                  background: '#555',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Reset Wallet
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
