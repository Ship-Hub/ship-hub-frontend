import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { useState } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { MemoBankButton, useMemoOAuth } from '../components/MemoBankOAuth';

function ShipHubLogo() {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5 group">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-base flex-shrink-0 transition-all group-hover:scale-105"
        style={{ background: 'var(--color-accent)', boxShadow: '0 0 16px rgba(255,138,0,0.5), 0 0 32px rgba(255,138,0,0.2)' }}>
        S
      </div>
      <span className="text-xl font-bold text-white tracking-tight">ShipHub</span>
    </Link>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const { loading: mbLoading, launch } = useMemoOAuth({
    onSuccess: (user, token) => { setAuth(user, token); navigate('/'); },
  });

  const loginMut = useMutation({
    mutationFn: (data: typeof form) => authApi.login(data),
    onSuccess: (res) => { setAuth(res.data.user, res.data.token); navigate('/'); },
    onError: (err: any) => setError(err.response?.data?.message ?? 'Login failed. Check your credentials.'),
  });

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ backgroundColor: 'var(--color-base)' }}>
      <div className="w-full max-w-[360px]">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex flex-col items-center gap-3">
            <ShipHubLogo />
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>The home of builders</p>
          </div>
        </div>

        {/* Card with gradient border */}
        <div className="rounded-2xl p-px"
          style={{ background: 'linear-gradient(135deg, rgba(255,138,0,0.5) 0%, rgba(255,138,0,0.1) 40%, rgba(0,229,255,0.1) 70%, rgba(0,229,255,0.4) 100%)' }}>
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--color-card)' }}>

            <h2 className="text-lg font-bold text-white mb-5">Welcome back</h2>

            <MemoBankButton loading={mbLoading} onClick={launch} label="Continue with Memo Bank" />

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>or</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
            </div>

            {error && (
              <div className="mb-4 px-3 py-2.5 rounded-lg text-sm" style={{ backgroundColor: 'rgba(255,138,0,0.1)', color: 'var(--color-accent)', border: '1px solid rgba(255,138,0,0.2)' }}>
                {error}
              </div>
            )}

            <form onSubmit={e => { e.preventDefault(); setError(''); loginMut.mutate(form); }} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-muted)' }}>Email or username</label>
                <input
                  type="text" required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com or @username"
                  autoComplete="username"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--color-muted)' }}>Password</label>
                  <Link to="/forgot-password" className="text-xs font-medium transition-colors hover:opacity-80" style={{ color: 'var(--color-accent)' }}>
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} required
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full px-3 py-2.5 pr-10 rounded-xl border text-sm outline-none transition-colors"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)', color: 'var(--color-text)' }}
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--color-muted)' }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loginMut.isPending}
                className="btn-primary w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 mt-1"
                style={{ backgroundColor: 'var(--color-accent)' }}>
                {loginMut.isPending
                  ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" />Signing in...</span>
                  : 'Sign in'}
              </button>
            </form>

            <p className="text-center text-sm mt-5" style={{ color: 'var(--color-muted)' }}>
              No account?{' '}
              <Link to="/register" className="font-semibold transition-colors hover:opacity-80" style={{ color: 'var(--color-accent)' }}>
                Register
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center mt-4">
          <Link to="/" className="text-xs transition-colors hover:text-slate-300" style={{ color: 'var(--color-muted)' }}>
            ← Back to feed
          </Link>
        </p>
      </div>
    </div>
  );
}
