import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { graphApi, type Memory } from '../lib/api';
import { Layout } from '../components/Layout';
import { cn, CATEGORY_COLORS } from '../lib/utils';
import { Network, GitFork, FolderKanban, Users, Loader2 } from 'lucide-react';

export function GraphPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['graph'],
    queryFn: () => graphApi.get(60).then(r => r.data),
  });

  const memories: Memory[] = data?.nodes?.memories ?? [];
  const users: any[] = data?.nodes?.users ?? [];
  const projects: any[] = data?.nodes?.projects ?? [];
  const edges: any[] = data?.edges ?? [];

  // Build adjacency map
  const memoryForks: Record<string, string[]> = {};
  const memoryProjects: Record<string, string[]> = {};
  edges.forEach((e: any) => {
    if (e.type === 'forked_from') {
      if (!memoryForks[e.target]) memoryForks[e.target] = [];
      memoryForks[e.target].push(e.source);
    }
    if (e.type === 'in_project') {
      if (!memoryProjects[e.source]) memoryProjects[e.source] = [];
      memoryProjects[e.source].push(e.target);
    }
  });

  const userMap: Record<string, any> = {};
  users.forEach(u => { userMap[u.id] = u; });
  const projectMap: Record<string, any> = {};
  projects.forEach(p => { if (p) projectMap[p.id] = p; });

  // Top memories by forks + likes
  const ranked = [...memories].sort((a, b) => (b.forkCount + b.likeCount) - (a.forkCount + a.likeCount));

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Network size={20} className="text-slate-400" />
            <h1 className="mono text-lg font-bold text-white">KNOWLEDGE_GRAPH</h1>
          </div>
          <p className="text-xs text-slate-500">How memories, builders, and projects connect across ShipHub</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'MEMORIES', value: memories.length, icon: Network, color: 'text-slate-400' },
            { label: 'BUILDERS', value: users.length, icon: Users, color: 'text-cyan-400' },
            { label: 'PROJECTS', value: projects.filter(Boolean).length, icon: FolderKanban, color: 'text-emerald-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border p-4 text-center" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <Icon size={20} className={cn('mx-auto mb-2', color)} />
              <div className={cn('mono text-2xl font-bold', color)}>{value}</div>
              <div className="mono text-xs text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {isLoading && <div className="flex justify-center py-20"><Loader2 size={20} className="animate-spin text-slate-400" /></div>}

        {/* Knowledge nodes */}
        <div className="space-y-3">
          {ranked.map((memory) => {
            const author = userMap[memory.userId];
            const forks = memoryForks[memory.id] ?? [];
            const inProjects = (memoryProjects[memory.id] ?? []).map(pid => projectMap[pid]).filter(Boolean);
            const categoryClass = CATEGORY_COLORS[memory.category] ?? 'text-slate-400 bg-slate-400/10 border-slate-400/20';
            const totalConnections = forks.length + inProjects.length + memory.likeCount;

            return (
              <div
                key={memory.id}
                className="rounded-xl border p-4 transition-all hover:border-slate-500/20"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-start gap-4">
                  {/* Connection strength indicator */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0 w-10">
                    <div
                      className="w-2 rounded-full transition-all"
                      style={{
                        backgroundColor: totalConnections > 10 ? '#8B5CF6' : totalConnections > 5 ? '#00E5FF' : '#1E293B',
                        height: `${Math.min(8 + totalConnections * 4, 48)}px`,
                      }}
                    />
                    <span className="mono text-xs text-slate-600">{totalConnections}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Link to={`/memory/${memory.id}`} className="mono text-sm font-semibold text-white hover:opacity-80 transition-colors line-clamp-1">
                        {memory.title}
                      </Link>
                      <span className={cn('text-xs mono px-2 py-0.5 rounded border flex-shrink-0', categoryClass)}>
                        {memory.category.toUpperCase()}
                      </span>
                    </div>

                    {/* Connections row */}
                    <div className="flex flex-wrap items-center gap-3">
                      {author && (
                        <Link to={`/u/${author.username}`} className="flex items-center gap-1 text-xs mono text-slate-400 hover:text-white transition-colors">
                          <div className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'var(--color-violet)', color: 'white', fontSize: '9px' }}>
                            {author.username[0].toUpperCase()}
                          </div>
                          @{author.username}
                        </Link>
                      )}

                      {memory.forkCount > 0 && (
                        <span className="flex items-center gap-1 text-xs mono text-cyan-500">
                          <GitFork size={10} />
                          {memory.forkCount} fork{memory.forkCount !== 1 ? 's' : ''}
                        </span>
                      )}

                      {memory.likeCount > 0 && (
                        <span className="text-xs mono text-pink-500">
                          â™¥ {memory.likeCount}
                        </span>
                      )}

                      {inProjects.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <FolderKanban size={10} className="text-emerald-500" />
                          {inProjects.map((p: any) => (
                            <Link key={p.id} to={`/projects/${p.id}`} className="text-xs mono text-emerald-400 hover:text-emerald-300 transition-colors">
                              {p.name}
                            </Link>
                          ))}
                        </div>
                      )}

                      {memory.originalMemoryId && (
                        <Link to={`/memory/${memory.originalMemoryId}`} className="flex items-center gap-1 text-xs mono text-slate-400 hover:opacity-80 transition-colors">
                          <GitFork size={9} />
                          root
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!isLoading && memories.length === 0 && (
          <div className="text-center py-20">
            <Network size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="mono text-slate-400 text-sm">NO_GRAPH_DATA_YET</p>
            <p className="text-slate-600 text-xs mt-1">Publish memories and fork others to build the knowledge graph</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
