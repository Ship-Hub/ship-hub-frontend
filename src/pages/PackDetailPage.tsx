import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { packsApi } from '../lib/api';
import { Layout } from '../components/Layout';
import { MemoryCard } from '../components/MemoryCard';
import { useAuthStore } from '../store/auth';
import { timeAgo, cn } from '../lib/utils';
import {
  Package, BookOpen, Globe, Lock, ArrowLeft, Loader2,
  Pencil, Check, X, Trash2, Plus, Minus
} from 'lucide-react';

export function PackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editVis, setEditVis] = useState<'public' | 'private'>('public');

  const { data, isLoading } = useQuery({
    queryKey: ['pack', id],
    queryFn: () => packsApi.get(id!).then(r => r.data),
  });

  const updateMut = useMutation({
    mutationFn: () => packsApi.update(id!, { title: editTitle, description: editDesc, visibility: editVis }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pack', id] }); setEditing(false); },
  });

  const deleteMut = useMutation({
    mutationFn: () => packsApi.delete(id!),
    onSuccess: () => navigate('/packs'),
  });

  const removeMemoryMut = useMutation({
    mutationFn: (memoryId: string) => packsApi.removeMemory(id!, memoryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pack', id] }),
  });

  const startEdit = () => {
    if (!data) return;
    setEditTitle(data.pack.title);
    setEditDesc(data.pack.description ?? '');
    setEditVis(data.pack.visibility);
    setEditing(true);
  };

  if (isLoading) return <Layout><div className="flex justify-center py-20"><Loader2 size={20} className="animate-spin text-violet-400" /></div></Layout>;
  if (!data) return null;

  const { pack, owner, memories } = data;
  const isOwner = user?.id === pack.userId;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs mono text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft size={14} /> BACK
        </button>

        {/* Pack header */}
        <div className="rounded-2xl border p-6 mb-6" style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(0,229,255,0.1))', border: '1px solid rgba(139,92,246,0.2)' }}
            >
              <Package size={22} className="text-violet-400" />
            </div>

            <div className="flex-1 min-w-0">
              {editing ? (
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full mono text-lg font-bold text-white bg-transparent border-b border-violet-500 outline-none pb-1 mb-2"
                  autoFocus
                />
              ) : (
                <h1 className="mono text-lg font-bold text-white mb-1">{pack.title}</h1>
              )}

              <div className="flex items-center gap-3 text-xs mono text-slate-500">
                {owner && (
                  <Link to={`/u/${owner.username}`} className="hover:text-white transition-colors">
                    @{owner.username}
                  </Link>
                )}
                <span className="flex items-center gap-1">
                  <BookOpen size={10} /> {pack.memoryCount} memor{pack.memoryCount !== 1 ? 'ies' : 'y'}
                </span>
                <span>{timeAgo(pack.createdAt)}</span>

                {editing ? (
                  <button
                    onClick={() => setEditVis(v => v === 'public' ? 'private' : 'public')}
                    className={cn('flex items-center gap-1 px-2 py-0.5 rounded border transition-all',
                      editVis === 'private' ? 'text-amber-400 border-amber-400/30' : 'text-slate-400 border-slate-400/30')}
                  >
                    {editVis === 'private' ? <Lock size={10} /> : <Globe size={10} />}
                    {editVis.toUpperCase()}
                  </button>
                ) : (
                  <span className="flex items-center gap-1">
                    {pack.visibility === 'private' ? <Lock size={10} /> : <Globe size={10} />}
                    {pack.visibility.toUpperCase()}
                  </span>
                )}
              </div>

              {editing ? (
                <textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  rows={2}
                  placeholder="Pack description..."
                  className="w-full mt-3 px-3 py-2 rounded-lg border text-xs text-white bg-transparent outline-none resize-none focus:border-violet-500 transition-colors"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
                />
              ) : (
                pack.description && (
                  <p className="text-sm text-slate-400 mt-3 leading-relaxed">{pack.description}</p>
                )
              )}
            </div>
          </div>

          {/* Owner actions */}
          {isOwner && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              {editing ? (
                <>
                  <button onClick={() => updateMut.mutate()} disabled={updateMut.isPending} className="flex items-center gap-1.5 text-xs mono text-emerald-400 hover:text-emerald-300 transition-colors">
                    <Check size={13} /> {updateMut.isPending ? 'SAVING...' : 'SAVE'}
                  </button>
                  <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 text-xs mono text-slate-400 hover:text-white transition-colors">
                    <X size={13} /> CANCEL
                  </button>
                </>
              ) : (
                <>
                  <button onClick={startEdit} className="flex items-center gap-1.5 text-xs mono text-slate-400 hover:text-violet-400 transition-colors">
                    <Pencil size={13} /> EDIT
                  </button>
                  <button
                    onClick={() => { if (confirm('Delete this pack? Memories inside are not deleted.')) deleteMut.mutate(); }}
                    className="flex items-center gap-1.5 text-xs mono text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} /> DELETE
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Memories list */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="mono text-sm font-semibold text-white flex items-center gap-2">
            <BookOpen size={14} className="text-violet-400" />
            MEMORIES <span className="text-slate-500 font-normal">({memories.length})</span>
          </h2>
          {isOwner && (
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs mono text-slate-400 hover:text-violet-400 transition-colors"
              title="Go to feed and use the ⊕ button on any memory to add it here"
            >
              <Plus size={13} /> ADD_FROM_FEED
            </Link>
          )}
        </div>

        {memories.length === 0 ? (
          <div className="text-center py-16 rounded-xl border" style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
            <BookOpen size={28} className="text-slate-700 mx-auto mb-3" />
            <p className="mono text-slate-400 text-sm">EMPTY_PACK</p>
            <p className="text-xs text-slate-600 mt-1">
              {isOwner ? 'Add memories from the feed using the pack button on each card' : 'No memories in this pack yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {memories.map(({ memory, author }) => (
              <div key={memory.id} className="relative group/mem">
                <MemoryCard memory={memory} author={author} />
                {isOwner && (
                  <button
                    onClick={() => removeMemoryMut.mutate(memory.id)}
                    className="absolute top-3 right-3 opacity-0 group-hover/mem:opacity-100 flex items-center gap-1 text-xs mono text-slate-500 hover:text-red-400 transition-all px-2 py-1 rounded"
                    style={{ backgroundColor: 'var(--color-elevated)' }}
                    title="Remove from pack"
                  >
                    <Minus size={11} /> REMOVE
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
