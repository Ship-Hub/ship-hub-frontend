import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi, api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Zap, Database } from 'lucide-react';

async function redirectToMemoBank() {
  const state = crypto.randomUUID();
  sessionStorage.setItem('mb_oauth_state', state);
  const res = await api.get(`/auth/memobank/url?state=${state}`);
  window.location.href = res.data.url;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '', username: '', displayName: '' });
  const [error, setError] = useState('');

  const [mbLoading, setMbLoading] = useState(false);

  const registerMut = useMutation({
    mutationFn: (data: typeof form) => authApi.register(data),
    onSuccess: (res) => { setAuth(res.data.user, res.data.token); navigate('/onboarding'); },
    onError: (err: any) => setError(err.response?.data?.message ?? 'Registration failed'),
  });

  const handleMemoBank = async () => {
    setMbLoading(true);
    try { await redirectToMemoBank(); }
    catch { setMbLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-base)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}
          >
            <Zap size={22} className="text-white" />
          </div>
          <h1 className="mono text-xl font-bold text-white">SHIP_HUB</h1>
          <p className="text-slate-400 text-xs mt-1">Join the network for AI builders</p>
        </div>

        <div
          className="rounded-2xl border p-6"
          style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}
        >
          {/* Memo Bank SSO — OAuth redirect */}
          <button
            onClick={handleMemoBank}
            disabled={mbLoading}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-lg border text-xs mono font-semibold text-white transition-all hover:border-cyan-500/50 hover:bg-cyan-500/5 disabled:opacity-60 mb-5"
            style={{ borderColor: 'rgba(0,229,255,0.25)', backgroundColor: 'var(--color-elevated)' }}
          >
            <Database size={14} className="text-cyan-400" />
            {mbLoading ? 'REDIRECTING...' : 'CONTINUE_WITH_MEMO_BANK'}
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
            <span className="text-xs mono text-slate-600">OR</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
          </div>

          <h2 className="mono text-sm font-semibold text-white mb-4">CREATE_ACCOUNT</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs mono">
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); setError(''); registerMut.mutate(form); }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs mono text-slate-400 mb-1.5">USERNAME</label>
              <input
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-violet-500 transition-colors"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
                placeholder="coolbuilder"
                pattern="[a-zA-Z0-9_-]+"
                minLength={3}
                maxLength={50}
              />
            </div>
            <div>
              <label className="block text-xs mono text-slate-400 mb-1.5">DISPLAY_NAME</label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => setForm(f => ({ ...f, displayName: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-violet-500 transition-colors"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
                placeholder="Cool Builder"
              />
            </div>
            <div>
              <label className="block text-xs mono text-slate-400 mb-1.5">EMAIL</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-violet-500 transition-colors"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs mono text-slate-400 mb-1.5">PASSWORD</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-violet-500 transition-colors"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
                placeholder="min 8 characters"
              />
            </div>
            <button
              type="submit"
              disabled={registerMut.isPending}
              className="w-full py-2.5 rounded-lg text-xs mono font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}
            >
              {registerMut.isPending ? 'CREATING...' : 'CREATE_ACCOUNT'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mono mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 transition-colors">
              SIGN_IN
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
