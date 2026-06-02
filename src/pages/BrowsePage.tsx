import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { browseApi, tagsApi, type MemoryWithAuthor } from '../lib/api';
import { Layout } from '../components/Layout';
import { MemoryCard } from '../components/MemoryCard';
import { cn, CATEGORIES, CATEGORY_COLORS } from '../lib/utils';
import { Tag, LayoutGrid, Loader2, Hash, TrendingUp } from 'lucide-react';

export function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tag = searchParams.get('tag') ?? '';
  const category = searchParams.get('category') ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['browse', tag, category],
    queryFn: () =>
      tag
        ? browseApi.byTag(tag).then(r => r.data)
        : browseApi.byCategory(category).then(r => r.data),
    enabled: !!(tag || category),
  });

  const memories: MemoryWithAuthor[] = data?.memories ?? [];

  const activeCategory = category || null;
  const activeTag = tag || null;

  const trendingQ = useQuery({
    queryKey: ['trending-tags'],
    queryFn: () => tagsApi.trending(16).then(r => r.data),
  });
  const trendingTags: { tag: string; count: number }[] = trendingQ.data?.tags ?? [];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            {activeTag ? (
              <>
                <Hash size={16} className="text-violet-400" />
                <h1 className="mono text-lg font-bold text-white">{activeTag}</h1>
              </>
            ) : activeCategory ? (
              <>
                <Tag size={16} className="text-violet-400" />
                <h1 className="mono text-lg font-bold text-white">{activeCategory.toUpperCase()}</h1>
              </>
            ) : (
              <>
                <LayoutGrid size={16} className="text-violet-400" />
                <h1 className="mono text-lg font-bold text-white">BROWSE</h1>
              </>
            )}
          </div>
          <p className="text-xs text-slate-500 mono">
            {activeTag
              ? `All memories tagged #${activeTag}`
              : activeCategory
              ? `All ${activeCategory} memories`
              : 'Pick a category to explore'}
          </p>
        </div>

        {/* Trending tags */}
        {trendingTags.length > 0 && !activeTag && !activeCategory && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={13} className="text-cyan-400" />
              <span className="mono text-xs font-semibold text-slate-400">TRENDING_THIS_WEEK</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {trendingTags.map(({ tag, count }) => (
                <button
                  key={tag}
                  onClick={() => setSearchParams({ tag })}
                  className="flex items-center gap-1.5 text-xs mono px-2.5 py-1 rounded-full border transition-all hover:border-cyan-500/50 hover:text-cyan-300"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)', color: '#64748B' }}
                >
                  <Hash size={9} />{tag}
                  <span className="text-slate-600">{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5 mb-8">
          {CATEGORIES.map(({ value, label }) => {
            const colorClass = CATEGORY_COLORS[value] ?? 'text-slate-400 bg-slate-400/10 border-slate-400/20';
            const isActive = activeCategory === value && !activeTag;
            return (
              <button
                key={value}
                onClick={() => setSearchParams({ category: value })}
                className={cn(
                  'text-xs mono px-2.5 py-1 rounded border transition-all',
                  colorClass,
                  isActive ? 'ring-1 ring-offset-1 ring-offset-[var(--color-base)] opacity-100' : 'opacity-50 hover:opacity-100',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Results */}
        {(activeTag || activeCategory) && (
          <>
            {isLoading && (
              <div className="flex justify-center py-16">
                <Loader2 size={20} className="animate-spin text-violet-400" />
              </div>
            )}

            {!isLoading && memories.length === 0 && (
              <div className="text-center py-16">
                <p className="mono text-slate-400 text-sm">NO_MEMORIES_FOUND</p>
                <p className="text-xs text-slate-600 mt-1">
                  {activeTag ? `No public memories tagged #${activeTag} yet` : `No public ${activeCategory} memories yet`}
                </p>
                <Link to="/publish" className="inline-block mt-4 text-xs mono text-violet-400 hover:text-violet-300 transition-colors">
                  + Publish the first one
                </Link>
              </div>
            )}

            {!isLoading && memories.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs mono text-slate-500">{memories.length} result{memories.length !== 1 ? 's' : ''}</span>
                  {activeTag && (
                    <button
                      onClick={() => setSearchParams({})}
                      className="text-xs mono text-slate-500 hover:text-white transition-colors"
                    >
                      × clear tag
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {memories.map(({ memory, author }) => (
                    <MemoryCard key={memory.id} memory={memory} author={author} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Idle state — nothing selected yet */}
        {!activeTag && !activeCategory && (
          <div className="text-center py-12">
            <LayoutGrid size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="mono text-slate-500 text-sm">SELECT_A_CATEGORY</p>
            <p className="text-xs text-slate-600 mt-1">Or click any tag on a memory card to explore</p>
          </div>
        )}

      </div>
    </Layout>
  );
}
