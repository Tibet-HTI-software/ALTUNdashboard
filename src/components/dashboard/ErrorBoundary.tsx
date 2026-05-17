import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { translateStored } from "@/lib/dashboard/i18n";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Class-based Error Boundary for the dashboard shell.
 * Catches render errors thrown by any child route/component and shows a
 * recovery UI rather than a blank screen.
 *
 * Uses `translateStored()` (localStorage read) instead of `useT()` because
 * class components cannot call hooks. The translation is accurate at the
 * moment the error renders; a language change while the error is shown will
 * apply on the next "Try again" reset.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production, pipe to your error-tracking service here.
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      const title = translateStored("error.title");
      const fallback =
        this.state.error.message || translateStored("error.fallback");
      const tryAgain = translateStored("error.tryAgain");

      return (
        <div className="flex flex-col items-center justify-center flex-1 min-h-[60vh] gap-5 px-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/25">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </span>
          <div className="space-y-1 max-w-sm">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{fallback}</p>
          </div>
          <button
            type="button"
            onClick={this.reset}
            className="inline-flex items-center gap-2 h-9 rounded-lg bg-brand text-white px-4 text-sm font-semibold hover:bg-brand-strong transition-colors shadow-[0_4px_16px_-6px_var(--brand)]"
          >
            <RefreshCw className="h-4 w-4" />
            {tryAgain}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
