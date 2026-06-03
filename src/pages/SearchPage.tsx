import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchApi, type User } from '../lib/api';
import { Layout } from '../components/Layout';
import { MemoryCard } from '../components/MemoryCard';
import { timeAgo } from '../lib/utils';
import { Search, Loader2, Users, BookOpen, FolderKanban, Package } from 'lucide-react';

type SearchTab = 'memories' | 'users' | 'projects' | 'packs';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput] = useState(searchParams.get('q') ?? '');
  const [tab, setTab] = useState<SearchTab>('memories');
  const q = searchParams.get('q') ?? '';

  useEffect(() => {
    const t = setTimeout(() => { if (input.trim()) setSearchParams({ q: input.trim() }); }, 400);
    return () => clearTimeout(t);
  }, [input]);

  const { data, isLoading } = useQuery({
    queryKey: ['search', q],
    queryFn: () => searchApi.search(q).then(r => r.data),
    enabled: q.length > 0,
  });

  const counts = {
    memories: data?.memories?.length ?? 0,
    users: data?.users?.length ?? 0,
    projects: data?.projects?.length ?? 0,
    packs: data?.packs?.length ?? 0,
  };

  const TABS: { key: SearchTab; label: string; icon: React.ElementType }[] = [
    { key: 'memories', label: `MEMORIES (${counts.memories})`, icon: BookOpen },
    { key: 'users',    label: `BUILDERS (${counts.users})`,   icon: Users },
    { key: 'projects', label: `PROJECTS (${counts.projects})`, icon: FolderKanban },
    { key: 'packs',    label: `PACKS (${counts.packs})`,      icon: Package },
  ];

  return (
    <Layout>
      <div className="max-w-[680px] mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              autoFocus
              placeholder="Search memories, builders, projects, packs..."
              className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm text-white bg-transparent outline-none focus:border-slate-500 transition-colors"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
            />
          </div>
        </div>

        {q && (
          <>
            <div className="flex gap-1 mb-6 border-b overflow-x-auto" style={{ borderColor: 'var(--color-border)' }}>
              {TABS.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap flex-shrink-0 ${tab === key ? 'text-white' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                  style={tab === key ? { borderColor: 'var(--color-accent)' } : {}}>
                  <Icon size={12} />{label}
                </button>
              ))}
            </div>

            {isLoading && <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-400" /></div>}

            {/* Memories */}
            {!isLoading && tab === 'memories' && (
              <div className="space-y-4">
                {data?.memories?.map(({ memory, author }) => <MemoryCard key={memory.id} memory={memory} author={author} />)}
                {data?.memories?.length === 0 && <Empty label={`NO_MEMORIES_FOUND for "${q}"`} />}
              </div>
            )}

            {/* Users */}
            {!isLoading && tab === 'users' && (
              <div className="space-y-3">
                {data?.users?.map((u: User) => (
                  <Link key={u.id} to={`/u/${u.username}`}>
                    <div className="flex items-center gap-3 p-4 rounded-xl border hover:border-slate-600 transition-all" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                      <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center mono font-bold overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))', color: 'white' }}>
                        {u.avatar ? <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" /> : u.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="mono text-sm font-semibold text-white">{u.displayName ?? u.username}</div>
                        <div className="text-xs mono text-slate-500">@{u.username}</div>
                        {u.bio && <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{u.bio}</div>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs mono text-slate-400">{u.followerCount} followers</div>
                        <div className="text-xs mono text-slate-600">{u.memoryCount} memories</div>
                      </div>
                    </div>
                  </Link>
                ))}
                {data?.users?.length === 0 && <Empty label={`NO_BUILDERS_FOUND for "${q}"`} />}
              </div>
            )}

            {/* Projects */}
            {!isLoading && tab === 'projects' && (
              <div className="space-y-3">
                {data?.projects?.map(({ project, owner }: any) => (
                  <Link key={project.id} to={`/projects/${project.id}`}>
                    <div className="flex items-center gap-3 p-4 rounded-xl border hover:border-slate-600 transition-all" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                      <FolderKanban size={20} className="text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="mono text-sm font-semibold text-white">{project.name}</div>
                        {project.description && <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{project.description}</div>}
                        <div className="text-xs mono text-slate-600 mt-0.5">by @{owner?.username}</div>
                      </div>
                      <div className="text-xs mono text-slate-500 flex-shrink-0">{project.followerCount} followers</div>
                    </div>
                  </Link>
                ))}
                {data?.projects?.length === 0 && <Empty label={`NO_PROJECTS_FOUND for "${q}"`} />}
              </div>
            )}

            {/* Packs */}
            {!isLoading && tab === 'packs' && (
              <div className="space-y-3">
                {data?.packs?.map(({ pack, owner }: any) => (
                  <Link key={pack.id} to={`/packs/${pack.id}`}>
                    <div className="flex items-center gap-3 p-4 rounded-xl border hover:border-slate-600 transition-all" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                      <Package size={20} className="text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="mono text-sm font-semibold text-white">{pack.title}</div>
                        {pack.description && <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{pack.description}</div>}
                        <div className="text-xs mono text-slate-600 mt-0.5">by @{owner?.username}</div>
                      </div>
                      <div className="text-xs mono text-slate-500 flex-shrink-0">{pack.memoryCount} memories</div>
                    </div>
                  </Link>
                ))}
                {data?.packs?.length === 0 && <Empty label={`NO_PACKS_FOUND for "${q}"`} />}
              </div>
            )}
          </>
        )}

        {!q && (
          <div className="text-center py-16">
            <Search size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="mono text-slate-500 text-sm">SEARCH_SHIPHUB</p>
            <p className="text-slate-600 text-xs mt-1">Find memories, builders, projects, and packs</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="text-center py-12 text-xs mono text-slate-600">{label}</div>;
}
