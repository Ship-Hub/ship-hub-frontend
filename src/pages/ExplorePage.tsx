import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import {
  feedApi, tagsApi, usersApi, type FeedItem,
} from '../lib/api';
import { Layout } from '../components/Layout';
import { PostCard } from '../components/PostCard';
import { MemoryCard } from '../components/MemoryCard';
import {
  Search, Hash, TrendingUp, Zap, Code2, Users, FolderKanban, Loader2,
} from 'lucide-react';

export function ExplorePage() {
  const navigate = useNavigate();
  const [searchVal, setSearchVal] = useState('');

  // Parallel data fetching
  const trendingQ = useQuery({
    queryKey: ['feed', 'trending'],
    queryFn: () => feedApi.get('trending', 8, 0).then(r => r.data.items),
    staleTime: 60_000,
  });

  const tagsQ = useQuery({
    queryKey: ['tags-trending'],
    queryFn: () => tagsApi.trending(20).then(r => r.data.tags),
    staleTime: 60_000,
  });

  const buildersQ = useQuery({
    queryKey: ['trending-builders'],
    queryFn: () => usersApi.trending().then(r => r.data.builders),
    staleTime: 60_000,
  });

  const projectsQ = useQuery({
    queryKey: ['feed', 'projects'],
    queryFn: () => feedApi.get('projects', 6, 0).then(r => r.data.items),
    staleTime: 60_000,
  });

  const codeQ = useQuery({
    queryKey: ['feed', 'code'],
    queryFn: () => feedApi.get('code', 4, 0).then(r => r.data.items),
    staleTime: 60_000,
  });

  const collabQ = useQuery({
    queryKey: ['feed', 'collaborations'],
    queryFn: () => feedApi.get('collaborations', 3, 0).then(r => r.data.items),
    staleTime: 60_000,
  });

  const buildupdatesQ = useQuery({
    queryKey: ['feed', 'build_updates'],
    queryFn: () => feedApi.get('build_updates', 4, 0).then(r => r.data.items),
    staleTime: 60_000,
  });

  return (
    <Layout>
      <Helmet><title>Explore — ShipHub</title></Helmet>
      <div className="max-w-[680px] mx-auto px-4 py-6 space-y-8">

        {/* Header + Search */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Explore</h1>
          <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
            Discover what builders are shipping right now.
          </p>
          <form onSubmit={e => { e.preventDefault(); if (searchVal.trim()) navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`); }}>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
              <input
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                placeholder="Search builders, projects, memories, code..."
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm border outline-none transition-colors font-medium"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
          </form>
        </div>

        {/* Trending Tags */}
        <section>
          <SectionHeader icon={Hash} label="Trending Tags" color="var(--color-cyan)" />
          {tagsQ.isLoading && <SkeletonRow count={1} height="h-9" />}
          {tagsQ.data && (
            <div className="flex flex-wrap gap-2">
              {tagsQ.data.map(({ tag, count }) => (
                <Link key={tag} to={`/browse?tag=${encodeURIComponent(tag)}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all hover:scale-105"
                  style={{ borderColor: 'rgba(0,229,255,0.25)', backgroundColor: 'rgba(0,229,255,0.07)', color: 'var(--color-cyan)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 10px rgba(0,229,255,0.3)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>
                  <Hash size={11} />
                  {tag}
                  <span className="text-xs opacity-60 ml-0.5">{count}</span>
                </Link>
              ))}
            </div>
          )}
          {tagsQ.data?.length === 0 && <EmptyNote text="No trending tags yet." />}
        </section>

        {/* Trending Builders */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionHeader icon={TrendingUp} label="Trending Builders" color="var(--color-accent)" noMargin />
            <Link to="/builders" className="text-xs font-semibold transition-colors hover:opacity-80" style={{ color: 'var(--color-accent)' }}>
              View all
            </Link>
          </div>
          {buildersQ.isLoading && <SkeletonRow count={5} height="h-12" />}
          {buildersQ.data && (
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              {buildersQ.data.map((b, i) => (
                <Link key={b.id} to={`/u/${b.username}`}
                  className="flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl border w-24 transition-all hover:scale-105"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 14px rgba(255,138,0,0.15)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,138,0,0.3)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; }}>
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold"
                      style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))', color: 'white' }}>
                      {b.avatar ? <img src={b.avatar} alt={b.username} className="w-full h-full object-cover" /> : b.username[0].toUpperCase()}
                    </div>
                    {i < 3 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ backgroundColor: 'var(--color-accent)', boxShadow: '0 0 6px rgba(255,138,0,0.6)' }}>
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-300 truncate w-full text-center">{b.displayName || b.username}</span>
                  <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{b.followerCount} followers</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Trending This Week */}
        <section>
          <SectionHeader icon={Zap} label="Trending This Week" color="var(--color-accent)" />
          {trendingQ.isLoading && <SkeletonRow count={3} height="h-28" />}
          <div className="space-y-3">
            {(trendingQ.data ?? []).map((item: FeedItem) => {
              if (item.type === 'memory') return <MemoryCard key={item.memory.id} memory={item.memory} author={item.author} />;
              if (item.type === 'post') return (
                <PostCard
                  key={item.post.id}
                  post={item.post}
                  author={item.author}
                  quotedPost={item.quotedPost}
                  quotedMemory={item.quotedMemory}
                  quotedProject={(item as any).quotedProject}
                />
              );
              return null;
            })}
          </div>
          {trendingQ.data?.length === 0 && <EmptyNote text="Nothing trending yet — be the first to post." />}
        </section>

        {/* Latest Build Updates */}
        {(buildupdatesQ.data?.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <SectionHeader icon={Zap} label="Latest Build Updates" color="var(--color-accent)" noMargin />
              <Link to="/?tab=build_updates" className="text-xs font-semibold transition-colors hover:opacity-80" style={{ color: 'var(--color-accent)' }}>
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {(buildupdatesQ.data ?? []).map((item: FeedItem) =>
                item.type === 'post' ? (
                  <PostCard
                    key={item.post.id}
                    post={item.post}
                    author={item.author}
                    quotedPost={item.quotedPost}
                    quotedMemory={item.quotedMemory}
                    quotedProject={(item as any).quotedProject}
                  />
                ) : null
              )}
            </div>
          </section>
        )}

        {/* Recent Projects */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionHeader icon={FolderKanban} label="Recent Projects" color="var(--color-success)" noMargin />
            <Link to="/projects" className="text-xs font-semibold transition-colors hover:opacity-80" style={{ color: 'var(--color-accent)' }}>
              View all
            </Link>
          </div>
          {projectsQ.isLoading && <SkeletonRow count={3} height="h-20" />}
          {(projectsQ.data?.length ?? 0) > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {(projectsQ.data ?? []).map((item: FeedItem) => {
                if (item.type !== 'project') return null;
                const { project, author } = item;
                return (
                  <Link key={project.id} to={`/projects/${project.id}`}
                    className="p-3 rounded-xl border transition-all hover:border-slate-600"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(0,217,126,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,217,126,0.25)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; }}>
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="text-sm font-semibold text-white truncate">{project.name}</span>
                      {project.status === 'launched' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1" style={{ backgroundColor: 'rgba(0,217,126,0.15)', color: 'var(--color-success)' }}>
                          LIVE
                        </span>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-xs leading-relaxed mb-2 line-clamp-2" style={{ color: 'var(--color-muted)' }}>{project.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                        style={{ background: 'var(--color-accent)', color: 'white' }}>
                        {author?.avatar ? <img src={author.avatar} alt="" className="w-full h-full object-cover" /> : author?.username?.[0]?.toUpperCase()}
                      </div>
                      <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>@{author?.username}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          {projectsQ.data?.length === 0 && <EmptyNote text="No projects yet." />}
        </section>

        {/* Fresh Code Snippets */}
        {(codeQ.data?.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <SectionHeader icon={Code2} label="Fresh Code" color="var(--color-cyan)" noMargin />
              <Link to="/code-snippets" className="text-xs font-semibold transition-colors hover:opacity-80" style={{ color: 'var(--color-accent)' }}>
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {(codeQ.data ?? []).map((item: FeedItem) =>
                item.type === 'post' ? (
                  <PostCard
                    key={item.post.id}
                    post={item.post}
                    author={item.author}
                    quotedPost={item.quotedPost}
                    quotedMemory={item.quotedMemory}
                    quotedProject={(item as any).quotedProject}
                  />
                ) : null
              )}
            </div>
          </section>
        )}

        {/* Looking for Co-builders */}
        {(collabQ.data?.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <SectionHeader icon={Users} label="Looking for Co-builders" color="var(--color-amber)" noMargin />
              <Link to="/collaborations" className="text-xs font-semibold transition-colors hover:opacity-80" style={{ color: 'var(--color-accent)' }}>
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {(collabQ.data ?? []).map((item: FeedItem) =>
                item.type === 'post' ? (
                  <PostCard
                    key={item.post.id}
                    post={item.post}
                    author={item.author}
                    quotedPost={item.quotedPost}
                    quotedMemory={item.quotedMemory}
                    quotedProject={(item as any).quotedProject}
                  />
                ) : null
              )}
            </div>
          </section>
        )}

      </div>
    </Layout>
  );
}

// ── Helper components ─────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label, color, noMargin }: { icon: React.ElementType; label: string; color: string; noMargin?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${noMargin ? '' : 'mb-3'}`}>
      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}18`, color }}>
        <Icon size={13} />
      </div>
      <h2 className="font-semibold text-white text-sm">{label}</h2>
    </div>
  );
}

function SkeletonRow({ count, height }: { count: number; height: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${height} rounded-xl animate-pulse`} style={{ backgroundColor: 'var(--color-card)' }} />
      ))}
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="text-sm py-4 text-center" style={{ color: 'var(--color-muted)' }}>{text}</p>;
}
