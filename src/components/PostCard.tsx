import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { postsApi, type Post, type AuthorSnippet, type ReactionMap } from '../lib/api';
import type { PostWithAuthor } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { useComposeStore } from '../store/compose';
import { timeAgo, processContent } from '../lib/utils';
import {
  Heart, Bookmark, MessageSquare, Trash2, ChevronDown, ChevronUp,
  Code2, Quote, Pencil, Check, X, Copy, Users, BarChart3,
  HelpCircle, Zap, ExternalLink, MoreHorizontal, Repeat2,
} from 'lucide-react';
import { PostMarkdown } from './ComposeBox';
import { CommentInput, CommentBody } from './CommentInput';
import { EmbeddedQuote } from './QuoteModal';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface PostCardProps {
  post: Post;
  author: AuthorSnippet | null;
  quotedPost?: PostWithAuthor | null;
  quotedMemory?: any | null;
}

// ── Type badge ────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  build_update:   { label: 'BUILD UPDATE',    className: 'badge-build',    icon: Zap },
  code_snippet:   { label: 'CODE SNIPPET',    className: 'badge-code',     icon: Code2 },
  collab_request: { label: 'LOOKING FOR COLLABORATOR', className: 'badge-collab', icon: Users },
  poll:           { label: 'POLL',            className: 'badge-poll',     icon: BarChart3 },
  question:       { label: 'QUESTION',        className: 'badge-question', icon: HelpCircle },
};

