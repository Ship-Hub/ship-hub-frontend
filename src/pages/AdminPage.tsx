import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '../lib/api';
import { Layout } from '../components/Layout';
import { timeAgo } from '../lib/utils';
import { Shield, Users, BookOpen, MessageSquare, TrendingUp, Search, Ban, Trash2, Loader2, CheckCircle2 } from 'lucide-react';

export function AdminPage() {
  const qc = useQueryClient();
  const [userSearch, setUserSearch] = useState('');

  const statsQ = useQuery({ queryKey: ['admin-stats'], queryFn: () => adminApi.stats().then(r => r.data) });
  const usersQ = useQuery({ queryKey: ['admin-users', userSearch], queryFn: () => adminApi.users(userSearch).then(r => r.data) });

  const banMut = useMutation({
    mutationFn: ({ id, banned }: { id: string; banned: boolean }) => adminApi.ban(id, banned),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
  const roleMut = useMutation({
    mutationFn: ({ id, roles }: { id: string; roles: { platformAdmin?: boolean; communityAdmin?: boolean } }) => adminApi.roles(id, roles),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
  const muteMut = useMutation({
    mutationFn: ({ id, minutes }: { id: string; minutes: number | null }) => adminApi.muteCommunity(id, minutes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const stats = statsQ.data;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield size={20} className="text-slate-400" />
          <h1 className="mono text-lg font-bold text-white">ADMIN_PANEL</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Users,        label: 'TOTAL_USERS',    value: stats?.users,         color: 'text-slate-400' },
            { icon: BookOpen,     label: 'MEMORIES',       value: stats?.memories,      color: 'text-cyan-400' },
            { icon: MessageSquare,label: 'POSTS',          value: stats?.posts,         color: 'text-blue-400' },
            { icon: TrendingUp,   label: 'NEW_TODAY',      value: stats?.newUsersToday, color: 'text-emerald-400' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-xl border p-4 text-center" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <Icon size={18} className={`mx-auto mb-2 ${color}`} />
              <div className={`mono text-2xl font-bold ${color}`}>{value?.toLocaleString() ?? 'â€”'}</div>
              <div className="mono text-xs text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Users */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <Users size={14} className="text-slate-400" />
            <h2 className="mono text-sm font-semibold text-white">USERS</h2>
            <div className="ml-auto relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={userSearch} onChange={e => setUserSearch(e.target.value)}
                placeholder="Search username or email..."
                className="pl-7 pr-3 py-1.5 rounded-lg border text-xs text-white bg-transparent outline-none focus:border-slate-500 transition-colors"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)', width: '220px' }}
              />
            </div>
          </div>

          {usersQ.isLoading && <div className="flex justify-center py-8"><Loader2 size={16} className="animate-spin text-slate-400" /></div>}

          <div className="divide-y" style={{ '--tw-divide-color': 'var(--color-border)' } as any}>
            {(usersQ.data as any)?.users?.map((u: any) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link to={`/u/${u.username}`} className="mono text-sm font-semibold text-white hover:opacity-80 transition-colors">
                      @{u.username}
                    </Link>
                    {(u.isAdmin || u.platformAdmin) ? <span className="text-xs mono text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">PLATFORM_ADMIN</span> : null}
                    {u.communityAdmin ? <span className="text-xs mono text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">COMMUNITY_ADMIN</span> : null}
                    {u.banned ? <span className="text-xs mono text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">BANNED</span> : null}
                    {u.communityMutedUntil && new Date(u.communityMutedUntil) > new Date()
                      ? <span className="text-xs mono text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">CHAT_MUTED</span>
                      : null}
                    {u.emailVerified ? <CheckCircle2 size={12} className="text-emerald-400" /> : null}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{u.email} Â· {u.memoryCount} memories Â· joined {timeAgo(u.createdAt)}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  onClick={() => roleMut.mutate({ id: u.id, roles: { communityAdmin: !u.communityAdmin } })}
                  disabled={roleMut.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs mono font-medium border transition-all text-cyan-400 border-cyan-400/30 hover:bg-cyan-400/10 disabled:opacity-50"
                >
                  {u.communityAdmin ? 'REMOVE_COMMUNITY' : 'MAKE_COMMUNITY'}
                </button>
                <button
                  onClick={() => roleMut.mutate({ id: u.id, roles: { platformAdmin: !u.platformAdmin && !u.isAdmin } })}
                  disabled={roleMut.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs mono font-medium border transition-all text-amber-400 border-amber-400/30 hover:bg-amber-400/10 disabled:opacity-50"
                >
                  {(u.platformAdmin || u.isAdmin) ? 'REMOVE_PLATFORM' : 'MAKE_PLATFORM'}
                </button>
                <button
                  onClick={() => muteMut.mutate({ id: u.id, minutes: u.communityMutedUntil && new Date(u.communityMutedUntil) > new Date() ? null : 60 })}
                  disabled={muteMut.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs mono font-medium border transition-all text-orange-400 border-orange-400/30 hover:bg-orange-400/10 disabled:opacity-50"
                >
                  {u.communityMutedUntil && new Date(u.communityMutedUntil) > new Date() ? 'UNMUTE_CHAT' : 'MUTE_1H'}
                </button>
                {!u.isAdmin && !u.platformAdmin && (
                  <button
                    onClick={() => banMut.mutate({ id: u.id, banned: !u.banned })}
                    disabled={banMut.isPending}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs mono font-medium transition-all ${
                      u.banned
                        ? 'text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/10'
                        : 'text-red-400 border border-red-400/30 hover:bg-red-400/10'
                    }`}
                  >
                    <Ban size={11} />
                    {u.banned ? 'UNBAN' : 'BAN'}
                  </button>
                )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
