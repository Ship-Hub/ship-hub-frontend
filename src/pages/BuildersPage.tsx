import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { leaderboardApi, usersApi } from '../lib/api';
import { Layout } from '../components/Layout';
import { Trophy, TrendingUp, Loader2 } from 'lucide-react';

export function BuildersPage() {
  const allTimeQ = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => leaderboardApi.get(50).then(r => r.data.builders),
    staleTime: 60_000,
  });

  const trendingQ = useQuery({
    queryKey: ['trending-builders'],
    queryFn: () => usersApi.trending().then(r => r.data.builders),
    staleTime: 60_000,
  });

  return (
    <Layout>
      <Helmet><title>Builders — ShipHub</title></Helmet>
      <div className="max-w-[680px] mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,77,77,0.1)', color: 'var(--color-accent)' }}>
            <Trophy size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Builders</h1>
            <p className="text-sm text-slate-500">The top people shipping on ShipHub</p>
          </div>
        </div>

        {/* Trending this week */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} style={{ color: 'var(--color-accent)' }} />
            <h2 className="font-semibold text-white">Trending This Week</h2>
          </div>
          {trendingQ.isLoading && <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-slate-600" /></div>}
          <div className="space-y-2">
            {(trendingQ.data ?? []).map((b, i) => (
              <BuilderRow key={b.id} builder={b} rank={i + 1} accent="var(--color-accent)" />
            ))}
          </div>
        </section>

        {/* All time */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={16} style={{ color: 'var(--color-amber)' }} />
            <h2 className="font-semibold text-white">All Time</h2>
          </div>
          {allTimeQ.isLoading && <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-slate-600" /></div>}
          <div className="space-y-2">
            {(allTimeQ.data ?? []).map((b, i) => (
              <BuilderRow key={b.id} builder={b as any} rank={i + 1} accent="var(--color-amber)" />
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}

function BuilderRow({ builder, rank, accent }: { builder: any; rank: number; accent: string }) {
  return (
    <Link to={`/u/${builder.username}`}
      className="flex items-center gap-4 p-3 rounded-xl border transition-all hover:bg-white/5 hover:border-slate-600"
      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
      <span className="text-sm font-bold w-6 text-center flex-shrink-0" style={{ color: rank <= 3 ? accent : 'var(--color-muted)' }}>
        {rank}
      </span>
      <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${accent}, var(--color-cyan))`, color: 'white' }}>
        {builder.avatar ? <img src={builder.avatar} alt={builder.username} className="w-full h-full object-cover" /> : builder.username[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white text-sm truncate">{builder.displayName || builder.username}</div>
        <div className="text-xs text-slate-500">@{builder.username}</div>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500 flex-shrink-0">
        <div className="text-center">
          <div className="font-semibold text-white">{builder.memoryCount ?? 0}</div>
          <div>Memories</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-white">{builder.followerCount}</div>
          <div>Followers</div>
        </div>
        {(builder.rep !== undefined) && (
          <div className="text-center">
            <div className="font-semibold" style={{ color: accent }}>{Math.round(builder.rep)}</div>
            <div>Rep</div>
          </div>
        )}
      </div>
    </Link>
  );
}
