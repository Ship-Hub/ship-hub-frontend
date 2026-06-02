import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Loader2, AlertCircle } from 'lucide-react';
import { useState } from 'react';

const isPopup = () => !!(window.opener && window.opener !== window);

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
      if (isPopup()) { window.close(); return; }
      navigate('/login');
      return;
    }

    if (!code) {
      setError('No authorization code received from Memo Bank.');
      return;
    }

    const savedState = sessionStorage.getItem('mb_oauth_state');
    if (savedState && state && savedState !== state) {
      setError('OAuth state mismatch. Please try again.');
      return;
    }
    sessionStorage.removeItem('mb_oauth_state');

    api.get(`/auth/memobank/callback?code=${code}`)
      .then(res => {
        const { token, user } = res.data;

        if (isPopup()) {
          // Running in OAuth popup — message the opener then close
          window.opener.postMessage({ type: 'mb_oauth_success', token, user }, window.location.origin);
          window.close();
        } else {
          // Full-page redirect flow (fallback when popup was blocked)
          setAuth(user, token);
          navigate(res.data.isNew ? '/onboarding' : '/', { replace: true });
        }
      })
      .catch(err => {
        const msg = err.response?.data?.message ?? 'Authentication failed. Please try again.';
        if (isPopup()) {
          setError(msg); // Show error in popup so user can see it before closing
        } else {
          setError(msg);
        }
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-base)' }}>
      <div className="text-center px-6">
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
              onClick={() => isPopup() ? window.close() : navigate('/login')}
              className="px-5 py-2 rounded-lg text-xs mono font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}
            >
              {isPopup() ? 'CLOSE' : 'BACK_TO_LOGIN'}
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
