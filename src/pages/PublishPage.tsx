import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { memoriesApi } from '../lib/api';
import { ImportModal } from '../components/ImportModal';
import { Layout } from '../components/Layout';
import { CATEGORIES } from '../lib/utils';
import { X, PenLine, Database, ChevronRight } from 'lucide-react';

type PublishMode = 'choose' | 'create' | 'import';

function NewMemoryForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', content: '', category: 'workflow',
    tags: [] as string[], visibility: 'public' as 'public' | 'private',
  });
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');

  const publishMut = useMutation({
    mutationFn: (data: typeof form) => memoriesApi.create(data as any),
    onSuccess: (res) => navigate(`/memory/${res.data.id}`),
    onError: (err: any) => setError(err.response?.data?.message ?? 'Failed to publish'),
  });

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !form.tags.includes(tag) && form.tags.length < 8) {
      setForm(f => ({ ...f, tags: [...f.tags, tag] }));
      setTagInput('');
    }
  };

  return (
    <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
      {error && <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs mono">{error}</div>}
      <form onSubmit={(e) => { e.preventDefault(); setError(''); publishMut.mutate(form); }} className="space-y-5">
        <div>
          <label className="block text-xs mono text-slate-400 mb-1.5">TITLE</label>
          <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-violet-500 transition-colors" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }} placeholder="My Claude Code workflow for Next.js" />
        </div>
        <div>
          <label className="block text-xs mono text-slate-400 mb-1.5">CATEGORY</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border text-sm text-white outline-none mono" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs mono text-slate-400 mb-1.5">CONTENT</label>
          <textarea required rows={12} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-violet-500 transition-colors resize-none font-mono leading-relaxed" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }} placeholder="Describe your memory, workflow, prompt, or template in detail..." />
        </div>
        <div>
          <label className="block text-xs mono text-slate-400 mb-1.5">TAGS</label>
          <div className="flex gap-2">
            <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} className="flex-1 px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-violet-500 transition-colors" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }} placeholder="claude-code, nextjs..." />
            <button type="button" onClick={addTag} className="px-4 py-2 rounded-lg border text-xs mono text-slate-300 hover:text-white transition-colors" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}>ADD</button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 text-xs mono px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-elevated)', color: '#94a3b8' }}>
                  #{tag}<button type="button" onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))}><X size={10} /></button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs mono text-slate-400 mb-2">VISIBILITY</label>
          <div className="flex gap-3">
            {(['public', 'private'] as const).map(v => (
              <label key={v} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="visibility" value={v} checked={form.visibility === v} onChange={() => setForm(f => ({ ...f, visibility: v }))} className="accent-violet-500" />
                <span className="text-xs mono text-slate-300">{v.toUpperCase()}</span>
              </label>
            ))}
          </div>
        </div>
        <button type="submit" disabled={publishMut.isPending} className="w-full py-3 rounded-lg text-xs mono font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}>
          {publishMut.isPending ? 'PUBLISHING...' : 'PUBLISH_MEMORY'}
        </button>
      </form>
    </div>
  );
}

export function PublishPage() {
  const [mode, setMode] = useState<PublishMode>('choose');

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="mono text-lg font-bold text-white mb-6">PUBLISH_MEMORY</h1>

        {mode === 'choose' && (
          <div className="grid gap-4">
            {/* Create new */}
            <button
              onClick={() => setMode('create')}
              className="flex items-center gap-4 p-5 rounded-2xl border text-left transition-all hover:border-violet-500/40 hover:bg-violet-500/5 group"
              style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}>
                <PenLine size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="mono font-semibold text-white text-sm mb-1 group-hover:text-violet-300 transition-colors">CREATE_NEW_MEMORY</div>
                <div className="text-xs text-slate-500">Write a new prompt, workflow, architecture decision, or template from scratch</div>
              </div>
              <ChevronRight size={16} className="text-slate-600 group-hover:text-violet-400 transition-colors" />
            </button>

            {/* Import from Memo Bank */}
            <button
              onClick={() => setMode('import')}
              className="flex items-center gap-4 p-5 rounded-2xl border text-left transition-all hover:border-cyan-500/40 hover:bg-cyan-500/5 group"
              style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0891b2, #00E5FF)' }}>
                <Database size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="mono font-semibold text-white text-sm mb-1 group-hover:text-cyan-300 transition-colors">IMPORT_FROM_MEMO_BANK</div>
                <div className="text-xs text-slate-500">Pull memories from your Memo Bank projects and publish them to the community</div>
              </div>
              <ChevronRight size={16} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
            </button>
          </div>
        )}

        {mode === 'create' && (
          <>
            <button onClick={() => setMode('choose')} className="flex items-center gap-2 text-xs mono text-slate-400 hover:text-white transition-colors mb-5">
              ← BACK
            </button>
            <NewMemoryForm />
          </>
        )}

        {mode === 'import' && (
          <ImportModal onClose={() => setMode('choose')} embedded />
        )}
      </div>
    </Layout>
  );
}
