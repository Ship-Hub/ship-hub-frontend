import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { leaderboardApi, type LeaderboardEntry } from '../lib/api';
import { Layout } from '../components/Layout';
import { Trophy, GitFork, Users, BookOpen, Heart, Loader2, Zap } from 'lucide-react';

const MEDAL = ['🥇', '🥈', '🥉'];

function RepBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 4;
  return (
    <div className="h-1 rounded-full w-full mt-2" style={{ backgroundColor: 'var(--color-elevated)' }}>
      <div
        className="h-1 rounded-full transition-all"
        style={{
          width: `${pct}%`,
          background: 'linear-gradient(90deg, #7C3AED, #00E5FF)',
        }}
      />
    </div>
  );
}

export function LeaderboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => leaderboardApi.get().then(r => r.data),
  });

  const builders: LeaderboardEntry[] = data?.builders ?? [];
  const maxRep = builders[0]?.rep ?? 1;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy size={20} className="text-amber-400" />
            <h1 className="mono text-lg font-bold text-white">LEADERBOARD</h1>
          </div>
          <p className="text-xs text-slate-500">
            Ranked by rep score: forks×3 + followers×2 + memories + likes
          </p>
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 size={20} className="animate-spin text-violet-400" />
          </div>
        )}

        {/* Top 3 podium */}
        {!isLoading && builders.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[builders[1], builders[0], builders[2]].map((b, i) => {
              // order: 2nd, 1st, 3rd for podium effect
              const rank = i === 1 ? 0 : i === 0 ? 1 : 2;
              const isFirst = rank === 0;
              return (
                <Link
                  key={b.id}
                  to={`/u/${b.username}`}
                  className={`flex flex-col items-center text-center p-4 rounded-xl border transition-all hover:border-violet-500/30 ${isFirst ? 'relative -mt-3' : ''}`}
                  style={{ backgroundColor: 'var(--color-panel)', borderColor: isFirst ? 'rgba(139,92,246,0.3)' : 'var(--color-border)' }}
                >
                  <span className="text-2xl mb-2">{MEDAL[rank]}</span>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mono font-bold text-lg mb-2 flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #00E5FF)', color: 'white' }}
                  >
                    {b.username[0].toUpperCase()}
                  </div>
                  <div className="mono text-xs font-semibold text-white truncate w-full">@{b.username}</div>
                  <div className="mono text-sm font-bold mt-1" style={{ color: 'var(--color-violet)' }}>
                    {b.rep.toLocaleString()}
                  </div>
                  <div className="mono text-xs text-slate-600">REP</div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Full ranked list */}
        {!isLoading && builders.length > 0 && (
          <div className="space-y-2">
            {builders.map((b, idx) => (
              <Link
                key={b.id}
                to={`/u/${b.username}`}
                className="flex items-center gap-4 p-4 rounded-xl border transition-all hover:border-violet-500/30 group"
                style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}
              >
                {/* Rank */}
                <div className="w-8 flex-shrink-0 text-center">
                  {idx < 3
                    ? <span className="text-base">{MEDAL[idx]}</span>
                    : <span className="mono text-sm text-slate-500 font-semibold">{idx + 1}</span>
                  }
                </div>

                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center mono font-bold"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #00E5FF)', color: 'white' }}
                >
                  {b.username[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="mono text-sm font-semibold text-white group-hover:text-violet-300 transition-colors truncate">
                      {b.displayName ?? b.username}
                    </span>
                    <span className="mono text-xs text-slate-500 flex-shrink-0">@{b.username}</span>
                  </div>
                  {/* Stat chips */}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs mono text-slate-500">
                      <GitFork size={10} className="text-cyan-500" />{b.totalForks}
                    </span>
                    <span className="flex items-center gap-1 text-xs mono text-slate-500">
                      <Users size={10} className="text-violet-400" />{b.followerCount}
                    </span>
                    <span className="flex items-center gap-1 text-xs mono text-slate-500">
                      <BookOpen size={10} className="text-emerald-400" />{b.memoryCount}
                    </span>
                    <span className="flex items-center gap-1 text-xs mono text-slate-500">
                      <Heart size={10} className="text-pink-400" />{b.totalLikes}
                    </span>
                  </div>
                  <RepBar value={b.rep} max={maxRep} />
                </div>

                {/* Rep score */}
                <div className="flex-shrink-0 text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <Zap size={12} className="text-amber-400" />
                    <span className="mono text-sm font-bold text-white">{b.rep.toLocaleString()}</span>
                  </div>
                  <div className="mono text-xs text-slate-600 mt-0.5">REP</div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && builders.length === 0 && (
          <div className="text-center py-20">
            <Trophy size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="mono text-slate-400 text-sm">NO_BUILDERS_YET</p>
            <p className="text-slate-600 text-xs mt-1">Be the first to earn rep by publishing memories</p>
          </div>
        )}

      </div>
    </Layout>
  );
}
