import { useInfiniteQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { feedApi, type FeedItem } from '../lib/api';
import { PostCard } from '../components/PostCard';
import { Layout } from '../components/Layout';
import { FileText, Loader2 } from 'lucide-react';

export function PostsPage() {
  const query = useInfiniteQuery({
    queryKey: ['feed', 'posts'],
    queryFn: ({ pageParam = 0 }) =>
      feedApi.get('posts', 30, pageParam as number).then(r => r.data),
    getNextPageParam: (last, pages) =>
      last.items.length === 30 ? pages.length * 30 : undefined,
    initialPageParam: 0,
  });

  const items = query.data?.pages.flatMap(p => p.items) ?? [];

  return (
    <Layout>
      <Helmet><title>Posts — ShipHub</title></Helmet>
      <div className="max-w-[680px] mx-auto px-4 py-6">

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,77,77,0.1)', color: 'var(--color-accent)' }}>
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Posts</h1>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              Build updates, questions, polls and more from the community
            </p>
          </div>
        </div>

        {query.isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-muted)' }} />
          </div>
        )}

        <div className="space-y-3">
          {items.map((item: FeedItem) =>
            item.type === 'post' ? (
              <PostCard key={item.post.id} post={item.post} author={item.author} />
            ) : null
          )}
        </div>

        {!query.isLoading && items.length === 0 && (
          <div className="text-center py-20">
            <p className="font-semibold text-white mb-2">No posts yet</p>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              Be the first to post a build update, question, or snippet.
            </p>
          </div>
        )}

        {query.hasNextPage && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => query.fetchNextPage()}
              disabled={query.isFetchingNextPage}
              className="px-6 py-2.5 rounded-xl border text-sm font-medium transition-all hover:border-slate-500 disabled:opacity-50"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-muted)' }}>
              {query.isFetchingNextPage
                ? <Loader2 size={14} className="animate-spin mx-auto" />
                : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
