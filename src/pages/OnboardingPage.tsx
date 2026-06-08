import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi, leaderboardApi, authApi, type LeaderboardEntry } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Zap, CheckCircle2, ArrowRight, Users, BookOpen, UserCircle, GitBranch } from 'lucide-react';

const STEPS = [
  { key: 'profile', label: 'Profile', icon: UserCircle },
  { key: 'memory',  label: 'Memory',  icon: BookOpen },
  { key: 'follow',  label: 'Follow',  icon: Users },
];

export function OnboardingPage() {
  const { user, setAuth } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [followed, setFollowed] = useState<Set<string>>(new Set());

  const [profile, setProfile] = useState({
    displayName: user?.displayName ?? '',
    bio: '',
    website: '',
    githubUsername: '',
  });

  // Leaderboard for "follow builders" step — exclude self
  const { data: lbData } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => leaderboardApi.get(10).then(r => r.data),
  });
  const suggestions = (lbData?.builders ?? [])
    .filter((b: LeaderboardEntry) => b.id !== user?.id)
    .slice(0, 5);

  const profileMut = useMutation({
    mutationFn: () => usersApi.update(profile),
    onSuccess: async () => {
      const meRes = await authApi.me();
      setAuth(meRes.data.user, localStorage.getItem('shiphub_token')!);
      setStep(1);
    },
  });

  const followMut = useMutation({
    mutationFn: (username: string) => usersApi.follow(username),
    onSuccess: (_, username) => setFollowed(prev => new Set([...prev, username])),
  });

  const finish = () => navigate('/');

  const totalSteps = STEPS.length;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: 'var(--color-base)' }}>
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'var(--color-accent)' }}
          >
            <Zap size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Welcome to ShipHub</h1>
          <p className="text-slate-400 text-xs mt-1">Let's get you set up in 3 quick steps</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <div key={s.key} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      done ? '' : active ? '' : 'opacity-30'
                    }`}
                    style={{
                      background: done
                        ? 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))'
                        : active
                        ? 'rgba(255,138,0,0.12)'
                        : 'var(--color-elevated)',
                      border: active ? '2px solid var(--color-accent)' : '2px solid transparent',
                    }}
                  >
                    {done
                      ? <CheckCircle2 size={18} className="text-white" />
                      : <Icon size={16} className={active ? 'text-slate-400' : 'text-slate-500'} />
                    }
                  </div>
                  <span className={`mono text-xs ${active ? 'opacity-80' : done ? 'text-slate-400' : 'text-slate-600'}`}>
                    {s.label.toUpperCase()}
                  </span>
                </div>
                {i < totalSteps - 1 && (
                  <div
                    className="w-16 h-0.5 mx-2 mb-4"
                    style={{ backgroundColor: i < step ? 'var(--color-accent)' : 'var(--color-border)' }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step panels */}
        <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>

          {/* Step 0 — Profile */}
          {step === 0 && (
            <div>
              <h2 className="mono text-sm font-bold text-white mb-1">COMPLETE_YOUR_PROFILE</h2>
              <p className="text-xs text-slate-500 mb-5">Tell the community who you are</p>

              <div className="space-y-4">
                {[
                  { key: 'displayName', label: 'DISPLAY_NAME', placeholder: 'Your name', type: 'text' },
                  { key: 'bio', label: 'BIO', placeholder: 'What do you build?', type: 'textarea' },
                  { key: 'website', label: 'WEBSITE', placeholder: 'https://yoursite.com', type: 'text' },
                  { key: 'githubUsername', label: 'GITHUB_USERNAME', placeholder: 'octocat', type: 'text' },
                ].map(({ key, label, placeholder, type }) => (
                  <div key={key}>
                    <label className="block text-xs mono text-slate-400 mb-1.5">{label}</label>
                    {type === 'textarea' ? (
                      <textarea
                        value={(profile as any)[key]}
                        onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                        rows={2}
                        placeholder={placeholder}
                        className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-slate-500 transition-colors resize-none"
                        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
                      />
                    ) : (
                      <input
                        value={(profile as any)[key]}
                        onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-slate-500 transition-colors"
                        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => profileMut.mutate()}
                  disabled={profileMut.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs mono font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--color-accent)' }}
                >
                  {profileMut.isPending ? 'SAVING...' : 'SAVE_AND_CONTINUE'}
                  <ArrowRight size={13} />
                </button>
                <button onClick={() => setStep(1)} className="text-xs mono text-slate-500 hover:text-slate-300 transition-colors">
                  skip
                </button>
              </div>
            </div>
          )}

          {/* Step 1 — Publish memory */}
          {step === 1 && (
            <div>
              <h2 className="mono text-sm font-bold text-white mb-1">PUBLISH_YOUR_FIRST_MEMORY</h2>
              <p className="text-xs text-slate-500 mb-6">Share a prompt, workflow, or pattern you use when building with AI</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <Link
                  to="/publish"
                  className="flex flex-col items-center gap-3 p-5 rounded-xl border text-center transition-all hover:border-slate-500/50"
                  style={{ backgroundColor: 'var(--color-elevated)', borderColor: 'var(--color-border)' }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(0,229,255,0.1))' }}>
                    <BookOpen size={18} className="text-slate-400" />
                  </div>
                  <div>
                    <div className="mono text-xs font-semibold text-white mb-0.5">CREATE_MEMORY</div>
                    <div className="text-xs text-slate-500">Write a new one</div>
                  </div>
                </Link>
                <Link
                  to="/publish"
                  className="flex flex-col items-center gap-3 p-5 rounded-xl border text-center transition-all hover:border-cyan-500/50"
                  style={{ backgroundColor: 'var(--color-elevated)', borderColor: 'var(--color-border)' }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(124,58,237,0.1))' }}>
                    <GitBranch size={18} className="text-cyan-400" />
                  </div>
                  <div>
                    <div className="mono text-xs font-semibold text-white mb-0.5">IMPORT_FROM_MB</div>
                    <div className="text-xs text-slate-500">Bring from Memo Bank</div>
                  </div>
                </Link>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="text-xs mono text-slate-500 hover:text-slate-300 transition-colors"
                >
                  skip for now →
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Follow builders */}
          {step === 2 && (
            <div>
              <h2 className="mono text-sm font-bold text-white mb-1">FOLLOW_SOME_BUILDERS</h2>
              <p className="text-xs text-slate-500 mb-5">
                Personalise your feed by following{' '}
                <span className={followed.size >= 3 ? 'text-emerald-400' : 'text-slate-400'}>
                  {followed.size}/3
                </span>
                {' '}builders (or more!)
              </p>

              <div className="space-y-2 mb-6">
                {suggestions.length === 0 && (
                  <p className="text-xs mono text-slate-600 text-center py-4">No builders yet — you'll be the first!</p>
                )}
                {suggestions.map((b: LeaderboardEntry) => {
                  const isFollowed = followed.has(b.username);
                  return (
                    <div
                      key={b.id}
                      className="flex items-center gap-3 p-3 rounded-xl border"
                      style={{ backgroundColor: 'var(--color-elevated)', borderColor: isFollowed ? 'rgba(139,92,246,0.3)' : 'var(--color-border)' }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center mono font-bold text-sm"
                        style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))', color: 'white' }}
                      >
                        {b.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="mono text-xs font-semibold text-white truncate">
                          {b.displayName ?? b.username}
                        </div>
                        <div className="text-xs mono text-slate-500">@{b.username} · {b.memoryCount} memories</div>
                      </div>
                      <button
                        onClick={() => {
                          if (!isFollowed) followMut.mutate(b.username);
                        }}
                        disabled={isFollowed}
                        className={`px-3 py-1.5 rounded-lg text-xs mono font-semibold transition-all flex-shrink-0 ${
                          isFollowed
                            ? 'text-emerald-400 border border-emerald-400/30'
                            : 'text-white hover:opacity-90'
                        }`}
                        style={!isFollowed ? { background: 'var(--color-accent)' } : {}}
                      >
                        {isFollowed ? '✓ FOLLOWING' : 'FOLLOW'}
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={finish}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs mono font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'var(--color-accent)' }}
              >
                {followed.size >= 3 ? 'LETS_GO' : 'ENTER_SHIP_HUB'}
                <ArrowRight size={13} />
              </button>
            </div>
          )}

        </div>

        {/* Skip all */}
        {step < 2 && (
          <p className="text-center mt-4">
            <button onClick={finish} className="text-xs mono text-slate-600 hover:text-slate-400 transition-colors">
              skip onboarding entirely
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
