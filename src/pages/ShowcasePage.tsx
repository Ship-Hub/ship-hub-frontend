import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersApi, memoriesApi, projectsApi, leaderboardApi } from '../lib/api';
import { Layout } from '../components/Layout';
import { cn, CATEGORY_COLORS, timeAgo } from '../lib/utils';
import { Globe, GitBranch, Loader2, Zap, GitFork, Heart, BookOpen, Users, FolderKanban, Trophy, ExternalLink } from 'lucide-react';

export function ShowcasePage() {
  const { username } = useParams<{ username: string }>();

  const profileQ = useQuery({ queryKey: ['profile', username], queryFn: () => usersApi.profile(username!).then(r => r.data.user) });
  const memoriesQ = useQuery({ queryKey: ['user-memories', username], queryFn: () => memoriesApi.byUser(username!).then(r => r.data.memories) });
  const projectsQ = useQuery({ queryKey: ['user-projects', username], queryFn: () => projectsApi.byUser(username!).then(r => r.data.projects) });
  const lbQ = useQuery({ queryKey: ['leaderboard'], queryFn: () => leaderboardApi.get(200).then(r => r.data) });

  const isLoading = profileQ.isLoading || memoriesQ.isLoading;
  if (isLoading) return <Layout><div className="flex justify-center py-20"><Loader2 size={20} className="animate-spin text-violet-400" /></div></Layout>;

  const profile = profileQ.data;
  if (!profile) return <Layout><p className="text-center py-20 mono text-slate-500">USER_NOT_FOUND</p></Layout>;

  const allMemories = memoriesQ.data ?? [];
  const topMemories = [...allMemories].sort((a: any, b: any) => (b.likeCount + b.forkCount) - (a.likeCount + a.forkCount)).slice(0, 3);
  const topProject = projectsQ.data?.[0] ?? null;

  const lbEntry = lbQ.data?.builders?.find((b: any) => b.id === profile.id);
  const rep = lbEntry?.rep ?? 0;
  const rank = lbQ.data?.builders?.findIndex((b: any) => b.id === profile.id) ?? -1;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Back link */}
        <Link to={`/u/${username}`} className="flex items-center gap-1.5 text-xs mono text-slate-500 hover:text-white transition-colors mb-6">
          ← @{username}'s full profile
        </Link>

        {/* Hero card */}
        <div
          className="rounded-2xl p-8 mb-6 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(0,229,255,0.08) 100%)', border: '1px solid rgba(139,92,246,0.3)' }}
        >
          {/* Glow */}
          <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(ellipse at 50% 0%, #8B5CF6 0%, transparent 70%)' }} />

          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-3xl mono font-bold mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #7C3AED, #00E5FF)', color: 'white' }}>
              {profile.avatar ? <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" /> : profile.username[0].toUpperCase()}
            </div>

            <h1 className="mono text-2xl font-bold text-white mb-1">{profile.displayName ?? profile.username}</h1>
            <p className="mono text-sm text-slate-400 mb-3">@{profile.username}</p>

            {profile.bio && <p className="text-slate-300 text-sm leading-relaxed max-w-md mx-auto mb-4">{profile.bio}</p>}

            {/* Social links */}
            <div className="flex items-center justify-center gap-4 mb-4">
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs mono text-violet-400 hover:text-violet-300 transition-colors">
                  <Globe size={12} />{profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              {profile.githubUsername && (
                <a href={`https://github.com/${profile.githubUsername}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs mono text-slate-400 hover:text-white transition-colors">
                  <GitBranch size={12} />{profile.githubUsername}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { icon: Zap, label: 'REP', value: rep.toLocaleString(), color: 'text-amber-400' },
            { icon: Users, label: 'FOLLOWERS', value: profile.followerCount, color: 'text-violet-400' },
            { icon: BookOpen, label: 'MEMORIES', value: profile.memoryCount, color: 'text-cyan-400' },
            { icon: Trophy, label: 'RANK', value: rank >= 0 ? `#${rank + 1}` : '—', color: 'text-emerald-400' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-xl border p-3 text-center" style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
              <Icon size={16} className={cn('mx-auto mb-1.5', color)} />
              <div className={cn('mono text-lg font-bold', color)}>{value}</div>
              <div className="mono text-xs text-slate-600">{label}</div>
            </div>
          ))}
        </div>

        {/* Top memories */}
        {topMemories.length > 0 && (
          <div className="mb-8">
            <h2 className="mono text-sm font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen size={14} className="text-violet-400" /> TOP_MEMORIES
            </h2>
            <div className="space-y-3">
              {topMemories.map((memory: any) => {
                const cc = CATEGORY_COLORS[memory.category] ?? 'text-slate-400 bg-slate-400/10 border-slate-400/20';
                return (
                  <Link key={memory.id} to={`/memory/${memory.id}`}
                    className="flex items-start gap-3 p-4 rounded-xl border hover:border-violet-500/30 transition-all group"
                    style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('text-xs mono px-1.5 py-0.5 rounded border flex-shrink-0', cc)}>{memory.category.toUpperCase()}</span>
                      </div>
                      <h3 className="mono text-sm font-semibold text-white group-hover:text-violet-300 transition-colors line-clamp-1">{memory.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{memory.content.slice(0, 100)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 text-xs mono text-slate-500">
                      <span className="flex items-center gap-0.5"><Heart size={10} className="text-pink-400" />{memory.likeCount}</span>
                      <span className="flex items-center gap-0.5"><GitFork size={10} className="text-cyan-400" />{memory.forkCount}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Top project */}
        {topProject && (
          <div className="mb-8">
            <h2 className="mono text-sm font-bold text-white mb-4 flex items-center gap-2">
              <FolderKanban size={14} className="text-violet-400" /> FEATURED_PROJECT
            </h2>
            <Link to={`/projects/${topProject.id}`}
              className="flex items-start gap-4 p-5 rounded-xl border hover:border-violet-500/30 transition-all"
              style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(0,229,255,0.1))', border: '1px solid rgba(139,92,246,0.2)' }}>
                <FolderKanban size={18} className="text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="mono text-sm font-semibold text-white mb-0.5">{topProject.name}</div>
                {topProject.description && <p className="text-xs text-slate-400 line-clamp-2">{topProject.description}</p>}
                <div className="flex items-center gap-3 mt-2">
                  {topProject.githubUrl && <a href={topProject.githubUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-xs mono text-slate-500 hover:text-white transition-colors"><GitBranch size={10} />GitHub</a>}
                  {topProject.websiteUrl && <a href={topProject.websiteUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-xs mono text-slate-500 hover:text-violet-400 transition-colors"><ExternalLink size={10} />Live</a>}
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Share CTA */}
        <div className="text-center py-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs mono text-slate-600 mb-2">Share this showcase</p>
          <code className="text-xs mono text-violet-400 bg-violet-500/10 px-3 py-1.5 rounded-lg">
            {window.location.origin}/u/{username}/showcase
          </code>
        </div>
      </div>
    </Layout>
  );
}
