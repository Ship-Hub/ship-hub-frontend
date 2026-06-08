import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../lib/api';
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (!token) { setError('Missing reset token. Please use the link from your email.'); return; }
    setLoading(true); setError('');
    try { await authApi.resetPassword(token, password); setDone(true); setTimeout(() => navigate('/login'), 2500); }
    catch (err: any) { setError(err.response?.data?.message ?? 'The link may have expired.'); }
    finally { setLoading(false); }
  };

  const strength = password.length === 0 ? null : password.length < 8 ? 'weak' : password.length < 12 ? 'ok' : 'strong';
  const strengthStyle = { weak: { width: '33%', backgroundColor: 'var(--color-accent)' }, ok: { width: '66%', backgroundColor: 'var(--color-amber)' }, strong: { width: '100%', backgroundColor: 'var(--color-success)' } };

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
            {done ? (
              <div className="text-center py-4">
                <CheckCircle2 size={44} className="mx-auto mb-4" style={{ color: 'var(--color-success)' }} />
                <h2 className="text-xl font-bold text-white mb-2">Password updated!</h2>
                <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Redirecting to sign in...</p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-white mb-1">Set new password</h2>
                <p className="text-sm mb-5" style={{ color: 'var(--color-muted)' }}>Choose a strong password for your account.</p>

                {error && (
                  <div className="mb-4 px-3 py-2.5 rounded-lg text-sm" style={{ backgroundColor: 'rgba(255,138,0,0.1)', color: 'var(--color-accent)', border: '1px solid rgba(255,138,0,0.2)' }}>
                    {error}
                  </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-muted)' }}>New password</label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} required minLength={8}
                        value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="min 8 characters"
                        className="w-full pl-3 pr-10 py-2.5 rounded-xl border text-sm outline-none transition-colors"
                        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)', color: 'var(--color-text)' }} />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--color-muted)' }}>
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {strength && (
                      <div className="mt-1.5 h-1 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
                        <div className="h-1 rounded-full transition-all" style={strengthStyle[strength]} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-muted)' }}>Confirm password</label>
                    <input type={showPw ? 'text' : 'password'} required
                      value={confirm} onChange={e => setConfirm(e.target.value)}
                      placeholder="same password again"
                      className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors"
                      style={{ borderColor: confirm && confirm !== password ? 'rgba(255,138,0,0.5)' : 'var(--color-border)', backgroundColor: 'var(--color-elevated)', color: 'var(--color-text)' }} />
                    {confirm && confirm !== password && <p className="text-xs mt-1" style={{ color: 'var(--color-accent)' }}>Passwords don't match</p>}
                  </div>
                  <button type="submit" disabled={loading || password !== confirm || password.length < 8}
                    className="btn-primary w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                    style={{ backgroundColor: 'var(--color-accent)' }}>
                    {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" />Updating...</span> : 'Set new password'}
                  </button>
                </form>
              </>
            )}
            <div className="mt-5 text-center">
              <Link to="/login" className="text-sm transition-colors hover:text-slate-300" style={{ color: 'var(--color-muted)' }}>Back to sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
