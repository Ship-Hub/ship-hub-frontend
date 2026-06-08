import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../lib/api';
import { CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try { await authApi.forgotPassword(email); setSent(true); }
    catch (err: any) { setError(err.response?.data?.message ?? 'Something went wrong.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ backgroundColor: 'var(--color-base)' }}>
      <div className="w-full max-w-[360px]">

        <div className="flex justify-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-base"
              style={{ background: 'var(--color-accent)', boxShadow: '0 0 16px rgba(255,138,0,0.5)' }}>S</div>
            <span className="text-xl font-bold text-white tracking-tight">ShipHub</span>
          </Link>
        </div>

        <div className="rounded-2xl p-px"
          style={{ background: 'linear-gradient(135deg, rgba(255,138,0,0.5) 0%, rgba(255,138,0,0.1) 40%, rgba(0,229,255,0.1) 70%, rgba(0,229,255,0.4) 100%)' }}>
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--color-card)' }}>
            {sent ? (
              <div className="text-center py-4">
                <CheckCircle2 size={40} className="mx-auto mb-4" style={{ color: 'var(--color-success)' }} />
                <h2 className="text-base font-bold text-white mb-2">Check your email</h2>
                <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
                  If an account exists for <strong className="text-white">{email}</strong>, a reset link is on its way.
                </p>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>The link expires in 1 hour.</p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-white mb-1">Reset password</h2>
                <p className="text-sm mb-5" style={{ color: 'var(--color-muted)' }}>Enter your email and we'll send a reset link.</p>

                {error && (
                  <div className="mb-4 px-3 py-2.5 rounded-lg text-sm" style={{ backgroundColor: 'rgba(255,138,0,0.1)', color: 'var(--color-accent)', border: '1px solid rgba(255,138,0,0.2)' }}>
                    {error}
                  </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-muted)' }}>Email address</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors"
                      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)', color: 'var(--color-text)' }} />
                  </div>
                  <button type="submit" disabled={loading}
                    className="btn-primary w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                    style={{ backgroundColor: 'var(--color-accent)' }}>
                    {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" />Sending...</span> : 'Send reset link'}
                  </button>
                </form>
              </>
            )}

            <div className="mt-5 text-center">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-sm transition-colors hover:text-slate-300" style={{ color: 'var(--color-muted)' }}>
                <ArrowLeft size={13} /> Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
