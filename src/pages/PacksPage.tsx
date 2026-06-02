import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { packsApi, type PackWithOwner } from '../lib/api';
import { Layout } from '../components/Layout';
import { useAuthStore } from '../store/auth';
import { cn, timeAgo } from '../lib/utils';
import { Package, Plus, Lock, Globe, BookOpen, Loader2, X } from 'lucide-react';

function CreatePackModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', description: '', visibility: 'public' as 'public' | 'private' });

  const createMut = useMutation({
    mutationFn: () => packsApi.create(form),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['packs'] });
      navigate(`/packs/${res.data.pack.id}`);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl border p-6" style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-violet-400" />
            <h2 className="mono font-semibold text-white text-sm">CREATE_PACK</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs mono text-slate-400 mb-1.5">PACK_TITLE</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="My Agentic Workflow Pack"
              className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-violet-500 transition-colors"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs mono text-slate-400 mb-1.5">DESCRIPTION <span className="text-slate-600">(optional)</span></label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="What's in this pack?"
              className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-violet-500 transition-colors resize-none"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
            />
          </div>

          <div>
            <label className="block text-xs mono text-slate-400 mb-2">VISIBILITY</label>
            <div className="flex gap-2">
              {(['public', 'private'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setForm(f => ({ ...f, visibility: v }))}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs mono flex-1 justify-center transition-all',
                    form.visibility === v
                      ? 'border-violet-500 text-violet-300'
                      : 'text-slate-500 hover:text-slate-300'
                  )}
                  style={{ borderColor: form.visibility === v ? undefined : 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
                >
                  {v === 'public' ? <Globe size={12} /> : <Lock size={12} />}
                  {v.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => createMut.mutate()}
            disabled={!form.title.trim() || createMut.isPending}
            className="w-full py-2.5 rounded-lg text-xs mono font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 mt-2"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}
          >
            {createMut.isPending ? 'CREATING...' : 'CREATE_PACK'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PacksPage() {
  const { user } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['packs'],
    queryFn: () => packsApi.list().then(r => r.data),
  });

  const packs: PackWithOwner[] = data?.packs ?? [];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Package size={20} className="text-violet-400" />
              <h1 className="mono text-lg font-bold text-white">MEMORY_PACKS</h1>
            </div>
            <p className="text-xs text-slate-500">Curated collections of memories, shareable as a unit</p>
          </div>
          {user && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs mono font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}
            >
              <Plus size={13} /> NEW_PACK
            </button>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 size={20} className="animate-spin text-violet-400" />
          </div>
        )}

        {!isLoading && packs.length === 0 && (
          <div className="text-center py-20">
            <Package size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="mono text-slate-400 text-sm">NO_PACKS_YET</p>
            <p className="text-slate-600 text-xs mt-1">Be the first to curate a memory pack</p>
            {user && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 text-xs mono text-violet-400 hover:text-violet-300 transition-colors"
              >
                + Create a pack
              </button>
            )}
          </div>
        )}

        <div className="space-y-3">
          {packs.map(({ pack, owner }) => (
            <Link
              key={pack.id}
              to={`/packs/${pack.id}`}
              className="flex items-start gap-4 p-5 rounded-xl border transition-all hover:border-violet-500/30 group"
              style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}
            >
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(0,229,255,0.1))', border: '1px solid rgba(139,92,246,0.2)' }}
              >
                <Package size={18} className="text-violet-400" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="mono text-sm font-semibold text-white group-hover:text-violet-300 transition-colors line-clamp-1">
                    {pack.title}
                  </h3>
                  {pack.visibility === 'private' && (
                    <span className="flex items-center gap-1 text-xs mono text-slate-500 flex-shrink-0">
                      <Lock size={10} /> PRIVATE
                    </span>
                  )}
                </div>
                {pack.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{pack.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  {owner && (
                    <span className="text-xs mono text-slate-500">@{owner.username}</span>
                  )}
                  <span className="flex items-center gap-1 text-xs mono text-slate-600">
                    <BookOpen size={10} />{pack.memoryCount} memor{pack.memoryCount !== 1 ? 'ies' : 'y'}
                  </span>
                  <span className="text-xs mono text-slate-600">{timeAgo(pack.createdAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {showCreate && <CreatePackModal onClose={() => setShowCreate(false)} />}
    </Layout>
  );
}
