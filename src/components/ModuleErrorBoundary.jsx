/**
 * ModuleErrorBoundary - Catches errors in a single module (route) so one crash
 * doesn't take down the whole app. Shows a friendly message with "Try again"
 * (remounts children) and "Go to Home" (navigate). Use around main content in MainLayout.
 */
import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AlertTriangle, RefreshCw, Home, MessageCircle } from 'lucide-react'
import { askEchoAboutError } from '@/lib/echo-error-helper'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

export class ModuleErrorBoundaryClass extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryKey: 0,
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Module error boundary caught:', error, errorInfo)
    }
    this.setState({ error, errorInfo })
  }

  handleRetry = () => {
    this.setState((s) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryKey: s.retryKey + 1,
    }))
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full w-full min-h-0 p-4">
          <Card className="w-full max-w-lg border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-7 w-7 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-xl text-foreground">
                Something went wrong
              </CardTitle>
              <CardDescription>
                This section couldn't load. Try again or go back to the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-muted/50 border border-border rounded-lg p-3 text-xs overflow-auto max-h-24">
                  <pre className="whitespace-pre-wrap break-words text-muted-foreground">
                    {this.state.error.toString()}
                  </pre>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={this.handleRetry} className="flex-1 gap-2" variant="default">
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </Button>
                <Button
                  onClick={() => {
                    const error = this.state.error || new Error('Unknown module error')
                    askEchoAboutError(error, { module: 'unknown', action: 'loading module' })
                  }}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  Ask Echo
                </Button>
                <Button
                  onClick={() => this.props.onGoHome?.()}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
    return (
      <div key={this.state.retryKey} className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden [&>*]:flex-1 [&>*]:min-h-0 [&>*]:overflow-hidden">
        {this.props.children}
      </div>
    )
  }
}

export function ModuleErrorBoundary({ children, onGoHome }) {
  const navigate = useNavigate()
  const location = useLocation()
  const goHome = onGoHome ?? (() => navigate('/'))
  const errorBoundaryRef = React.useRef(null)
  
  // Reset error boundary when location changes
  React.useEffect(() => {
    if (errorBoundaryRef.current?.state?.hasError) {
      errorBoundaryRef.current.handleRetry()
    }
  }, [location.pathname])
  
  return (
    <ModuleErrorBoundaryClass ref={errorBoundaryRef} onGoHome={goHome}>
      {children}
    </ModuleErrorBoundaryClass>
  )
}

export default ModuleErrorBoundary
