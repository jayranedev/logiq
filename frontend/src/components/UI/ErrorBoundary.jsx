import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
        <AlertTriangle size={28} className="text-red-400" />
        <div className="text-sm font-medium text-slate-200">
          {this.props.label || "Something went wrong"}
        </div>
        <div className="text-[11px] text-slate-500 max-w-[200px] leading-relaxed">
          {this.state.error?.message || "Unexpected error in this panel"}
        </div>
        <button
          onClick={() => this.setState({ hasError: false, error: null })}
          className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 bg-slate-800 border border-slate-700/60 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <RefreshCw size={11} />
          Retry
        </button>
      </div>
    );
  }
}
