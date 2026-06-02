import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Loader2 } from 'lucide-react';
import logo from '../assets/logo.png';
import { MemoBankButton, useMemoOAuth } from '../components/MemoBankOAuth';

export function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '', username: '', displayName: '' });
  const [error, setError] = useState('');

  const { loading: mbLoading, launch } = useMemoOAuth({
    onSuccess: (user, token) => {
      setAuth(user, token);
      navigate(user ? '/onboarding' : '/');
    },
  });

  const registerMut = useMutation({
    mutationFn: (data: typeof form) => authApi.register(data),
    onSuccess: (res) => { setAuth(res.data.user, res.data.token); navigate('/onboarding'); },
    onError: (err: any) => setError(err.response?.data?.message ?? 'Registration failed'),
  });

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: 'var(--color-base)' }}>
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-4 group">
            <img
              src={logo}
              alt="ShipHub"
              className="w-40 h-40 object-contain group-hover:opacity-90 transition-opacity"
            />
            <h1 className="mono text-2xl font-bold text-white tracking-wide">SHIP_HUB</h1>
          </Link>
          <p className="text-slate-500 text-sm mt-2">Join the network for AI builders</p>
        </div>

        <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>

          <MemoBankButton loading={mbLoading} onClick={launch} label="SIGN_UP_WITH_MEMO_BANK" />

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
            <span className="text-xs mono text-slate-600">OR</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs mono">
              {error}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); setError(''); registerMut.mutate(form); }} className="space-y-4">
            <div>
              <label className="block text-xs mono text-slate-400 mb-1.5">USERNAME</label>
              <input
                type="text"
                required
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="coolbuilder"
                pattern="[a-zA-Z0-9_-]+"
                minLength={3}
                maxLength={50}
                autoComplete="username"
                className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none transition-colors"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
              />
            </div>
            <div>
              <label className="block text-xs mono text-slate-400 mb-1.5">DISPLAY_NAME</label>
              <input
                type="text"
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                placeholder="Cool Builder"
                className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none transition-colors"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
              />
            </div>
            <div>
              <label className="block text-xs mono text-slate-400 mb-1.5">EMAIL</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none transition-colors"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
              />
            </div>
            <div>
              <label className="block text-xs mono text-slate-400 mb-1.5">PASSWORD</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="min 8 characters"
                autoComplete="new-password"
                className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none transition-colors"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
              />
            </div>
            <button
              type="submit"
              disabled={registerMut.isPending}
              className="btn-primary w-full py-3 rounded-xl text-xs mono font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}
            >
              {registerMut.isPending
                ? <span className="flex items-center justify-center gap-2"><Loader2 size={13} className="animate-spin" />CREATING...</span>
                : 'CREATE_ACCOUNT'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mono mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">SIGN_IN</Link>
          </p>
        </div>

        <p className="text-center mt-5">
          <Link to="/" className="text-xs mono text-slate-600 hover:text-slate-400 transition-colors">
            ← Back to feed
          </Link>
        </p>
      </div>
    </div>
  );
}
