import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Loader2, AlertCircle } from 'lucide-react';
import { useState } from 'react';

export function MemoBankCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const oauthError = searchParams.get('error');

    if (oauthError === 'access_denied') {
      navigate('/login');
      return;
    }

    if (!code) {
      setError('No authorization code received from Memo Bank.');
      return;
    }

    // Optional: verify state matches what we stored
    const savedState = sessionStorage.getItem('mb_oauth_state');
    if (savedState && state && savedState !== state) {
      setError('OAuth state mismatch. Please try again.');
      return;
    }
    sessionStorage.removeItem('mb_oauth_state');

    // Exchange code via ShipHub backend
    api.get(`/auth/memobank/callback?code=${code}`)
      .then(res => {
        setAuth(res.data.user, res.data.token);
        navigate(res.data.isNew ? '/onboarding' : '/', { replace: true });
      })
      .catch(err => {
        setError(err.response?.data?.message ?? 'Authentication failed. Please try again.');
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-base)' }}>
      <div className="text-center">
        {error ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-500/10 border border-red-500/20">
              <AlertCircle size={22} className="text-red-400" />
            </div>
            <div>
              <p className="mono text-sm font-semibold text-white mb-1">AUTH_FAILED</p>
              <p className="text-xs text-slate-500 max-w-xs">{error}</p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2 rounded-lg text-xs mono font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}
            >
              BACK_TO_LOGIN
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #00E5FF 100%)' }}
            >
              <Loader2 size={22} className="text-white animate-spin" />
            </div>
            <div>
              <p className="mono text-sm font-semibold text-white mb-1">SIGNING_IN</p>
              <p className="text-xs text-slate-500">Completing Memo Bank authentication...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
