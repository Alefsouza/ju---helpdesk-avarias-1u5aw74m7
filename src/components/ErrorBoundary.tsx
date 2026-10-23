import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro de renderização:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-slate-900">Ocorreu um erro inesperado</h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Não foi possível carregar esta tela. Você pode tentar recarregar a visualização ou
                voltar para a página inicial.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-slate-100 p-2.5 rounded text-xs text-slate-600 font-mono text-left max-h-24 overflow-y-auto break-all">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
              <Button
                variant="outline"
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </Button>
              <Button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Voltar ao início
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
