import { Component, ReactNode } from "react";
import { captureError } from "@/lib/monitoring";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackLevel?: "page" | "component";
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    captureError(error, {
      componentStack: errorInfo.componentStack || "",
      level: this.props.fallbackLevel || "page",
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/dashboard/chat";
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: "" });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Compact fallback for component-level errors
    if (this.props.fallbackLevel === "component") {
      return (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-xs text-destructive">Something went wrong</span>
          <button
            onClick={this.handleRetry}
            className="text-xs text-destructive underline hover:no-underline ml-auto"
          >
            Retry
          </button>
        </div>
      );
    }

    // Full-page fallback
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>

          <h1 className="text-xl font-bold text-foreground mb-2">
            Algo correu mal
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Ocorreu um erro inesperado. A nossa equipa foi notificada automaticamente.
          </p>

          {import.meta.env.DEV && this.state.error && (
            <div className="mb-6 p-3 rounded-lg bg-secondary/50 border border-border text-left">
              <p className="text-xs font-mono text-destructive mb-1">{this.state.error.name}</p>
              <p className="text-xs font-mono text-muted-foreground break-all">
                {this.state.error.message}
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
            <button
              onClick={this.handleGoHome}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-secondary transition-colors"
            >
              <Home className="h-4 w-4" />
              Ir para o Chat
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground/50 mt-8">
            Se o problema persistir, contacte o suporte.
          </p>
        </div>
      </div>
    );
  }
}

// Wrapper for individual components that might fail
export function SafeComponent({ children, name }: { children: ReactNode; name?: string }) {
  return (
    <ErrorBoundary fallbackLevel="component">
      {children}
    </ErrorBoundary>
  );
}
