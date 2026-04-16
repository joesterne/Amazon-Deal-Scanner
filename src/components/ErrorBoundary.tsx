import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let message = "Something went wrong. Please try refreshing the page.";
      
      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error && parsed.error.includes("insufficient permissions")) {
          message = "Access denied. Please make sure you are signed in and have correct permissions.";
        }
      } catch {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[40px] border border-[#E5E5E5] shadow-2xl max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-full mx-auto flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-serif italic text-black">App Encountered an Issue</h2>
              <p className="text-[#666] leading-relaxed">{message}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            >
              <RefreshCw className="w-5 h-5" /> Refresh App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
