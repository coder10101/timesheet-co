import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
            <AlertCircle size={28} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Something went wrong loading this view
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {this.state.error?.message || "An unexpected error occurred while rendering the page."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              <RefreshCw size={14} />
              <span>Reload Page</span>
            </button>
            <Link
              to="/projects"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/95 transition-all shadow-xs"
            >
              <ArrowLeft size={14} />
              <span>Back to Projects</span>
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
