import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { feedApi, type FeedItem } from '../lib/api';
import { MemoryCard } from '../components/MemoryCard';
import { PostCard } from '../components/PostCard';
import { ComposeBox } from '../components/ComposeBox';
import { Layout } from '../components/Layout';
import { useAuthStore } from '../store/auth';
import { Loader2, Zap, Clock, Brain, MessageCircle, LayoutList, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

type FeedTab = 'all' | 'memories' | 'posts' | 'trending' | 'following';

const TABS: { key: FeedTab; label: string; icon: React.ElementType; authRequired?: boolean }[] = [
  { key: 'all',       label: 'ALL',       icon: LayoutList },
  { key: 'following', label: 'FOLLOWING', icon: Users, authRequired: true },
  { key: 'memories',  label: 'MEMORIES',  icon: Brain },
  { key: 'posts',     label: 'POSTS',     icon: MessageCircle },
  { key: 'trending',  label: 'TRENDING',  icon: Zap },
];

const PAGE_SIZE = 30;

export function FeedPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<FeedTab>('all');

  const query = useInfiniteQuery({
    queryKey: ['feed', tab],
    queryFn: ({ pageParam = 0 }) =>
      feedApi.get(tab, PAGE_SIZE, pageParam as number).then(r => r.data),
    getNextPageParam: (lastPage, pages) =>
      lastPage.items.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined,
    initialPageParam: 0,
  });

  const items = query.data?.pages.flatMap(p => p.items) ?? [];
  const isLoading = query.isLoading;
  const isFetchingNextPage = query.isFetchingNextPage;
  const hasNextPage = query.hasNextPage;

  const handleTabChange = (key: FeedTab) => {
    setTab(key);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Compose */}
        <ComposeBox />

        {/* Tab switcher */}
        <div className="flex gap-0.5 mb-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          {TABS.filter(t => !t.authRequired || user).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs mono font-medium transition-all border-b-2 -mb-px ${
                tab === key ? 'text-white border-violet-500' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
          <div className="ml-auto flex items-center pr-1">
            <span className="text-xs mono text-slate-700">{items.length}</span>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 size={20} className="animate-spin text-violet-400" />
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="text-center py-20">
            <p className="mono text-slate-400 text-sm">
              {tab === 'trending'  ? 'NO_TRENDING_YET'
              : tab === 'posts'    ? 'NO_POSTS_YET'
              : tab === 'following'? 'NOT_FOLLOWING_ANYONE_YET'
              : 'NOTHING_HERE_YET'}
            </p>
            <p className="text-slate-600 text-xs mt-1">
              {tab === 'following'
                ? <span>Follow builders from the <Link to="/leaderboard" className="text-violet-400 hover:text-violet-300 transition-colors">leaderboard</Link> to see their content here</span>
                : tab === 'trending'
                ? 'Come back once builders start sharing'
                : 'Be the first to post something'}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {items.map((item: FeedItem) => {
            if (item.type === 'memory') {
              return <MemoryCard key={item.memory.id} memory={item.memory} author={item.author} />;
            }
            return <PostCard key={item.post.id} post={item.post} author={item.author} />;
          })}
        </div>

        {/* Load more */}
        {!isLoading && items.length > 0 && (
          <div className="flex justify-center mt-8">
            {hasNextPage ? (
              <button
                onClick={() => query.fetchNextPage()}
                disabled={isFetchingNextPage}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg border text-xs mono font-medium text-slate-400 hover:text-white hover:border-violet-500/40 transition-all disabled:opacity-50"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-panel)' }}
              >
                {isFetchingNextPage
                  ? <><Loader2 size={13} className="animate-spin" /> LOADING...</>
                  : <><Clock size={13} /> LOAD_MORE</>
                }
              </button>
            ) : (
              <p className="text-xs mono text-slate-600">— END_OF_FEED —</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
