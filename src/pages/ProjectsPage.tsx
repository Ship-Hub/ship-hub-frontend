import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { projectsApi, type ProjectWithOwner, type ProjectStatus } from '../lib/api';
import { Layout } from '../components/Layout';
import { ProjectCard } from '../components/ProjectCard';
import { useAuthStore } from '../store/auth';
import { timeAgo } from '../lib/utils';
import { FolderKanban, Globe, GitBranch, Users, BookOpen, Plus, X, Loader2 } from 'lucide-react';

const STATUS_COLORS: Record<ProjectStatus, string> = {
  building: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  launched: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  archived: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};

function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '', status: 'building' as ProjectStatus, websiteUrl: '', githubUrl: '' });

  const createMut = useMutation({
    mutationFn: () => projectsApi.create(form),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['projects'] }); navigate(`/projects/${res.data.id}`); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl border p-6" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="mono font-semibold text-white text-sm">NEW_PROJECT</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs mono text-slate-400 mb-1.5">NAME</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-slate-500 transition-colors" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }} placeholder="My AI Project" />
          </div>
          <div>
            <label className="block text-xs mono text-slate-400 mb-1.5">DESCRIPTION</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-slate-500 transition-colors resize-none" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }} placeholder="What are you building?" />
          </div>
          <div>
            <label className="block text-xs mono text-slate-400 mb-1.5">STATUS</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))} className="w-full px-3 py-2.5 rounded-lg border text-sm text-white outline-none" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}>
              <option value="building">Building</option>
              <option value="launched">Launched</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-xs mono text-slate-400 mb-1.5">WEBSITE (optional)</label>
            <input value={form.websiteUrl} onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-slate-500 transition-colors" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs mono text-slate-400 mb-1.5">GITHUB (optional)</label>
            <input value={form.githubUrl} onChange={e => setForm(f => ({ ...f, githubUrl: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-slate-500 transition-colors" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }} placeholder="https://github.com/..." />
          </div>
          <button onClick={() => createMut.mutate()} disabled={!form.name || createMut.isPending} className="w-full py-2.5 rounded-lg text-xs mono font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: 'var(--color-accent)' }}>
            {createMut.isPending ? 'CREATING...' : 'CREATE_PROJECT'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProjectsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then(r => r.data),
  });

  return (
    <Layout>
      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
      <div className="max-w-[680px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Projects</h1>
            <p className="text-xs text-slate-500 mt-0.5">What builders are shipping</p>
          </div>
          {user && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs mono font-semibold text-white transition-all hover:opacity-90" style={{ backgroundColor: 'var(--color-accent)' }}>
              <Plus size={14} /> New project
            </button>
          )}
        </div>

        {isLoading && <div className="flex justify-center py-20"><Loader2 size={20} className="animate-spin text-slate-400" /></div>}

        <div className="grid gap-4">
          {data?.projects?.map(({ project, owner }: ProjectWithOwner) => (
            <ProjectCard key={project.id} project={project} author={owner} />
          ))}

          {!isLoading && data?.projects?.length === 0 && (
            <div className="text-center py-20">
              <FolderKanban size={32} className="text-slate-700 mx-auto mb-3" />
              <p className="mono text-slate-400 text-sm">NO_PROJECTS_YET</p>
              {user && <button onClick={() => setShowCreate(true)} className="mt-3 text-xs mono text-slate-400 hover:opacity-80 transition-colors">Create the first one â†’</button>}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
