import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { postsApi } from '../lib/api';
import { Layout } from '../components/Layout';
import { PostCard } from '../components/PostCard';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Loader2 } from 'lucide-react';

const APP_URL = import.meta.env.VITE_APP_URL ?? 'https://community.memobank.online';

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => postsApi.get(id!).then(r => r.data),
  });

  const post = data?.post;
  const author = data?.author;
  const preview = post?.content.slice(0, 160).replace(/```[\s\S]*?```/g, '[code]').replace(/[#*`]/g, '');

  return (
    <Layout>
      {post && (
        <Helmet>
          <title>{author?.username ? `@${author.username} on ShipHub` : 'ShipHub'}</title>
          <meta name="description" content={preview} />
          <meta property="og:title" content={`@${author?.username} on ShipHub`} />
          <meta property="og:description" content={preview} />
          <meta property="og:url" content={`${APP_URL}/posts/${id}`} />
          <meta property="og:type" content="article" />
          <meta name="twitter:card" content="summary" />
        </Helmet>
      )}

      <div className="max-w-2xl mx-auto px-6 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs mono text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft size={14} /> BACK
        </button>

        {isLoading && <div className="flex justify-center py-20"><Loader2 size={20} className="animate-spin text-violet-400" /></div>}

        {data && (
          <PostCard
            post={data.post}
            author={data.author}
            quotedPost={data.quotedPost ?? undefined}
            quotedMemory={data.quotedMemory ?? undefined}
          />
        )}
      </div>
    </Layout>
  );
}
