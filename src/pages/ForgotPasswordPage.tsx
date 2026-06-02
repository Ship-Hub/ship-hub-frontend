import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../lib/api';
import { Zap, CheckCircle2, ArrowLeft } from 'lucide-react';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-base)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}>
            <Zap size={22} className="text-white" />
          </div>
          <h1 className="mono text-xl font-bold text-white">SHIP_HUB</h1>
        </div>

        <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
          {sent ? (
            <div className="text-center">
              <CheckCircle2 size={36} className="text-emerald-400 mx-auto mb-4" />
              <h2 className="mono text-sm font-bold text-white mb-2">CHECK_YOUR_EMAIL</h2>
              <p className="text-xs text-slate-400 mb-5">
                If an account exists for <strong className="text-white">{email}</strong>, a password reset link is on its way. Check your inbox (and spam folder).
              </p>
              <p className="text-xs text-slate-500">The link expires in <strong className="text-slate-400">1 hour</strong>.</p>
            </div>
          ) : (
            <>
              <h2 className="mono text-sm font-semibold text-white mb-1">FORGOT_PASSWORD</h2>
              <p className="text-xs text-slate-500 mb-5">Enter your email and we'll send a reset link.</p>

              {error && <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs mono">{error}</div>}

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-xs mono text-slate-400 mb-1.5">EMAIL</label>
                  <input
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-violet-500 transition-colors"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-lg text-xs mono font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}>
                  {loading ? 'SENDING...' : 'SEND_RESET_LINK'}
                </button>
              </form>
            </>
          )}

          <div className="mt-5 text-center">
            <Link to="/login" className="flex items-center justify-center gap-1.5 text-xs mono text-slate-500 hover:text-white transition-colors">
              <ArrowLeft size={12} /> BACK_TO_LOGIN
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
