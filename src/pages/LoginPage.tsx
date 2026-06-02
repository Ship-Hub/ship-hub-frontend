import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi, api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Loader2 } from 'lucide-react';
import logo from '../assets/logo.png';
import { MemoBankButton, useMemoOAuth } from '../components/MemoBankOAuth';

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const { loading: mbLoading, launch } = useMemoOAuth({
    onSuccess: (user, token) => { setAuth(user, token); navigate('/'); },
  });

  const loginMut = useMutation({
    mutationFn: (data: typeof form) => authApi.login(data),
    onSuccess: (res) => { setAuth(res.data.user, res.data.token); navigate('/'); },
    onError: (err: any) => setError(err.response?.data?.message ?? 'Login failed'),
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-base)' }}>
      <div className="w-full max-w-sm">

        {/* Logo + back to home */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-3 group">
            <img src={logo} alt="ShipHub" className="w-12 h-12 object-contain group-hover:opacity-80 transition-opacity" />
            <h1 className="mono text-xl font-bold text-white">SHIP_HUB</h1>
          </Link>
          <p className="text-slate-400 text-xs mt-1">The network for AI builders</p>
        </div>

        <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>

          {/* MemoBank SSO — primary CTA */}
          <MemoBankButton loading={mbLoading} onClick={launch} label="CONTINUE_WITH_MEMO_BANK" />

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
            <span className="text-xs mono text-slate-600">OR</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
          </div>

          <h2 className="mono text-sm font-semibold text-white mb-4">SIGN_IN</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs mono">
              {error}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); setError(''); loginMut.mutate(form); }} className="space-y-4">
            <div>
              <label className="block text-xs mono text-slate-400 mb-1.5">EMAIL</label>
              <input type="email" required value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-violet-500 transition-colors"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs mono text-slate-400">PASSWORD</label>
                <Link to="/forgot-password" className="text-xs mono text-slate-500 hover:text-violet-400 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input type="password" required value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-violet-500 transition-colors"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }} />
            </div>
            <button type="submit" disabled={loginMut.isPending}
              className="w-full py-2.5 rounded-lg text-xs mono font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}>
              {loginMut.isPending
                ? <span className="flex items-center justify-center gap-2"><Loader2 size={13} className="animate-spin" />SIGNING_IN...</span>
                : 'SIGN_IN'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mono mt-4">
            No account?{' '}
            <Link to="/register" className="text-violet-400 hover:text-violet-300 transition-colors">REGISTER</Link>
          </p>
        </div>

        <p className="text-center mt-4">
          <Link to="/" className="text-xs mono text-slate-600 hover:text-slate-400 transition-colors">
            ← Back to feed
          </Link>
        </p>
      </div>
    </div>
  );
}
