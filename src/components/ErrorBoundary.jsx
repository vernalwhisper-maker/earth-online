import { Component } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Allow custom fallback via props
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="min-h-[100dvh] flex flex-col items-center justify-center px-6 bg-canvas-warm text-center"
        >
          <div className="w-16 h-16 rounded-xl bg-rose/10 flex items-center justify-center mb-5">
            <AlertTriangle size={28} className="text-rose" />
          </div>
          <h1 className="text-[1.25rem] font-bold text-deep-ink mb-2">
            出了点问题
          </h1>
          <p className="text-sm text-warm-steel mb-6 max-w-xs leading-relaxed">
            应用中发生了意外错误，请尝试刷新页面后继续使用
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald text-white rounded-btn text-sm font-medium hover:bg-emerald-dark transition-colors"
            >
              <RotateCcw size={16} />
              重试
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-5 py-2.5 border border-scribe text-warm-steel rounded-btn text-sm hover:bg-surface transition-colors"
            >
              刷新页面
            </button>
          </div>
          {this.props.showError && this.state.error && (
            <details className="mt-8 max-w-md w-full">
              <summary className="text-xs font-mono text-faded-slate cursor-pointer hover:text-warm-steel">
                错误详情
              </summary>
              <pre className="mt-2 p-3 bg-surface border border-scribe rounded-card text-[0.6875rem] font-mono text-rose text-left overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </motion.div>
      );
    }

    return this.props.children;
  }
}