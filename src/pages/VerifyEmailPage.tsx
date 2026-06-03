import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ backgroundColor: 'var(--color-base)' }}>
      <div className="w-full max-w-[360px]">

        <div className="flex justify-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-base"
              style={{ background: 'var(--color-accent)', boxShadow: '0 0 16px rgba(255,77,77,0.5)' }}>S</div>
            <span className="text-xl font-bold text-white tracking-tight">ShipHub</span>
          </Link>
        </div>

        <div className="rounded-2xl p-px"
          style={{ background: 'linear-gradient(135deg, rgba(255,77,77,0.5) 0%, rgba(255,77,77,0.1) 40%, rgba(0,229,255,0.1) 70%, rgba(0,229,255,0.4) 100%)' }}>
          <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--color-card)' }}>

            {status === 'loading' && (
              <>
                <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: 'var(--color-accent)' }} />
                <p className="font-semibold text-white text-base">Verifying your email</p>
                <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Just a moment...</p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle2 size={44} className="mx-auto mb-4" style={{ color: 'var(--color-success)' }} />
                <h1 className="text-xl font-bold text-white mb-2">Email verified!</h1>
                <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>Your account is confirmed. Start building.</p>
                <Link to="/" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white btn-primary w-full"
                  style={{ backgroundColor: 'var(--color-accent)' }}>
                  Go to feed →
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle size={44} className="mx-auto mb-4" style={{ color: 'var(--color-accent)' }} />
                <h1 className="text-xl font-bold text-white mb-2">Verification failed</h1>
                <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>{errorMsg || 'No token provided.'}</p>
                <div className="space-y-3">
                  {user && <ResendButton />}
                  <Link to="/" className="block text-sm transition-colors hover:text-slate-300" style={{ color: 'var(--color-muted)' }}>
                    Back to feed
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
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
    setSent(true); setLoading(false);
  };
  if (sent) return <p className="text-sm" style={{ color: 'var(--color-success)' }}>New verification email sent!</p>;
  return (
    <button onClick={resend} disabled={loading}
      className="btn-primary w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
      style={{ backgroundColor: 'var(--color-accent)' }}>
      {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" />Sending...</span> : 'Resend verification email'}
    </button>
  );
}
