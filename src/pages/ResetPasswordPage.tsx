import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../lib/api';
import { Zap, CheckCircle2, Eye, EyeOff } from 'lucide-react';

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

    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Something went wrong. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const strength = password.length === 0 ? null : password.length < 8 ? 'weak' : password.length < 12 ? 'ok' : 'strong';
  const strengthColor = { weak: 'bg-red-500', ok: 'bg-amber-400', strong: 'bg-emerald-400' };
  const strengthWidth = { weak: 'w-1/3', ok: 'w-2/3', strong: 'w-full' };

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
          {done ? (
            <div className="text-center">
              <CheckCircle2 size={36} className="text-emerald-400 mx-auto mb-4" />
              <h2 className="mono text-sm font-bold text-white mb-2">PASSWORD_RESET</h2>
              <p className="text-xs text-slate-400">Redirecting to login...</p>
            </div>
          ) : (
            <>
              <h2 className="mono text-sm font-semibold text-white mb-1">NEW_PASSWORD</h2>
              <p className="text-xs text-slate-500 mb-5">Choose a strong password for your account.</p>

              {error && <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs mono">{error}</div>}

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-xs mono text-slate-400 mb-1.5">NEW_PASSWORD</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'} required minLength={8}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="min 8 characters"
                      className="w-full pl-3 pr-10 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-violet-500 transition-colors"
                      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {strength && (
                    <div className="mt-1.5 h-1 rounded-full w-full" style={{ backgroundColor: 'var(--color-elevated)' }}>
                      <div className={`h-1 rounded-full transition-all ${strengthColor[strength]} ${strengthWidth[strength]}`} />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs mono text-slate-400 mb-1.5">CONFIRM_PASSWORD</label>
                  <input
                    type={showPw ? 'text' : 'password'} required
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="same password again"
                    className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-violet-500 transition-colors"
                    style={{
                      borderColor: confirm && confirm !== password ? 'rgba(239,68,68,0.5)' : 'var(--color-border)',
                      backgroundColor: 'var(--color-elevated)',
                    }}
                  />
                  {confirm && confirm !== password && <p className="text-xs text-red-400 mono mt-1">Passwords don't match</p>}
                </div>

                <button type="submit" disabled={loading || password !== confirm || password.length < 8}
                  className="w-full py-2.5 rounded-lg text-xs mono font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}>
                  {loading ? 'RESETTING...' : 'SET_NEW_PASSWORD'}
                </button>
              </form>
            </>
          )}

          <div className="mt-5 text-center">
            <Link to="/login" className="text-xs mono text-slate-500 hover:text-white transition-colors">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
