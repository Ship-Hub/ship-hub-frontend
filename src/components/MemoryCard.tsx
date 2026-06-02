import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Bookmark, GitFork, Clock, MessageSquare, Package, Quote } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { memoriesApi, packsApi, type Memory, type AuthorSnippet } from '../lib/api';
import { cn, timeAgo, CATEGORY_COLORS } from '../lib/utils';
import { useAuthStore } from '../store/auth';
import { useComposeStore } from '../store/compose';

interface MemoryCardProps {
  memory: Memory;
  author: AuthorSnippet | null;
  originalAuthorUsername?: string | null;
}

function AddToPackPopover({ memoryId, onClose }: { memoryId: string; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ['my-packs'],
    queryFn: () => packsApi.list(50).then(r => r.data),
  });
  const addMut = useMutation({
    mutationFn: (packId: string) => packsApi.addMemory(packId, memoryId),
    onSuccess: () => onClose(),
  });
  const myPacks = data?.packs ?? [];

  return (
    <div
      className="absolute bottom-8 right-0 z-30 w-52 rounded-xl border shadow-xl p-2"
      style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}
    >
      <p className="mono text-xs text-slate-500 px-2 py-1 mb-1">ADD_TO_PACK</p>
      {myPacks.length === 0 ? (
        <Link to="/packs" onClick={onClose} className="block px-2 py-1.5 text-xs mono text-violet-400 hover:text-violet-300 transition-colors">
          + Create a pack first
        </Link>
      ) : (
        myPacks.map(({ pack }) => (
          <button
            key={pack.id}
            onClick={() => addMut.mutate(pack.id)}
            disabled={addMut.isPending}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs mono text-slate-300 hover:text-white hover:bg-white/5 transition-all text-left"
          >
            <Package size={11} className="text-violet-400 flex-shrink-0" />
            <span className="truncate">{pack.title}</span>
          </button>
        ))
      )}
    </div>
  );
}

export function MemoryCard({ memory, author, originalAuthorUsername }: MemoryCardProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setQuoteMemory } = useComposeStore();
  const [showPackPopover, setShowPackPopover] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['feed'] });
    queryClient.invalidateQueries({ queryKey: ['memory', memory.id] });
  };

  const likeMut = useMutation({ mutationFn: () => memoriesApi.like(memory.id), onSuccess: invalidate });
  const saveMut = useMutation({
    mutationFn: () => memoriesApi.save(memory.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['feed'] }); queryClient.invalidateQueries({ queryKey: ['saved'] }); },
  });
  const forkMut = useMutation({
    mutationFn: () => memoriesApi.fork(memory.id),
    onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: ['feed'] }); navigate(`/memory/${res.data.id}`); },
  });

  const act = (fn: () => void) => { if (!user) { navigate('/login'); return; } fn(); };

  const categoryClass = CATEGORY_COLORS[memory.category] ?? 'text-slate-400 bg-slate-400/10 border-slate-400/20';
  const preview = memory.content.length > 200 ? memory.content.slice(0, 200) + '…' : memory.content;
  const isFork = !!memory.forkedFromId;
  const showOriginal = isFork && memory.originalMemoryId && memory.originalMemoryId !== memory.forkedFromId;

  return (
    <div
      className="rounded-xl border p-5 card-hover group"
      style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}
    >
      {/* Fork attribution */}
      {isFork && (
        <div className="flex items-center gap-1.5 text-xs mono text-slate-500 mb-2">
          <GitFork size={10} className="text-cyan-500" />
          <span>forked from{' '}
            <Link to={`/memory/${memory.forkedFromId}`} className="text-cyan-400 hover:text-cyan-300 transition-colors">
              {memory.forkedFromUserId ? `@${memory.forkedFromUserId.slice(0, 8)}` : 'original'}
            </Link>
          </span>
          {showOriginal && originalAuthorUsername && (
            <span className="text-slate-600">
              {' · '}original by{' '}
              <Link to={`/memory/${memory.originalMemoryId}`} className="text-violet-400 hover:text-violet-300 transition-colors">
                @{originalAuthorUsername}
              </Link>
            </span>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <Link to={`/memory/${memory.id}`}>
            <h3 className="mono font-semibold text-white text-sm group-hover:text-violet-300 transition-colors line-clamp-2">
              {memory.title}
            </h3>
          </Link>
        </div>
        <Link
          to={`/browse?category=${memory.category}`}
          onClick={e => e.stopPropagation()}
          className={cn('text-xs mono px-2 py-0.5 rounded border flex-shrink-0 hover:opacity-80 transition-opacity', categoryClass)}
        >
          {memory.category.toUpperCase()}
        </Link>
      </div>

      {/* Content preview */}
      <p className="text-slate-400 text-xs leading-relaxed mb-4 line-clamp-3">{preview}</p>

      {/* Tags */}
      {memory.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {memory.tags.slice(0, 4).map((tag) => (
            <Link
              key={tag}
              to={`/browse?tag=${encodeURIComponent(tag)}`}
              onClick={e => e.stopPropagation()}
              className="text-xs mono px-2 py-0.5 rounded transition-colors hover:text-violet-400"
              style={{ backgroundColor: 'var(--color-elevated)', color: '#64748B' }}
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {author && (
            <Link to={`/u/${author.username}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs mono font-bold" style={{ backgroundColor: 'var(--color-violet)', color: 'white' }}>
                {author.username[0].toUpperCase()}
              </div>
              <span className="text-xs mono text-slate-400">@{author.username}</span>
            </Link>
          )}
          <span className="flex items-center gap-1 text-xs text-slate-500 mono">
            <Clock size={10} />
            {timeAgo(memory.createdAt)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => act(() => likeMut.mutate())} className="flex items-center gap-1 text-xs mono text-slate-400 hover:text-pink-400 transition-colors">
            <Heart size={13} />{memory.likeCount}
          </button>
          <Link to={`/memory/${memory.id}`} className="flex items-center gap-1 text-xs mono text-slate-400 hover:text-slate-200 transition-colors">
            <MessageSquare size={13} />
          </Link>
          <button onClick={() => act(() => forkMut.mutate())} disabled={forkMut.isPending || memory.userId === user?.id} className="flex items-center gap-1 text-xs mono text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-30">
            <GitFork size={13} />{memory.forkCount}
          </button>
          <button onClick={() => act(() => saveMut.mutate())} className="flex items-center gap-1 text-xs mono text-slate-400 hover:text-amber-400 transition-colors">
            <Bookmark size={13} />{memory.saveCount}
          </button>
          {user && (
            <button
              onClick={() => setQuoteMemory({ memory, author: author! })}
              className="flex items-center gap-1 text-xs mono text-slate-400 hover:text-violet-400 transition-colors"
              title="Quote this memory"
            >
              <Quote size={13} />
            </button>
          )}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowPackPopover(p => !p)}
                className="flex items-center gap-1 text-xs mono text-slate-400 hover:text-violet-400 transition-colors"
                title="Add to pack"
              >
                <Package size={13} />
              </button>
              {showPackPopover && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowPackPopover(false)} />
                  <AddToPackPopover memoryId={memory.id} onClose={() => setShowPackPopover(false)} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
