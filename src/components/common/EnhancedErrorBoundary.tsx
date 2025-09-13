import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Bug,
  Wifi,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  eventId?: string;
  errorId?: string;
  retryCount: number;
  isOffline: boolean;
  showDetails: boolean;
}

interface EnhancedErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
  maxRetries?: number;
  showReportButton?: boolean;
}

interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: React.ErrorInfo;
  resetError: () => void;
  retryCount: number;
  canRetry: boolean;
  level: 'page' | 'section' | 'component';
}

class EnhancedErrorBoundary extends Component<EnhancedErrorBoundaryProps, EnhancedErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: EnhancedErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      isOffline: !navigator.onLine,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<EnhancedErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substring(2, 15),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Enhanced Error Boundary caught an error:', error, errorInfo);

    this.setState({
      errorInfo,
      isOffline: !navigator.onLine,
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logError(error, errorInfo);
    }
  }

  componentDidMount() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.retryTimeouts.forEach(clearTimeout);
  }

  private handleOnline = () => {
    this.setState({ isOffline: false });
    // Auto-retry if error was potentially network related
    if (this.state.hasError && this.isNetworkError(this.state.error)) {
      this.handleRetry();
    }
  };

  private handleOffline = () => {
    this.setState({ isOffline: true });
  };

  private isNetworkError = (error?: Error): boolean => {
    if (!error) return false;
    return (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('Failed to fetch') ||
      error.name === 'NetworkError' ||
      error.name === 'TypeError'
    );
  };

  private getErrorType = (error?: Error): string => {
    if (!error) return 'Unknown Error';

    if (this.isNetworkError(error)) return 'Network Error';
    if (error.name === 'ChunkLoadError') return 'Resource Loading Error';
    if (error.name === 'SyntaxError') return 'Syntax Error';
    if (error.message.includes('Cannot read prop')) return 'Data Error';
    if (error.message.includes('is not a function')) return 'Function Error';

    return error.name || 'Runtime Error';
  };

  private getErrorSeverity = (error?: Error): 'low' | 'medium' | 'high' => {
    if (!error) return 'medium';

    if (this.isNetworkError(error) && this.state.isOffline) return 'low';
    if (error.name === 'ChunkLoadError') return 'low';
    if (error.message.includes('Cannot read prop')) return 'high';

    return 'medium';
  };

  private logError = async (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      // In a real app, you would send this to your error tracking service
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        level: this.props.level || 'component',
      };

      console.log('Error logged:', errorData);

      // Example: Send to Sentry, LogRocket, etc.
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorData),
      // });
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  };

  private resetError = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      eventId: undefined,
      errorId: undefined,
      retryCount: 0,
      showDetails: false,
    });
  };

  private handleRetry = () => {
    const maxRetries = this.props.maxRetries || 3;

    if (this.state.retryCount >= maxRetries) {
      return;
    }

    this.setState(prev => ({ retryCount: prev.retryCount + 1 }));

    // Exponential backoff for retries
    const delay = Math.pow(2, this.state.retryCount) * 1000;

    const timeout = setTimeout(() => {
      this.resetError();
    }, delay);

    this.retryTimeouts.push(timeout);
  };

  private toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  private copyErrorInfo = () => {
    const errorInfo = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
    };

    navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2))
      .then(() => {
        // Could show a toast here
        console.log('Error info copied to clipboard');
      })
      .catch(console.error);
  };

  private getRecoveryActions = (): Array<{
    label: string;
    action: () => void;
    icon: React.ReactNode;
    variant?: 'default' | 'outline' | 'destructive';
    disabled?: boolean;
  }> => {
    const actions = [];
    const maxRetries = this.props.maxRetries || 3;
    const canRetry = this.state.retryCount < maxRetries;

    // Retry action
    if (canRetry) {
      actions.push({
        label: this.state.retryCount > 0 ? `Retry (${this.state.retryCount}/${maxRetries})` : 'Try Again',
        action: this.handleRetry,
        icon: <RefreshCw className="h-4 w-4" />,
        variant: 'default' as const,
      });
    }

    // Reset to home
    actions.push({
      label: 'Go Home',
      action: () => window.location.href = '/',
      icon: <Home className="h-4 w-4" />,
      variant: 'outline' as const,
    });

    // Reload page for page-level errors
    if (this.props.level === 'page') {
      actions.push({
        label: 'Reload Page',
        action: () => window.location.reload(),
        icon: <RefreshCw className="h-4 w-4" />,
        variant: 'outline' as const,
      });
    }

    return actions;
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            resetError={this.resetError}
            retryCount={this.state.retryCount}
            canRetry={this.state.retryCount < (this.props.maxRetries || 3)}
            level={this.props.level || 'component'}
          />
        );
      }

      const errorType = this.getErrorType(this.state.error);
      const severity = this.getErrorSeverity(this.state.error);
      const recoveryActions = this.getRecoveryActions();

      const containerClasses = cn(
        'flex items-center justify-center p-4',
        {
          'min-h-screen bg-background': this.props.level === 'page',
          'min-h-[400px]': this.props.level === 'section',
          'min-h-[200px]': this.props.level === 'component',
        }
      );

      return (
        <div className={containerClasses}>
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className={cn(
                  "p-3 rounded-full",
                  severity === 'high' && "bg-red-100 text-red-600",
                  severity === 'medium' && "bg-yellow-100 text-yellow-600",
                  severity === 'low' && "bg-blue-100 text-blue-600"
                )}>
                  {this.state.isOffline ? (
                    <Wifi className="h-8 w-8" />
                  ) : (
                    <AlertTriangle className="h-8 w-8" />
                  )}
                </div>
              </div>

              <CardTitle className="flex items-center justify-center gap-2">
                <span>Something went wrong</span>
                <Badge variant={severity === 'high' ? 'destructive' : 'secondary'}>
                  {errorType}
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {this.state.isOffline && (
                <Alert>
                  <Wifi className="h-4 w-4" />
                  <AlertDescription>
                    You appear to be offline. Please check your connection and try again.
                  </AlertDescription>
                </Alert>
              )}

              <p className="text-muted-foreground text-center">
                {this.isNetworkError(this.state.error) && this.state.isOffline
                  ? "This error might be due to network connectivity issues."
                  : "We encountered an unexpected error. Our team has been notified."
                }
              </p>

              {this.state.errorId && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    Error ID: <code className="bg-muted px-1 rounded">{this.state.errorId}</code>
                  </p>
                </div>
              )}

              {/* Error Details (Development/Debug) */}
              {(process.env.NODE_ENV === 'development' || this.props.showReportButton) && this.state.error && (
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={this.toggleDetails}
                    className="w-full justify-between"
                  >
                    Error Details
                    {this.state.showDetails ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>

                  {this.state.showDetails && (
                    <div className="mt-2 p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium">Error Information</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={this.copyErrorInfo}
                          className="h-6 px-2"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <pre className="text-xs overflow-auto max-h-32 bg-background p-2 rounded border">
                        {this.state.error.message}
                      </pre>
                      {this.state.error.stack && (
                        <details className="text-xs">
                          <summary className="cursor-pointer font-medium mb-1">Stack Trace</summary>
                          <pre className="overflow-auto max-h-32 bg-background p-2 rounded border whitespace-pre-wrap">
                            {this.state.error.stack}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Recovery Actions */}
              <div className="flex flex-wrap gap-2 justify-center">
                {recoveryActions.map((action, index) => (
                  <Button
                    key={index}
                    onClick={action.action}
                    variant={action.variant}
                    size="sm"
                    disabled={action.disabled}
                    className="flex items-center gap-2"
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </div>

              {/* Report Issue */}
              {this.props.showReportButton && (
                <div className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // In a real app, this would open a feedback form or redirect to support
                      const subject = encodeURIComponent(`Error Report: ${errorType}`);
                      const body = encodeURIComponent(
                        `Error ID: ${this.state.errorId}\nError: ${this.state.error?.message}\nURL: ${window.location.href}`
                      );
                      window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
                    }}
                    className="text-xs"
                  >
                    <Bug className="h-3 w-3 mr-1" />
                    Report Issue
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;
export type { EnhancedErrorBoundaryProps, ErrorFallbackProps };