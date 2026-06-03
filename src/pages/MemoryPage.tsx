import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Helmet } from 'react-helmet-async';

const APP_URL = import.meta.env.VITE_APP_URL ?? 'https://community.memobank.online';
import { memoriesApi, type CommentWithAuthor } from '../lib/api';
import { Layout } from '../components/Layout';
import { useAuthStore } from '../store/auth';
import { cn, timeAgo } from '../lib/utils';
import { Heart, Bookmark, GitFork, Clock, ArrowLeft, Loader2, Pencil, Check, X, MessageSquare, Download, Trash2, Plus } from 'lucide-react';
import { CATEGORIES, CATEGORY_COLORS } from '../lib/utils';
import { CommentInput, CommentBody } from '../components/CommentInput';
import { importExportApi } from '../lib/api';

export function MemoryPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');
  const [commentText, setCommentText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['memory', id],
    queryFn: () => memoriesApi.get(id!).then(r => r.data),
  });

  const { data: commentsData } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => memoriesApi.comments(id!).then(r => r.data),
  });

  const likeMut = useMutation({ mutationFn: () => memoriesApi.like(id!), onSuccess: () => qc.invalidateQueries({ queryKey: ['memory', id] }) });
  const saveMut = useMutation({ mutationFn: () => memoriesApi.save(id!), onSuccess: () => qc.invalidateQueries({ queryKey: ['memory', id] }) });
  const forkMut = useMutation({ mutationFn: () => memoriesApi.fork(id!), onSuccess: (res) => navigate(`/memory/${res.data.id}`) });
  const deleteMut = useMutation({ mutationFn: () => memoriesApi.delete(id!), onSuccess: () => navigate('/') });

  const updateMut = useMutation({
    mutationFn: () => memoriesApi.update(id!, { title: editTitle, content: editContent, category: editCategory as any, tags: editTags }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['memory', id] }); setEditing(false); },
  });

  const commentMut = useMutation({
    mutationFn: () => memoriesApi.comment(id!, commentText),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comments', id] }); setCommentText(''); },
  });

  const deleteCommentMut = useMutation({
    mutationFn: (cid: string) => memoriesApi.deleteComment(cid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', id] }),
  });

  const act = (fn: () => void) => { if (!user) { navigate('/login'); return; } fn(); };

  const startEdit = () => {
    if (!data) return;
    setEditTitle(data.memory.title);
    setEditContent(data.memory.content);
    setEditCategory(data.memory.category);
    setEditTags([...(data.memory.tags ?? [])]);
    setEditing(true);
  };

  const addEditTag = () => {
    const tag = editTagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !editTags.includes(tag) && editTags.length < 8) {
      setEditTags(t => [...t, tag]);
      setEditTagInput('');
    }
  };

  if (isLoading) return <Layout><div className="flex items-center justify-center h-64"><Loader2 size={20} className="animate-spin text-slate-400" /></div></Layout>;
  if (!data) return null;

  const { memory, author } = data;
  const categoryClass = CATEGORY_COLORS[memory.category] ?? 'text-slate-400 bg-slate-400/10 border-slate-400/20';
  const isOwner = user?.id === memory.userId;
  const isFork = !!memory.forkedFromId;

  const ogDesc = memory.content.slice(0, 160).replace(/```[\s\S]*?```/g, '[code]').replace(/[#*`]/g, '');

  return (
    <Layout>
      <Helmet>
        <title>{memory.title} â€” ShipHub</title>
        <meta name="description" content={ogDesc} />
        <meta property="og:title" content={memory.title} />
        <meta property="og:description" content={ogDesc} />
        <meta property="og:url" content={`${APP_URL}/memory/${memory.id}`} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={memory.title} />
        <meta name="twitter:description" content={ogDesc} />
      </Helmet>
      <div className="max-w-[680px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs mono text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={14} /> BACK
          </button>
          <div className="flex items-center gap-2">
            <a href={importExportApi.exportOne(id!, 'markdown')} download className="flex items-center gap-1.5 text-xs mono text-slate-400 hover:text-emerald-400 transition-colors px-2 py-1 rounded border" style={{ borderColor: 'var(--color-border)' }}>
              <Download size={12} /> MD
            </a>
            <a href={importExportApi.exportOne(id!, 'json')} download className="flex items-center gap-1.5 text-xs mono text-slate-400 hover:text-cyan-400 transition-colors px-2 py-1 rounded border" style={{ borderColor: 'var(--color-border)' }}>
              <Download size={12} /> JSON
            </a>
          </div>
        </div>

        <div className="rounded-2xl border p-6 mb-4" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          {/* Fork attribution chain */}
          {isFork && (
            <div className="flex flex-col gap-1 mb-4 p-3 rounded-lg border" style={{ backgroundColor: 'var(--color-elevated)', borderColor: 'rgba(0,229,255,0.1)' }}>
              <div className="flex items-center gap-1.5 text-xs mono text-cyan-400">
                <GitFork size={11} />
                Forked from{' '}
                <Link to={`/memory/${memory.forkedFromId}`} className="hover:text-cyan-300 underline underline-offset-2 transition-colors">
                  parent memory
                </Link>
              </div>
              {memory.originalMemoryId && memory.originalMemoryId !== memory.forkedFromId && (
                <div className="flex items-center gap-1.5 text-xs mono text-slate-400 pl-4">
                  <span className="text-slate-600">â†‘</span> Originally by{' '}
                  <Link to={`/memory/${memory.originalMemoryId}`} className="hover:opacity-80 underline underline-offset-2 transition-colors">
                    root memory
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            {editing ? (
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="flex-1 mono text-xl font-bold text-white bg-transparent border-b border-slate-500 outline-none pb-1"
                autoFocus
              />
            ) : (
              <h1 className="mono text-xl font-bold text-white flex-1">{memory.title}</h1>
            )}
            {editing ? (
              <select
                value={editCategory}
                onChange={e => setEditCategory(e.target.value)}
                className="text-xs mono px-2 py-1 rounded border outline-none flex-shrink-0"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)', color: 'white' }}
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            ) : (
              <Link
                to={`/browse?category=${memory.category}`}
                className={cn('text-xs mono px-2 py-1 rounded border flex-shrink-0 hover:opacity-80 transition-opacity', categoryClass)}
              >
                {memory.category.toUpperCase()}
              </Link>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 mb-6 pb-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
            {author && (
              <Link to={`/u/${author.username}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs mono font-bold" style={{ backgroundColor: 'var(--color-violet)', color: 'white' }}>
                  {author.username[0].toUpperCase()}
                </div>
                <span className="text-xs mono text-slate-300">@{author.username}</span>
              </Link>
            )}
            <span className="flex items-center gap-1 text-xs mono text-slate-500">
              <Clock size={10} />{timeAgo(memory.createdAt)}
            </span>
          </div>

          {/* Content */}
          {editing ? (
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={12}
              className="w-full bg-transparent text-slate-300 text-sm leading-relaxed outline-none resize-none border rounded-lg p-3 mb-4"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
            />
          ) : (
            <div className="prose-memory mb-6">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="mono text-lg font-bold text-white mt-5 mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="mono text-base font-bold text-white mt-4 mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="mono text-sm font-bold text-slate-200 mt-3 mb-1">{children}</h3>,
                  p: ({ children }) => <p className="text-slate-300 text-sm leading-relaxed mb-3">{children}</p>,
                  code: ({ children, className }) => {
                    const isBlock = className?.includes('language-');
                    return isBlock
                      ? <code className={`block text-xs font-mono text-cyan-300 bg-slate-900/60 border border-slate-700/50 rounded-lg p-3 mb-3 overflow-x-auto whitespace-pre ${className}`}>{children}</code>
                      : <code className="text-xs font-mono text-cyan-300 bg-slate-800/60 px-1.5 py-0.5 rounded">{children}</code>;
                  },
                  pre: ({ children }) => <>{children}</>,
                  ul: ({ children }) => <ul className="list-disc list-inside text-slate-300 text-sm space-y-1 mb-3 pl-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside text-slate-300 text-sm space-y-1 mb-3 pl-1">{children}</ol>,
                  li: ({ children }) => <li className="text-slate-300 text-sm">{children}</li>,
                  blockquote: ({ children }) => <blockquote className="border-l-2 border-slate-500 pl-4 italic text-slate-400 text-sm mb-3">{children}</blockquote>,
                  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:opacity-80 underline underline-offset-2 transition-colors">{children}</a>,
                  strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="text-slate-300 italic">{children}</em>,
                  hr: () => <hr className="border-slate-700 my-4" />,
                  table: ({ children }) => <div className="overflow-x-auto mb-3"><table className="w-full text-xs text-slate-300 border-collapse">{children}</table></div>,
                  th: ({ children }) => <th className="mono text-left text-slate-400 border border-slate-700 px-3 py-1.5 bg-slate-800/50">{children}</th>,
                  td: ({ children }) => <td className="border border-slate-700/50 px-3 py-1.5">{children}</td>,
                }}
              >
                {memory.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Tag editor (edit mode) */}
          {editing && (
            <div className="mb-4">
              <label className="block text-xs mono text-slate-400 mb-2">TAGS</label>
              <div className="flex gap-2 mb-2">
                <input
                  value={editTagInput}
                  onChange={e => setEditTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEditTag(); } }}
                  placeholder="add-tag"
                  className="flex-1 px-3 py-1.5 rounded-lg border text-xs text-white bg-transparent outline-none focus:border-slate-500 transition-colors"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
                />
                <button
                  type="button"
                  onClick={addEditTag}
                  className="px-3 py-1.5 rounded-lg border text-xs mono text-slate-300 hover:text-white transition-colors"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
                >
                  <Plus size={11} />
                </button>
              </div>
              {editTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {editTags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-xs mono px-2 py-0.5 rounded"
                      style={{ backgroundColor: 'var(--color-elevated)', color: '#94a3b8' }}>
                      #{tag}
                      <button onClick={() => setEditTags(t => t.filter(x => x !== tag))} className="hover:text-red-400 transition-colors">
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {!editing && memory.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {memory.tags.map((tag: string) => (
                <Link
                  key={tag}
                  to={`/browse?tag=${encodeURIComponent(tag)}`}
                  className="text-xs mono px-2 py-0.5 rounded transition-colors hover:text-slate-400"
                  style={{ backgroundColor: 'var(--color-elevated)', color: '#64748B' }}
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            {editing ? (
              <div className="flex items-center gap-2">
                <button onClick={() => updateMut.mutate()} disabled={updateMut.isPending} className="flex items-center gap-1.5 text-xs mono text-emerald-400 hover:text-emerald-300 transition-colors">
                  <Check size={13} /> {updateMut.isPending ? 'SAVING...' : 'SAVE'}
                </button>
                <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 text-xs mono text-slate-400 hover:text-white transition-colors">
                  <X size={13} /> CANCEL
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button onClick={() => act(() => likeMut.mutate())} className="flex items-center gap-1.5 text-sm mono text-slate-400 hover:text-pink-400 transition-colors">
                  <Heart size={15} />{memory.likeCount}
                </button>
                <button onClick={() => act(() => forkMut.mutate())} disabled={forkMut.isPending || memory.userId === user?.id} className="flex items-center gap-1.5 text-sm mono text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-30">
                  <GitFork size={15} />{memory.forkCount} Fork
                </button>
                <button onClick={() => act(() => saveMut.mutate())} className="flex items-center gap-1.5 text-sm mono text-slate-400 hover:text-amber-400 transition-colors">
                  <Bookmark size={15} />{memory.saveCount} Save
                </button>
              </div>
            )}

            {isOwner && !editing && (
              <div className="flex items-center gap-3">
                <button onClick={startEdit} className="flex items-center gap-1.5 text-xs mono text-slate-400 hover:text-slate-400 transition-colors">
                  <Pencil size={13} /> EDIT
                </button>
                <button
                  onClick={() => { if (confirm('Delete this memory? This cannot be undone.')) deleteMut.mutate(); }}
                  className="flex items-center gap-1.5 text-xs mono text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={13} /> DELETE
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Comments */}
        <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <h2 className="mono text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <MessageSquare size={14} className="text-slate-400" />
            COMMENTS <span className="text-slate-500 font-normal">({commentsData?.comments?.length ?? 0})</span>
          </h2>

          {/* Comment input */}
          {user ? (
            <div className="mb-6">
              <CommentInput
                value={commentText}
                onChange={setCommentText}
                onSubmit={() => commentText.trim() && commentMut.mutate()}
                isPending={commentMut.isPending}
              />
            </div>
          ) : (
            <p className="text-xs mono text-slate-500 mb-4">
              <Link to="/login" className="text-slate-400 hover:opacity-80">Sign in</Link> to comment
            </p>
          )}

          {/* Comment list */}
          <div className="space-y-4">
            {commentsData?.comments?.map(({ comment, author: ca }: CommentWithAuthor) => (
              <div key={comment.id} className="flex gap-3">
                <Link to={`/u/${ca?.username}`}>
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs mono font-bold" style={{ backgroundColor: 'var(--color-elevated)', color: 'var(--color-cyan)' }}>
                    {ca?.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                </Link>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Link to={`/u/${ca?.username}`} className="text-xs mono text-slate-300 hover:text-white transition-colors">
                      @{ca?.username}
                    </Link>
                    <span className="text-xs mono text-slate-600">{timeAgo(comment.createdAt)}</span>
                  </div>
                  <CommentBody content={comment.content} />
                </div>
                {user?.id === comment.userId && (
                  <button onClick={() => deleteCommentMut.mutate(comment.id)} className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            {commentsData?.comments?.length === 0 && (
              <p className="text-xs mono text-slate-600 text-center py-4">NO_COMMENTS_YET</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
