import { Component, type ReactNode } from 'react';
import { Zap, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--color-base)' }}>
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}>
            <Zap size={22} className="text-white" />
          </div>
          <h1 className="mono text-lg font-bold text-white mb-2">SOMETHING_WENT_WRONG</h1>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs mono font-semibold text-white mx-auto hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}
          >
            <RefreshCw size={13} /> RELOAD_PAGE
          </button>
        </div>
      </div>
    );
  }
}
