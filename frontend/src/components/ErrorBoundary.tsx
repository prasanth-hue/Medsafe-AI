import { Component, ErrorInfo, ReactNode } from "react";

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
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("MedSafe AI ErrorBoundary caught an exception:", error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem("medsafe_mock_dashboard");
      localStorage.removeItem("medsafe_mock_patients");
    } catch {}
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#060709] text-white flex flex-col items-center justify-center p-6 selection:bg-[#00F2FE]/20 selection:text-[#00F2FE]">
          <div className="max-w-md w-full border border-white/10 bg-[#0E0F16] rounded-2xl p-8 shadow-2xl text-center space-y-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <span className="text-xl">⚡</span>
            </div>

            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-2">
                [ MEDSAFE // SYSTEM TELEMETRY RECOVERY ]
              </div>
              <h2 className="font-display text-2xl font-black uppercase text-white">
                Interface Recovered
              </h2>
              <p className="mt-2 text-xs text-neutral-400 font-sans leading-relaxed">
                A rendering anomaly was safely captured. Click below to re-initialize the clinical workspace.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-lg bg-black/50 border border-white/10 font-mono text-[11px] text-rose-300 text-left overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3 px-4 rounded-xl bg-white text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors shadow-lg active:scale-98"
            >
              Re-initialize Workspace
            </button>

            <div className="font-mono text-[10px] text-white/40 pt-4 border-t border-white/10">
              @all rights are reserved
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
