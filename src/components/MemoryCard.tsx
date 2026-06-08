import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Bookmark, GitFork, Clock, MessageSquare, Package, Quote, Brain, MoreHorizontal } from 'lucide-react';
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
      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
    >
      <p className="mono text-xs text-slate-500 px-2 py-1 mb-1">ADD_TO_PACK</p>
      {myPacks.length === 0 ? (
        <Link
          to="/packs"
          onClick={onClose}
          className="block px-2 py-1.5 text-xs mono text-slate-400 hover:text-violet-300 transition-colors"
        >
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
            <Package size={11} className="text-slate-400 flex-shrink-0" />
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['saved'] });
    },
  });
  const forkMut = useMutation({
    mutationFn: () => memoriesApi.fork(memory.id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      navigate(`/memory/${res.data.id}`);
    },
  });

  const act = (fn: () => void) => { if (!user) { navigate('/login'); return; } fn(); };

  const isFork = !!memory.forkedFromId;
  const preview = memory.content.length > 200
    ? memory.content.slice(0, 200) + '…'
    : memory.content;

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all group card-scanline"
      style={{
        backgroundColor: 'var(--color-card)',
        borderColor: 'var(--color-border)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(168,85,247,0.35)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(168,85,247,0.08), 0 0 0 1px rgba(168,85,247,0.12)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
        (e.currentTarget as HTMLElement).style.boxShadow = '';
        (e.currentTarget as HTMLElement).style.transform = '';
      }}
    >
      <div className="flex">
        {/* ── Left icon column ── */}
        <div className="flex-shrink-0 flex flex-col items-center pt-3 pb-3 w-[64px] md:w-[72px]">
          <div
            className="w-12 h-12 md:w-[52px] md:h-[52px] rounded-2xl flex items-center justify-center icon-block-memory"
            style={{ background: 'linear-gradient(145deg, #1A0A3A 0%, #3B1A7A 55%, #5B2FBA 100%)' }}
          >
            <Brain
              size={22}
              style={{
                color: '#C084FC',
                filter: 'drop-shadow(0 0 5px rgba(168,85,247,0.85))',
              }}
            />
          </div>
          {/* Connector line */}
          <div className="flex-1 mt-2 w-px min-h-[12px]" style={{ backgroundColor: 'var(--color-border)' }} />
        </div>

        {/* ── Right content ── */}
        <div className="flex-1 min-w-0">

          {/* Top row: badge + time + menu */}
          <div className="flex items-center gap-2 pr-3 pt-3 pb-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wide badge-memory flex-shrink-0">
              MEMORY
            </span>
            <span className="text-xs text-slate-600 flex-shrink-0">{timeAgo(memory.createdAt)}</span>
            {isFork && (
              <span className="flex items-center gap-1 text-[10px] text-slate-600 flex-shrink-0">
                <GitFork size={9} className="text-cyan-600" />
                forked
              </span>
            )}
            <div className="relative ml-auto flex-shrink-0">
              <div className="p-1 rounded-lg text-slate-700">
                <MoreHorizontal size={14} />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="pr-4 pb-1">
            <Link to={`/memory/${memory.id}`}>
              <h3 className="font-semibold text-white text-base leading-snug group-hover:text-violet-300 transition-colors line-clamp-2">
                {memory.title}
              </h3>
            </Link>
          </div>

          {/* Content preview */}
          <div className="pr-4 pb-2">
            <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">{preview}</p>
          </div>

          {/* Tags */}
          {memory.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 pr-4 pb-3">
              {memory.tags.slice(0, 4).map(tag => (
                <Link
                  key={tag}
                  to={`/browse?tag=${encodeURIComponent(tag)}`}
                  onClick={e => e.stopPropagation()}
                  className="text-xs px-2 py-0.5 rounded-md transition-colors hover:text-slate-300"
                  style={{ backgroundColor: 'rgba(168,85,247,0.08)', color: '#A855F7', border: '1px solid rgba(168,85,247,0.2)' }}
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}

          {/* Footer: author + engagement */}
          <div
            className="flex items-center pr-3 py-2 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {/* Author */}
            {author && (
              <Link
                to={`/u/${author.username}`}
                className="flex items-center gap-1.5 mr-2 hover:opacity-80 transition-opacity flex-shrink-0"
              >
                <div
                  className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold"
                  style={{ background: 'linear-gradient(135deg, #A855F7, #00E5FF)', color: 'white' }}
                >
                  {author.avatar
                    ? <img src={author.avatar} alt={author.username} className="w-full h-full object-cover" />
                    : author.username[0].toUpperCase()}
                </div>
                <span className="text-xs text-slate-500 max-w-[72px] truncate hidden sm:block">
                  {author.displayName || author.username}
                </span>
              </Link>
            )}

            <span className="text-slate-700 text-xs mx-1 hidden sm:block">·</span>

            {/* Like */}
            <button
              onClick={() => act(() => likeMut.mutate())}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-pink-400 hover:bg-white/5 transition-all"
            >
              <Heart size={13} />
              {memory.likeCount > 0 && <span>{memory.likeCount}</span>}
            </button>

            {/* Comments */}
            <Link
              to={`/memory/${memory.id}`}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
            >
              <MessageSquare size={13} />
            </Link>

            {/* Fork */}
            <button
              onClick={() => act(() => forkMut.mutate())}
              disabled={forkMut.isPending || memory.userId === user?.id}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-cyan-400 hover:bg-white/5 transition-all disabled:opacity-30"
            >
              <GitFork size={13} />
              {memory.forkCount > 0 && <span>{memory.forkCount}</span>}
            </button>

            {/* Quote */}
            {user && (
              <button
                onClick={() => setQuoteMemory({ memory, author: author! })}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
                title="Quote this memory"
              >
                <Quote size={13} />
              </button>
            )}

            {/* Save */}
            <button
              onClick={() => act(() => saveMut.mutate())}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-amber-400 hover:bg-white/5 transition-all ml-auto"
            >
              <Bookmark size={13} />
              {memory.saveCount > 0 && <span>{memory.saveCount}</span>}
            </button>

            {/* Add to pack */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowPackPopover(p => !p)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
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
    </div>
  );
}
