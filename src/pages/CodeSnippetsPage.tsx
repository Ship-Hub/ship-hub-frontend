import { useInfiniteQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { feedApi, type FeedItem } from '../lib/api';
import { PostCard } from '../components/PostCard';
import { Layout } from '../components/Layout';
import { Code2, Loader2 } from 'lucide-react';

export function CodeSnippetsPage() {
  const query = useInfiniteQuery({
    queryKey: ['feed', 'code'],
    queryFn: ({ pageParam = 0 }) => feedApi.get('code', 30, pageParam as number).then(r => r.data),
    getNextPageParam: (last, pages) => last.items.length === 30 ? pages.length * 30 : undefined,
    initialPageParam: 0,
  });

  const items = query.data?.pages.flatMap(p => p.items) ?? [];

  return (
    <Layout>
      <Helmet><title>Code Snippets — ShipHub</title></Helmet>
      <div className="max-w-[680px] mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(0,229,255,0.1)', color: 'var(--color-cyan)' }}>
            <Code2 size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Code Snippets</h1>
            <p className="text-sm text-slate-500">Useful code shared by builders</p>
          </div>
        </div>

        {query.isLoading && <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-slate-600" /></div>}

        <div className="space-y-3">
          {items.map((item: FeedItem) => item.type === 'post' && (
            <PostCard
              key={item.post.id}
              post={item.post}
              author={item.author}
              quotedPost={item.quotedPost}
              quotedMemory={item.quotedMemory}
            />
          ))}
        </div>

        {!query.isLoading && items.length === 0 && (
          <div className="text-center py-20">
            <p className="text-white font-semibold mb-2">No code snippets yet</p>
            <p className="text-slate-500 text-sm">Be the first to share a snippet.</p>
          </div>
        )}

        {query.hasNextPage && (
          <div className="flex justify-center mt-8">
            <button onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}
              className="px-6 py-2.5 rounded-xl border text-sm font-medium text-slate-400 hover:text-white transition-all"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
              {query.isFetchingNextPage ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
