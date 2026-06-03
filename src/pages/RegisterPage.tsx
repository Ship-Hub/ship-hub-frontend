import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { MemoBankButton, useMemoOAuth } from '../components/MemoBankOAuth';

export function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '', username: '', displayName: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const { loading: mbLoading, launch } = useMemoOAuth({
    onSuccess: (user, token) => { setAuth(user, token); navigate('/onboarding'); },
  });

  const registerMut = useMutation({
    mutationFn: (data: typeof form) => authApi.register(data),
    onSuccess: (res) => { setAuth(res.data.user, res.data.token); navigate('/onboarding'); },
    onError: (err: any) => setError(err.response?.data?.message ?? 'Registration failed. Try a different username or email.'),
  });

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ backgroundColor: 'var(--color-base)' }}>
      <div className="w-full max-w-[360px]">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex flex-col items-center gap-3">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-base flex-shrink-0 transition-all group-hover:scale-105"
                style={{ background: 'var(--color-accent)', boxShadow: '0 0 16px rgba(255,77,77,0.5), 0 0 32px rgba(255,77,77,0.2)' }}>
                S
              </div>
              <span className="text-xl font-bold text-white tracking-tight">ShipHub</span>
            </Link>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Join the builder community</p>
          </div>
        </div>

        {/* Card with gradient border */}
        <div className="rounded-2xl p-px"
          style={{ background: 'linear-gradient(135deg, rgba(255,77,77,0.5) 0%, rgba(255,77,77,0.1) 40%, rgba(0,229,255,0.1) 70%, rgba(0,229,255,0.4) 100%)' }}>
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--color-card)' }}>

            <h2 className="text-lg font-bold text-white mb-5">Create your account</h2>

            <MemoBankButton loading={mbLoading} onClick={launch} label="Sign up with Memo Bank" />

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>or</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
            </div>

            {error && (
              <div className="mb-4 px-3 py-2.5 rounded-lg text-sm" style={{ backgroundColor: 'rgba(255,77,77,0.1)', color: 'var(--color-accent)', border: '1px solid rgba(255,77,77,0.2)' }}>
                {error}
              </div>
            )}

            <form onSubmit={e => { e.preventDefault(); setError(''); registerMut.mutate(form); }} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-muted)' }}>Username</label>
                <input
                  type="text" required
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="coolbuilder"
                  pattern="[a-zA-Z0-9_-]+"
                  minLength={3} maxLength={50}
                  autoComplete="username"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-muted)' }}>Display name <span className="font-normal opacity-60">(optional)</span></label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                  placeholder="Cool Builder"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-muted)' }}>Email</label>
                <input
                  type="email" required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-muted)' }}>Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} required
                    minLength={8}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="min 8 characters"
                    autoComplete="new-password"
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
              <button type="submit" disabled={registerMut.isPending}
                className="btn-primary w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 mt-1"
                style={{ backgroundColor: 'var(--color-accent)' }}>
                {registerMut.isPending
                  ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" />Creating account...</span>
                  : 'Create account'}
              </button>
            </form>

            <p className="text-center text-sm mt-5" style={{ color: 'var(--color-muted)' }}>
              Already a member?{' '}
              <Link to="/login" className="font-semibold transition-colors hover:opacity-80" style={{ color: 'var(--color-accent)' }}>
                Sign in
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
