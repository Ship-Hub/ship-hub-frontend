import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { importExportApi, authApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { X, Database, ChevronRight, Check, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { CATEGORY_COLORS } from '../lib/utils';
import { cn } from '../lib/utils';

type Step = 'key' | 'projects' | 'memories' | 'importing' | 'done';

interface Props { onClose: () => void; embedded?: boolean; }

export function ImportModal({ onClose, embedded = false }: Props) {
  const { user, setAuth } = useAuthStore();
  const navigate = useNavigate();

  const isConnected = !!user?.memoBankUserId;
  const [step, setStep] = useState<Step>(isConnected ? 'projects' : 'key');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [mbMemories, setMbMemories] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importResult, setImportResult] = useState<{ imported: number } | null>(null);

  // Auto-load projects if already connected
  useQuery({
    queryKey: ['mb-projects-auto'],
    queryFn: () => importExportApi.mbProjects().then(r => r.data),
    enabled: isConnected && step === 'projects',
    onSuccess: (data: any) => setProjects(data.projects ?? []),
  } as any);

  const fetchProjectsMut = useMutation({
    mutationFn: () => importExportApi.mbProjects(apiKey || undefined).then(r => r.data),
    onSuccess: (data) => { setProjects(data.projects ?? []); setStep('projects'); setKeyError(''); },
    onError: (err: any) => setKeyError(err.response?.data?.message ?? 'Could not connect to Memo Bank'),
  });

  const fetchMemoriesMut = useMutation({
    mutationFn: (projectId: string) => importExportApi.mbMemories(projectId, apiKey || undefined).then(r => r.data),
    onSuccess: (data) => { setMbMemories(data.memories ?? []); setSelected(new Set(data.memories.map((m: any) => m.mbId))); setStep('memories'); },
  });

  const importMut = useMutation({
    mutationFn: () => {
      const toImport = mbMemories.filter(m => selected.has(m.mbId)).map((m: any) => ({
        title: m.title, content: m.content, category: m.category, tags: m.tags, visibility: 'public' as const,
      }));
      return importExportApi.importMemories(toImport).then(r => r.data);
    },
    onSuccess: (data) => { setImportResult(data); setStep('done'); },
  });

  const connectAndProceed = async () => {
    if (!apiKey) return;
    // Also connect the key to the account for future use
    try {
      const res = await authApi.connectMemoBank(apiKey);
      // refresh user in store
      const meRes = await authApi.me();
      setAuth(meRes.data.user, localStorage.getItem('shiphub_token')!);
    } catch {}
    fetchProjectsMut.mutate();
  };

  const toggleAll = () => {
    if (selected.size === mbMemories.length) setSelected(new Set());
    else setSelected(new Set(mbMemories.map(m => m.mbId)));
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const inner = (
    <div className={`w-full max-w-lg rounded-2xl border flex flex-col ${embedded ? '' : ''}`} style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)', maxHeight: embedded ? 'none' : '85vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #00E5FF 100%)' }}>
              <Database size={15} className="text-white" />
            </div>
            <div>
              <h2 className="mono font-semibold text-white text-sm">IMPORT_FROM_MEMO_BANK</h2>
              {isConnected && <p className="text-xs text-cyan-400 mono">connected as @{user?.memoBankUsername}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-5 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
          {(['key', 'projects', 'memories'] as Step[]).filter(s => isConnected ? s !== 'key' : true).map((s, i, arr) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-xs mono font-bold transition-all',
                step === s ? 'text-white' : ['done', 'importing'].includes(step) || arr.indexOf(step) > arr.indexOf(s) ? 'text-white' : 'text-slate-600'
              )} style={{ backgroundColor: step === s ? 'var(--color-violet)' : (['done', 'importing'].includes(step) || arr.indexOf(step) > arr.indexOf(s)) ? '#1E293B' : 'var(--color-elevated)' }}>
                {(['done', 'importing'].includes(step) || arr.indexOf(step) > arr.indexOf(s)) ? <Check size={10} /> : i + 1}
              </div>
              <span className={cn('text-xs mono', step === s ? 'text-white' : 'text-slate-600')}>{s.toUpperCase()}</span>
              {i < arr.length - 1 && <ChevronRight size={12} className="text-slate-700" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* Step: Key */}
          {step === 'key' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Enter your Memo Bank API key to browse and import your memories.
                {' '}<a href="https://memobank.online/api-keys" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">Find it here →</a>
              </p>

              {keyError && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs mono">
                  <AlertCircle size={13} />{keyError}
                </div>
              )}

              <div>
                <label className="block text-xs mono text-slate-400 mb-1.5">MEMO_BANK_API_KEY</label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && apiKey && connectAndProceed()}
                    autoFocus
                    className="w-full px-3 py-2.5 pr-10 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-violet-500 transition-colors font-mono"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
                    placeholder="mb_••••••••••••••••"
                  />
                  <button type="button" onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-xs text-slate-600 mt-1.5">This key will be saved to your profile for future imports.</p>
              </div>

              <button
                onClick={connectAndProceed}
                disabled={!apiKey || fetchProjectsMut.isPending}
                className="w-full py-2.5 rounded-lg text-xs mono font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}
              >
                {fetchProjectsMut.isPending ? <span className="flex items-center justify-center gap-2"><Loader2 size={13} className="animate-spin" />CONNECTING...</span> : 'CONNECT_&_BROWSE'}
              </button>
            </div>
          )}

          {/* Step: Projects */}
          {step === 'projects' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mono mb-3">Select a project to import memories from:</p>
              {projects.length === 0 && <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-violet-400" /></div>}
              {projects.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedProject(p); fetchMemoriesMut.mutate(p.id); }}
                  className="w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all hover:border-violet-500/40 hover:bg-violet-500/5"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
                  disabled={fetchMemoriesMut.isPending}
                >
                  <div>
                    <div className="mono text-sm font-semibold text-white">{p.name}</div>
                    {p.slug && <div className="text-xs mono text-slate-500">{p.slug}</div>}
                  </div>
                  {fetchMemoriesMut.isPending && selectedProject?.id === p.id
                    ? <Loader2 size={14} className="animate-spin text-violet-400" />
                    : <ChevronRight size={14} className="text-slate-500" />
                  }
                </button>
              ))}
            </div>
          )}

          {/* Step: Memories */}
          {step === 'memories' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-400">
                  <span className="text-white mono font-semibold">{selected.size}</span> of {mbMemories.length} selected
                </p>
                <button onClick={toggleAll} className="text-xs mono text-violet-400 hover:text-violet-300 transition-colors">
                  {selected.size === mbMemories.length ? 'DESELECT_ALL' : 'SELECT_ALL'}
                </button>
              </div>

              {mbMemories.length === 0 && (
                <div className="text-center py-8 text-xs mono text-slate-500">No approved memories in this project</div>
              )}

              <div className="space-y-2">
                {mbMemories.map((m: any) => (
                  <label key={m.mbId} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:border-violet-500/30" style={{ borderColor: selected.has(m.mbId) ? 'rgba(139,92,246,0.4)' : 'var(--color-border)', backgroundColor: selected.has(m.mbId) ? 'rgba(139,92,246,0.05)' : 'var(--color-elevated)' }}>
                    <div className="flex-shrink-0 mt-0.5">
                      <div className={cn('w-4 h-4 rounded flex items-center justify-center border transition-all', selected.has(m.mbId) ? 'border-violet-500 bg-violet-500' : 'border-slate-600')} onClick={() => toggle(m.mbId)}>
                        {selected.has(m.mbId) && <Check size={10} className="text-white" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="mono text-xs font-semibold text-white line-clamp-1">{m.title}</span>
                        <span className={cn('text-xs mono px-1.5 py-0 rounded border flex-shrink-0', CATEGORY_COLORS[m.category] ?? 'text-slate-400 bg-slate-400/10 border-slate-400/20')}>{m.category}</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{m.content.slice(0, 100)}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs mono text-slate-600">type: {m.mbType}</span>
                        {m.tags?.length > 0 && <span className="text-xs text-slate-600">· {m.tags.slice(0, 3).map((t: string) => `#${t}`).join(' ')}</span>}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && importResult && (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #00E5FF 100%)' }}>
                <Check size={24} className="text-white" />
              </div>
              <h3 className="mono text-lg font-bold text-white mb-1">IMPORT_COMPLETE</h3>
              <p className="text-slate-400 text-sm">{importResult.imported} memor{importResult.imported === 1 ? 'y' : 'ies'} imported to your feed</p>
              <button onClick={() => { onClose(); navigate('/'); }} className="mt-5 px-6 py-2.5 rounded-lg text-xs mono font-semibold text-white transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}>
                VIEW_FEED
              </button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {step === 'memories' && (
          <div className="flex items-center justify-between p-5 border-t flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <button onClick={() => setStep('projects')} className="text-xs mono text-slate-400 hover:text-white transition-colors">← BACK</button>
            <button
              onClick={() => importMut.mutate()}
              disabled={selected.size === 0 || importMut.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs mono font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}
            >
              {importMut.isPending ? <><Loader2 size={13} className="animate-spin" />IMPORTING...</> : `IMPORT_${selected.size}`}
            </button>
          </div>
        )}
    </div>
  );

  if (embedded) return inner;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      {inner}
    </div>
  );
}
