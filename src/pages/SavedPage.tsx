import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { memoriesApi, postsApi } from '../lib/api';
import { Layout } from '../components/Layout';
import { MemoryCard } from '../components/MemoryCard';
import { PostCard } from '../components/PostCard';
import { useAuthStore } from '../store/auth';
import { Loader2, Bookmark, Brain, MessageCircle } from 'lucide-react';
import { useEffect } from 'react';

type SavedTab = 'memories' | 'posts';

export function SavedPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<SavedTab>('memories');

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user]);

  const memoriesQuery = useQuery({
    queryKey: ['saved', 'memories'],
    queryFn: () => memoriesApi.saved().then(r => r.data),
    enabled: !!user,
  });

  const postsQuery = useQuery({
    queryKey: ['saved', 'posts'],
    queryFn: () => postsApi.saved().then(r => r.data),
    enabled: !!user,
  });

  const savedMemories = memoriesQuery.data?.memories ?? [];
  const savedPosts = postsQuery.data?.posts ?? [];

  const isLoading = tab === 'memories' ? memoriesQuery.isLoading : postsQuery.isLoading;
  const totalMemories = savedMemories.length;
  const totalPosts = savedPosts.length;

  return (
    <Layout>
      <div className="max-w-[680px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Bookmark size={18} className="text-amber-400" />
          <h1 className="text-xl font-bold text-white">Saved</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 mb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          {([
            { key: 'memories' as SavedTab, label: 'MEMORIES', icon: Brain, count: totalMemories },
            { key: 'posts' as SavedTab, label: 'POSTS', icon: MessageCircle, count: totalPosts },
          ]).map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${
                tab === key ? 'text-white' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              <Icon size={12} />
              {label}
              <span className={`mono text-xs px-1.5 py-0.5 rounded-full ${tab === key ? 'text-white' : 'text-slate-600'}`}
                style={{ backgroundColor: tab === key ? 'rgba(255,138,0,0.12)' : 'transparent', color: tab === key ? 'var(--color-accent)' : undefined }}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin text-slate-600" />
          </div>
        )}

        {/* Memories tab */}
        {!isLoading && tab === 'memories' && (
          <>
            {savedMemories.length === 0 ? (
              <div className="text-center py-20">
                <Brain size={32} className="text-slate-700 mx-auto mb-3" />
                <p className="mono text-slate-400 text-sm">NO_SAVED_MEMORIES</p>
                <p className="text-slate-500 text-xs mt-2">Bookmark memories from the feed to access them here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedMemories.map(({ memory, author }: any) => (
                  <MemoryCard key={memory.id} memory={memory} author={author} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Posts tab */}
        {!isLoading && tab === 'posts' && (
          <>
            {savedPosts.length === 0 ? (
              <div className="text-center py-20">
                <MessageCircle size={32} className="text-slate-700 mx-auto mb-3" />
                <p className="mono text-slate-400 text-sm">NO_SAVED_POSTS</p>
                <p className="text-slate-500 text-xs mt-2">Bookmark posts from the feed to find them here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedPosts.map(({ post, author, quotedPost, quotedMemory }: any) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    author={author}
                    quotedPost={quotedPost}
                    quotedMemory={quotedMemory}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