function TypeBadge({ type }: { type: string }) {
  const meta = TYPE_META[type];
  if (!meta || type === 'general') return null;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wide ${meta.className}`}>
      <Icon size={9} />
      {meta.label}
    </span>
  );
}

// ── Shared card shell ─────────────────────────────────────────────────────

const CARD_HOVER_CLASS: Record<string, string> = {
  build_update:   'card-hover-build',
  code_snippet:   'card-hover-code',
  collab_request: 'card-hover-collab',
  poll:           'card-hover-poll',
  question:       'card-hover-question',
  general:        'card-hover-general',
};

const TOP_GLOW_COLOR: Record<string, string> = {
  build_update:   'rgba(255,77,77,0.55)',
  code_snippet:   'rgba(0,229,255,0.45)',
  collab_request: 'rgba(255,166,43,0.45)',
  poll:           'rgba(0,229,255,0.45)',
  question:       'rgba(52,211,153,0.45)',
  general:        'transparent',
};

function CardShell({ children, post }: { children: React.ReactNode; post: Post }) {
  const type = post.type || 'general';
  const hoverClass = CARD_HOVER_CLASS[type] ?? 'card-hover-general';
  const topColor = TOP_GLOW_COLOR[type] ?? 'transparent';

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${hoverClass}`}
      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
      {/* Neon top accent line */}
      {topColor !== 'transparent' && (
        <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${topColor} 40%, ${topColor} 60%, transparent 100%)`, boxShadow: `0 0 8px ${topColor}` }} />
      )}
      {children}
    </div>
  );
}

// ── Post author header ─────────────────────────────────────────────────────

function PostHeader({ post, author, onDelete, canDelete, canEdit, onStartEdit }: {
  post: Post; author: AuthorSnippet | null;
  onDelete: () => void; canDelete: boolean; canEdit: boolean; onStartEdit: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="flex items-start justify-between px-4 pt-4 pb-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <Link to={`/u/${author?.username}`} className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))', color: 'white' }}>
            {author?.avatar
              ? <img src={author.avatar} alt={author.username} className="w-full h-full object-cover" />
              : author?.username?.[0]?.toUpperCase() ?? '?'}
          </div>
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/u/${author?.username}`} className="text-sm font-semibold text-white hover:text-slate-200 transition-colors">
              {author?.displayName || author?.username}
            </Link>
            <span className="text-xs text-slate-600">@{author?.username}</span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-600">{timeAgo(post.createdAt)}</span>
          </div>
        </div>
      </div>
      <div className="relative flex-shrink-0 ml-2">
        <button onClick={() => setMenuOpen(p => !p)} className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/5 transition-all">
          <MoreHorizontal size={16} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border shadow-xl py-1"
            style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
            {canEdit && (
              <button onClick={() => { onStartEdit(); setMenuOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-all">
                <Pencil size={12} /> Edit post
              </button>
            )}
            {canDelete && (
              <button onClick={() => { onDelete(); setMenuOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/5 transition-all">
                <Trash2 size={12} /> Delete
              </button>
            )}
            {!canDelete && !canEdit && (
              <div className="px-3 py-2 text-xs text-slate-600">No actions available</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Post actions bar ──────────────────────────────────────────────────────

function PostActions({ post, user, onLike, onSave, onComment, onQuote, liked, saved, likeCount, saveCount, commentCount }: {
  post: Post; user: any;
  onLike: () => void; onSave: () => void;
  onComment: () => void; onQuote: () => void;
  liked: boolean; saved: boolean;
  likeCount: number; saveCount: number; commentCount: number;
}) {
  return (
    <div className="flex items-center gap-1 px-4 py-3 border-t post-actions" style={{ borderColor: 'var(--color-border)' }}>
      <button onClick={onLike}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5 ${liked ? 'text-red-400' : 'text-slate-500 hover:text-slate-300'}`}
        style={liked ? { textShadow: '0 0 8px rgba(255,77,77,0.7)' } : {}}>
        <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
        {likeCount > 0 && <span>{likeCount}</span>}
      </button>

      <button onClick={onComment}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all">
        <MessageSquare size={14} />
        {commentCount > 0 && <span>{commentCount}</span>}
      </button>

      <button onClick={onQuote}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all">
        <Repeat2 size={14} />
      </button>

      <button onClick={onSave}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5 ml-auto ${saved ? '' : 'text-slate-500 hover:text-slate-300'}`}
        style={saved ? { color: 'var(--color-cyan)', textShadow: '0 0 8px rgba(0,229,255,0.6)' } : {}}>
        <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}

// ── Type-specific content sections ────────────────────────────────────────

function BuildUpdateContent({ post }: { post: Post }) {
  return (
    <div className="px-4 pb-4">
      <TypeBadge type="build_update" />
      <div className="flex gap-4 mt-2">
        <div className="flex-1 min-w-0">
          {post.milestone && (
            <div className="text-xs font-semibold mb-2 px-2 py-1 rounded-md inline-block"
              style={{ backgroundColor: 'rgba(255,77,77,0.1)', color: 'var(--color-accent)' }}>
              {post.milestone}
            </div>
          )}
          <div className="text-sm text-slate-300 leading-relaxed">
            <PostMarkdown content={post.content} />
          </div>
          {post.mediaUrl && post.mediaType === 'image' && (
            <img src={post.mediaUrl} alt="" className="mt-3 rounded-xl w-full object-cover max-h-48" />
          )}
        </div>
      </div>
    </div>
  );
}

function CodeSnippetContent({ post }: { post: Post }) {
  const [copied, setCopied] = useState(false);
  const lang = post.language ?? 'typescript';

  // Extract code from markdown code block if present, else use raw content
  const codeMatch = post.content.match(/```(?:\w+)?\n?([\s\S]+?)```/);
  const code = codeMatch ? codeMatch[1].trim() : post.content;
  const title = !codeMatch ? undefined : post.content.split('\n')[0]?.replace(/^#\s*/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="px-4 pb-4">
      <TypeBadge type="code_snippet" />
      <div className="mt-2 space-y-2">
        {title && <p className="text-sm font-semibold text-white">{title}</p>}
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between px-3 py-2 border-b"
            style={{ borderColor: 'rgba(0,229,255,0.15)', backgroundColor: 'rgba(0,229,255,0.05)' }}>
            <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--color-cyan)', textShadow: '0 0 8px rgba(0,229,255,0.5)' }}>{lang}</span>
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all border"
              style={{
                color: copied ? 'var(--color-success)' : 'var(--color-cyan)',
                borderColor: copied ? 'rgba(0,217,126,0.3)' : 'rgba(0,229,255,0.25)',
                backgroundColor: copied ? 'rgba(0,217,126,0.08)' : 'rgba(0,229,255,0.07)',
                textShadow: copied ? '0 0 6px rgba(0,217,126,0.5)' : '0 0 6px rgba(0,229,255,0.4)',
              }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="text-xs max-h-48 overflow-y-auto">
            <SyntaxHighlighter
              language={lang}
              style={oneDark}
              customStyle={{ margin: 0, background: 'transparent', padding: '12px 16px', fontSize: '12px' }}
              showLineNumbers={false}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollabContent({ post }: { post: Post }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState('');
  const applyMut = useMutation({
    mutationFn: () => postsApi.apply(post.id, message),
    onSuccess: () => { setApplying(false); setMessage(''); },
  });

  return (
    <div className="px-4 pb-4">
      <TypeBadge type="collab_request" />
      <div className="flex gap-4 mt-2">
        <div className="flex-1 min-w-0">
          {post.roleNeeded && (
            <div className="text-base font-semibold text-white mb-1">{post.roleNeeded}</div>
          )}
          <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">{post.content}</p>
        </div>
        <div className="flex-shrink-0 space-y-2 min-w-[140px]">
          {post.skills && post.skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {post.skills.slice(0, 4).map(s => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-md border"
                  style={{ borderColor: 'rgba(255,166,43,0.25)', color: 'var(--color-amber)', backgroundColor: 'rgba(255,166,43,0.08)' }}>
                  {s}
                </span>
              ))}
            </div>
          )}
          {post.compensation && (
            <div className="text-xs text-slate-500 capitalize">{post.compensation.replace('_', ' ')}</div>
          )}
          {!applying ? (
            <button
              onClick={() => { if (!user) { navigate('/login'); return; } setApplying(true); }}
              className="w-full py-2 rounded-xl text-sm font-semibold text-white transition-all btn-primary"
              style={{ backgroundColor: 'var(--color-accent)', boxShadow: '0 0 14px rgba(255,77,77,0.4), 0 0 28px rgba(255,77,77,0.15)' }}>
              Let's Connect
            </button>
          ) : (
            <div className="space-y-1.5">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Brief intro..."
                rows={2}
                className="w-full px-2 py-1.5 rounded-lg text-xs border outline-none resize-none"
                style={{ backgroundColor: 'var(--color-elevated)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
              <div className="flex gap-1">
                <button onClick={() => applyMut.mutate()} disabled={!message.trim() || applyMut.isPending}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-accent)' }}>
                  {applyMut.isPending ? '...' : 'Apply'}
                </button>
                <button onClick={() => setApplying(false)} className="px-2 py-1.5 rounded-lg text-xs text-slate-500 hover:text-white transition-colors">
                  <X size={12} />
                </button>
              </div>
            </div>
          )}
          {applyMut.isSuccess && <p className="text-xs text-center" style={{ color: 'var(--color-success)' }}>Applied!</p>}
        </div>
      </div>
    </div>
  );
}

function PollContent({ post }: { post: Post }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const pollQ = useQuery({
    queryKey: ['poll', post.id],
    queryFn: () => postsApi.pollResults(post.id).then(r => r.data),
    staleTime: 30_000,
  });

  const voteMut = useMutation({
    mutationFn: (optionId: string) => postsApi.vote(post.id, optionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['poll', post.id] }),
  });

  const data = pollQ.data;
  const hasVoted = data?.options.some(o => o.myVote);

  return (
    <div className="px-4 pb-4">
      <TypeBadge type="poll" />
      <div className="mt-2">
        <p className="text-sm font-semibold text-white mb-3">{post.content}</p>
        {data ? (
          <div className="space-y-2">
            {data.options.map(opt => {
              const pct = data.totalVotes > 0 ? Math.round((opt.voteCount / data.totalVotes) * 100) : 0;
              return (
                <button key={opt.id}
                  onClick={() => { if (!user) { navigate('/login'); return; } if (!hasVoted) voteMut.mutate(opt.id); }}
                  disabled={hasVoted || voteMut.isPending}
                  className="w-full text-left">
                  <div className="relative px-3 py-2.5 rounded-xl border overflow-hidden transition-all"
                    style={{
                      borderColor: opt.myVote ? 'rgba(0,229,255,0.6)' : 'var(--color-border)',
                      backgroundColor: 'var(--color-elevated)',
                      boxShadow: opt.myVote ? '0 0 12px rgba(0,229,255,0.2), inset 0 0 20px rgba(0,229,255,0.05)' : undefined,
                    }}>
                    {/* Progress fill */}
                    <div className="absolute inset-0 rounded-xl transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: opt.myVote ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.04)' }} />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {opt.myVote && <Check size={12} style={{ color: 'var(--color-cyan)' }} />}
                        <span className="text-sm text-slate-200">{opt.text}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-400">{pct}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
            <p className="text-xs text-slate-600 mt-1">{data.totalVotes} votes{data.isAnonymous ? ' · Anonymous' : ''}{data.allowMultiple ? ' · Multiple choice' : ''}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-10 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--color-elevated)' }} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionContent({ post }: { post: Post }) {
  return (
    <div className="px-4 pb-4">
      <TypeBadge type="question" />
      <div className="mt-2">
        <p className="text-base font-semibold text-white mb-2 leading-snug">{post.content}</p>
        {post.commentCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <MessageSquare size={12} />
            <span>{post.commentCount} {post.commentCount === 1 ? 'reply' : 'replies'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function GeneralContent({ post }: { post: Post }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = post.content.length > 600 || post.content.split('\n').length > 15;
  const display = isLong && !expanded ? post.content.slice(0, 500) + '…' : post.content;

  return (
    <div className="px-4 pb-4">
      <div className="text-sm text-slate-300 leading-relaxed">
        <PostMarkdown content={display} />
      </div>
      {isLong && (
        <button onClick={() => setExpanded(p => !p)}
          className="flex items-center gap-1 mt-2 text-xs transition-colors hover:opacity-80"
          style={{ color: 'var(--color-accent)' }}>
          {expanded ? <><ChevronUp size={12} />Show less</> : <><ChevronDown size={12} />Show more</>}
        </button>
      )}
      {post.mediaUrl && (
        <div className="mt-3 rounded-xl overflow-hidden">
          {post.mediaType === 'image'
            ? <img src={post.mediaUrl} alt="" className="w-full object-cover max-h-72" />
            : <video src={post.mediaUrl} controls className="w-full max-h-72" />}
        </div>
      )}
    </div>
  );
}

// ── Main PostCard ─────────────────────────────────────────────────────────

export function PostCard({ post, author, quotedPost, quotedMemory }: PostCardProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { setQuotePost } = useComposeStore();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['feed'] });
    qc.invalidateQueries({ queryKey: ['saved', 'posts'] });
  };

  const likeMut = useMutation({ mutationFn: () => postsApi.like(post.id), onSuccess: invalidate });
  const saveMut = useMutation({ mutationFn: () => postsApi.save(post.id), onSuccess: invalidate });
  const deleteMut = useMutation({ mutationFn: () => postsApi.delete(post.id), onSuccess: invalidate });
  const editMut = useMutation({
    mutationFn: () => postsApi.edit(post.id, editContent),
    onSuccess: () => { invalidate(); setEditing(false); },
  });
  const commentMut = useMutation({
    mutationFn: () => postsApi.comment(post.id, commentText),
    onSuccess: (res) => { setComments(prev => [...prev, res.data]); setCommentText(''); qc.invalidateQueries({ queryKey: ['feed'] }); },
  });
  const deleteCommentMut = useMutation({
    mutationFn: (cid: string) => postsApi.deleteComment(cid),
    onSuccess: (_data, cid) => setComments(prev => prev.filter((c: any) => c.comment.id !== cid)),
  });

  const isOwner = user?.id === post.userId;
  const canEdit = isOwner && (Date.now() - new Date(post.createdAt).getTime() < 15 * 60 * 1000);
  const canDelete = isOwner;

  const act = (fn: () => void) => { if (!user) { navigate('/login'); return; } fn(); };

  const loadComments = async () => {
    if (!commentsLoaded) {
      const res = await postsApi.comments(post.id);
      setComments((res.data as any).comments ?? []);
      setCommentsLoaded(true);
    }
    setShowComments(p => !p);
  };

  // Determine liked/saved state from likeCount changes (optimistic not implemented)
  const liked = false; // Would need per-user like status from API
  const saved = false;

  const postType = post.type ?? 'general';

  return (
    <CardShell post={post}>
      {/* Header */}
      <PostHeader
        post={post} author={author}
        canDelete={canDelete} canEdit={canEdit}
        onDelete={() => act(() => deleteMut.mutate())}
        onStartEdit={() => { setEditContent(post.content); setEditing(true); }}
      />

      {/* Inline edit */}
      {editing && (
        <div className="px-4 pb-4 space-y-2">
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-xl text-sm border outline-none resize-none"
            style={{ backgroundColor: 'var(--color-elevated)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={() => editMut.mutate()} disabled={editMut.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)' }}>
              <Check size={12} />{editMut.isPending ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-white transition-colors">
              <X size={12} />Cancel
            </button>
          </div>
        </div>
      )}

      {/* Type-specific content */}
      {!editing && (
        <>
          {postType === 'build_update'   && <BuildUpdateContent post={post} />}
          {postType === 'code_snippet'   && <CodeSnippetContent post={post} />}
          {postType === 'collab_request' && <CollabContent post={post} />}
          {postType === 'poll'           && <PollContent post={post} />}
          {postType === 'question'       && <QuestionContent post={post} />}
          {(postType === 'general' || !postType) && <GeneralContent post={post} />}
        </>
      )}

      {/* Quoted content */}
      {(quotedPost || quotedMemory) && !editing && (
        <div className="px-4 pb-4">
          <EmbeddedQuote quotedPost={quotedPost ?? undefined} quotedMemory={quotedMemory ?? undefined} />
        </div>
      )}

      {/* Actions */}
      {!editing && (
        <PostActions
          post={post} user={user}
          onLike={() => act(() => likeMut.mutate())}
          onSave={() => act(() => saveMut.mutate())}
          onComment={() => act(loadComments)}
          onQuote={() => act(() => setQuotePost({ post, author } as any))}
          liked={liked} saved={saved}
          likeCount={post.likeCount} saveCount={post.saveCount} commentCount={post.commentCount}
        />
      )}

      {/* Comments */}
      {showComments && (
        <div className="px-4 pb-4 border-t space-y-3 pt-3" style={{ borderColor: 'var(--color-border)' }}>
          {comments.map((c: any) => (
            <div key={c.comment.id} className="flex gap-2.5">
              <Link to={`/u/${c.author?.username}`} className="flex-shrink-0">
                <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--color-accent)', color: 'white' }}>
                  {c.author?.avatar ? <img src={c.author.avatar} alt="" className="w-full h-full object-cover" /> : c.author?.username?.[0]?.toUpperCase()}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500 mb-0.5">
                  <span className="font-semibold text-slate-300">{c.author?.displayName || c.author?.username}</span>
                  {' · '}{timeAgo(c.comment.createdAt)}
                </div>
                <CommentBody content={c.comment.content} />
                {user?.id === c.comment.userId && (
                  <button onClick={() => deleteCommentMut.mutate(c.comment.id)}
                    className="text-xs text-slate-600 hover:text-red-400 transition-colors mt-0.5">
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
              placeholder="Write a reply..."
              isPending={commentMut.isPending}
            />
          )}
        </div>
      )}
    </CardShell>
  );
}
