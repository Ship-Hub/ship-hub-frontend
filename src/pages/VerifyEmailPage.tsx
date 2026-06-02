import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Zap, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { user, setAuth } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !token) { if (!token) setStatus('error'); return; }
    ran.current = true;

    authApi.verifyEmail(token)
      .then(async () => {
        // Refresh user in store so the banner disappears
        if (user) {
          const meRes = await authApi.me();
          setAuth(meRes.data.user, localStorage.getItem('shiphub_token')!);
        }
        setStatus('success');
      })
      .catch(err => {
        setErrorMsg(err.response?.data?.message ?? 'Invalid or expired verification link.');
        setStatus('error');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-base)' }}>
      <div className="w-full max-w-sm text-center">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}>
          <Zap size={22} className="text-white" />
        </div>

        {status === 'loading' && (
          <>
            <Loader2 size={28} className="animate-spin text-violet-400 mx-auto mb-4" />
            <p className="mono text-sm font-semibold text-white">VERIFYING_EMAIL</p>
            <p className="text-xs text-slate-500 mt-1">Just a moment...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-4" />
            <h1 className="mono text-lg font-bold text-white mb-2">EMAIL_VERIFIED</h1>
            <p className="text-sm text-slate-400 mb-6">Your email is confirmed. You're all set!</p>
            <Link to="/" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs mono font-semibold text-white hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}>
              GO_TO_FEED →
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={40} className="text-red-400 mx-auto mb-4" />
            <h1 className="mono text-lg font-bold text-white mb-2">VERIFICATION_FAILED</h1>
            <p className="text-sm text-slate-400 mb-6">{errorMsg || 'No token provided.'}</p>
            <div className="space-y-2">
              {user && (
                <ResendButton />
              )}
              <Link to="/" className="block text-xs mono text-slate-500 hover:text-white transition-colors">
                Back to feed
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResendButton() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const resend = async () => {
    setLoading(true);
    await authApi.resendVerification().catch(() => {});
    setSent(true);
    setLoading(false);
  };

  return sent ? (
    <p className="text-xs mono text-emerald-400">New verification email sent!</p>
  ) : (
    <button onClick={resend} disabled={loading}
      className="w-full py-2.5 rounded-lg text-xs mono font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-all"
      style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}>
      {loading ? 'SENDING...' : 'RESEND_VERIFICATION_EMAIL'}
    </button>
  );
}
