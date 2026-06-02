import { useState, useEffect, useRef } from 'react';
import { api, authApi, type User } from '../lib/api';
import { Loader2 } from 'lucide-react';

const POPUP_W = 480;
const POPUP_H = 640;

interface UseMemoOAuthOptions {
  onSuccess: (user: User, token: string) => void;
  onError?: (msg: string) => void;
}

export function useMemoOAuth({ onSuccess, onError }: UseMemoOAuthOptions) {
  const [loading, setLoading] = useState(false);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      if (e.data?.type !== 'mb_oauth_success') return;
      const { token } = e.data;
      if (!token) return;

      // Exchange the token for a full user object
      try {
        // Store token temporarily so authApi.me() can use it
        localStorage.setItem('shiphub_token', token);
        const meRes = await authApi.me();
        onSuccess(meRes.data.user, token);
      } catch {
        localStorage.removeItem('shiphub_token');
        onError?.('Authentication failed. Please try again.');
      } finally {
        setLoading(false);
        popupRef.current?.close();
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onSuccess, onError]);

  const launch = async () => {
    setLoading(true);
    try {
      const state = crypto.randomUUID();
      sessionStorage.setItem('mb_oauth_state', state);
      const res = await api.get(`/auth/memobank/url?state=${state}`);
      const url = res.data.url;

      // Centre the popup on screen
      const left = Math.round(window.screenX + (window.outerWidth - POPUP_W) / 2);
      const top  = Math.round(window.screenY + (window.outerHeight - POPUP_H) / 2);

      const popup = window.open(
        url,
        'memo_bank_oauth',
        `width=${POPUP_W},height=${POPUP_H},left=${left},top=${top},` +
        `resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no`
      );

      if (!popup) {
        // Popup blocked — fall back to full-page redirect
        window.location.href = url;
        return;
      }

      popupRef.current = popup;

      // Detect if user closes popup without completing OAuth
      const pollClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollClosed);
          setLoading(false);
        }
      }, 500);
    } catch {
      setLoading(false);
      onError?.('Could not reach Memo Bank. Please try again.');
    }
  };

  return { loading, launch };
}

interface MemoBankButtonProps {
  loading: boolean;
  onClick: () => void;
  label?: string;
}

export function MemoBankButton({ loading, onClick, label = 'CONTINUE_WITH_MEMO_BANK' }: MemoBankButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm mono font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0c1628 100%)',
        border: '1px solid rgba(0,229,255,0.35)',
        boxShadow: '0 0 20px rgba(0,229,255,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin text-cyan-400" />
      ) : (
        /* Memo Bank logo mark */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="url(#mb-grad)" />
          <path d="M6 17V7l4 5 4-5v10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="mb-grad" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#00E5FF" />
            </linearGradient>
          </defs>
        </svg>
      )}
      <span style={{ color: loading ? '#64748b' : 'white' }}>
        {loading ? 'OPENING...' : label}
      </span>
      {!loading && (
        <span className="ml-auto text-xs" style={{ color: 'rgba(0,229,255,0.5)' }}>↗</span>
      )}
    </button>
  );
}
