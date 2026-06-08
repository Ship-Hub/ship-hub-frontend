import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { projectsApi, memoriesApi, type ProjectStatus } from '../lib/api';
import { Layout } from '../components/Layout';
import { MemoryCard } from '../components/MemoryCard';
import { useAuthStore } from '../store/auth';
import { useComposeStore } from '../store/compose';
import { timeAgo } from '../lib/utils';
import { CommentBody, CommentInput } from '../components/CommentInput';
import { Loader2, FolderKanban, Globe, GitBranch, Users, BookOpen, Trash2, X, ArrowLeft, Pencil, Heart, MessageSquare, Quote } from 'lucide-react';

const STATUS_COLOR_MAP: Record<ProjectStatus, string> = {
  building: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  launched: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  archived: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { setQuoteProject } = useComposeStore();
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  const projectQ = useQuery({ queryKey: ['project', id], queryFn: () => projectsApi.get(id!).then(r => r.data) });
  const memoriesQ = useQuery({ queryKey: ['project-memories', id], queryFn: () => projectsApi.memories(id!).then(r => r.data.memories) });
  const followStatusQ = useQuery({ queryKey: ['project-follow', id], queryFn: () => projectsApi.followStatus(id!).then(r => r.data.following), enabled: !!user });

  const followMut = useMutation({
    mutationFn: () => projectsApi.follow(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', id] }); qc.invalidateQueries({ queryKey: ['project-follow', id] }); },
  });
  const likeMut = useMutation({
    mutationFn: () => projectsApi.like(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', id] }); qc.invalidateQueries({ queryKey: ['feed'] }); },
  });
  const commentMut = useMutation({
    mutationFn: () => projectsApi.comment(id!, commentText),
    onSuccess: (res) => {
      setComments(prev => [...prev, res.data]);
      setCommentText('');
      qc.invalidateQueries({ queryKey: ['project', id] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
  const deleteCommentMut = useMutation({
    mutationFn: (commentId: string) => projectsApi.deleteComment(commentId),
    onSuccess: (_data, commentId) => {
      setComments(prev => prev.filter((c: any) => c.comment.id !== commentId));
      qc.invalidateQueries({ queryKey: ['project', id] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => projectsApi.delete(id!),
    onSuccess: () => navigate('/projects'),
  });

  const updateMut = useMutation({
    mutationFn: () => projectsApi.update(id!, editForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', id] }); setEditMode(false); },
  });

  const removeMemoryMut = useMutation({
    mutationFn: (memoryId: string) => projectsApi.removeMemory(id!, memoryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-memories', id] }),
  });

  if (projectQ.isLoading) return <Layout><div className="flex items-center justify-center h-64"><Loader2 size={20} className="animate-spin text-slate-400" /></div></Layout>;

  const { project, owner } = projectQ.data ?? {};
  if (!project) return null;

  const isOwner = user?.id === project.userId;
  const isFollowing = followStatusQ.data;
  const act = (fn: () => void) => { if (!user) { navigate('/login'); return; } fn(); };

  const loadComments = async () => {
    if (!commentsLoaded) {
      const res = await projectsApi.comments(project.id);
      setComments(res.data.comments ?? []);
      setCommentsLoaded(true);
    }
    setShowComments(p => !p);
  };

  const startEdit = () => {
    setEditForm({ name: project.name, description: project.description ?? '', status: project.status, websiteUrl: project.websiteUrl ?? '', githubUrl: project.githubUrl ?? '' });
    setEditMode(true);
  };

  return (
    <Layout>
      <div className="max-w-[680px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/projects')} className="flex items-center gap-2 text-xs mono text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={14} /> PROJECTS
          </button>
          {isOwner && (
            <div className="flex items-center gap-2">
              <button onClick={startEdit} className="flex items-center gap-1.5 text-xs mono text-slate-400 hover:text-slate-400 transition-colors px-2 py-1 rounded border" style={{ borderColor: 'var(--color-border)' }}>
                <Pencil size={12} /> EDIT
              </button>
              <button onClick={() => confirm('Delete this project?') && deleteMut.mutate()} className="flex items-center gap-1.5 text-xs mono text-slate-400 hover:text-red-400 transition-colors px-2 py-1 rounded border" style={{ borderColor: 'var(--color-border)' }}>
                <Trash2 size={12} /> DELETE
              </button>
            </div>
          )}
        </div>

        {/* Project header */}
        <div className="rounded-2xl border p-6 mb-6" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          {editMode ? (
            <div className="space-y-3">
              {[{ k: 'name', l: 'NAME' }, { k: 'description', l: 'DESCRIPTION', ta: true }, { k: 'websiteUrl', l: 'WEBSITE' }, { k: 'githubUrl', l: 'GITHUB' }].map(({ k, l, ta }) => (
                <div key={k}>
                  <label className="block text-xs mono text-slate-400 mb-1">{l}</label>
                  {ta ? (
                    <textarea value={editForm[k]} onChange={e => setEditForm((f: any) => ({ ...f, [k]: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-slate-500 resize-none" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }} />
                  ) : (
                    <input value={editForm[k]} onChange={e => setEditForm((f: any) => ({ ...f, [k]: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-slate-500" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }} />
                  )}
                </div>
              ))}
              <div>
                <label className="block text-xs mono text-slate-400 mb-1">STATUS</label>
                <select value={editForm.status} onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm text-white outline-none" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}>
                  <option value="building">Building</option>
                  <option value="launched">Launched</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => updateMut.mutate()} disabled={updateMut.isPending} className="flex items-center gap-1.5 text-xs mono text-emerald-400 hover:text-emerald-300 transition-colors">
                  <Check size={13} />{updateMut.isPending ? 'SAVING...' : 'SAVE'}
                </button>
                <button onClick={() => setEditMode(false)} className="flex items-center gap-1.5 text-xs mono text-slate-400 hover:text-white transition-colors">
                  <X size={13} /> CANCEL
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--color-elevated)' }}>
                    <FolderKanban size={22} className="text-slate-400" />
                  </div>
                  <div>
                    <h1 className="mono text-xl font-bold text-white">{project.name}</h1>
                    <Link to={`/u/${owner?.username}`} className="text-xs mono text-slate-400 hover:text-white transition-colors">@{owner?.username}</Link>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs mono px-2 py-0.5 rounded border ${STATUS_COLOR_MAP[project.status]}`}>{project.status.toUpperCase()}</span>
                  {!isOwner && user && (
                    <button onClick={() => followMut.mutate()} disabled={followMut.isPending} className="px-4 py-2 rounded-lg text-xs mono font-semibold transition-all" style={isFollowing ? { backgroundColor: 'var(--color-elevated)', color: '#94a3b8', border: '1px solid var(--color-border)' } : { background: 'var(--color-accent)', color: 'white' }}>
                      {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                    </button>
                  )}
                </div>
              </div>

              {project.description && <p className="text-slate-300 text-sm mb-4">{project.description}</p>}

              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1 text-xs mono text-slate-500"><BookOpen size={11} />{project.memoryCount} memories</span>
                <span className="flex items-center gap-1 text-xs mono text-slate-500"><Users size={11} />{project.followerCount} followers</span>
                {project.websiteUrl && <a href={project.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs mono text-cyan-400 hover:text-cyan-300"><Globe size={11} />website</a>}
                {project.githubUrl && <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs mono text-slate-400 hover:text-white"><GitBranch size={11} />github</a>}
                <span className="ml-auto text-xs mono text-slate-600">{timeAgo(project.createdAt)}</span>
              </div>

              <div className="flex items-center gap-1 mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button onClick={() => act(() => likeMut.mutate())} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-pink-400 hover:bg-white/5 transition-all">
                  <Heart size={13} />
                  {(project.likeCount ?? 0) > 0 && <span>{project.likeCount}</span>}
                </button>
                <button onClick={() => act(loadComments)} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all">
                  <MessageSquare size={13} />
                  {(project.commentCount ?? 0) > 0 && <span>{project.commentCount}</span>}
                </button>
                <button onClick={() => act(() => setQuoteProject({ project, owner: owner! }))} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-violet-400 hover:bg-white/5 transition-all">
                  <Quote size={13} />
                  Quote
                </button>
              </div>

              {showComments && (
                <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: 'var(--color-border)' }}>
                  {comments.map((c: any) => (
                    <div key={c.comment.id} className="flex gap-2.5">
                      <Link to={`/u/${c.author?.username}`} className="flex-shrink-0">
                        <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold" style={{ background: 'var(--color-accent)', color: 'white' }}>
                          {c.author?.avatar
                            ? <img src={c.author.avatar} alt="" className="w-full h-full object-cover" />
                            : c.author?.username?.[0]?.toUpperCase()}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-500 mb-0.5">
                          <span className="font-semibold text-slate-300">{c.author?.displayName || c.author?.username}</span>
                          {' - '}{timeAgo(c.comment.createdAt)}
                        </div>
                        <CommentBody content={c.comment.content} />
                        {user?.id === c.comment.userId && (
                          <button onClick={() => deleteCommentMut.mutate(c.comment.id)} className="text-xs text-slate-600 hover:text-red-400 transition-colors mt-0.5">
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {user && (
                    <CommentInput
                      value={commentText}
                      onChange={setCommentText}
                      onSubmit={() => { if (commentText.trim()) commentMut.mutate(); }}
                      placeholder="Write a project reply..."
                      isPending={commentMut.isPending}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Memories */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="mono text-sm font-semibold text-white">MEMORIES</h2>
        </div>

        {memoriesQ.isLoading && <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-slate-400" /></div>}

        <div className="space-y-4">
          {memoriesQ.data?.map(({ memory, author }: any) => (
            <div key={memory.id} className="relative">
              <MemoryCard memory={memory} author={author} />
              {isOwner && (
                <button onClick={() => removeMemoryMut.mutate(memory.id)} className="absolute top-3 right-3 text-slate-600 hover:text-red-400 transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
          {!memoriesQ.isLoading && memoriesQ.data?.length === 0 && (
            <div className="text-center py-12 text-xs mono text-slate-600">
              NO_MEMORIES_ATTACHED
              {isOwner && <p className="mt-1 text-slate-700">Open any memory and add it to this project</p>}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Check({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
