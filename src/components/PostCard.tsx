import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { postsApi, type Post, type AuthorSnippet } from '../lib/api';
import type { PostWithAuthor } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { useComposeStore } from '../store/compose';
import { timeAgo, processContent } from '../lib/utils';
import {
  Heart, Bookmark, MessageSquare, Trash2, ChevronDown, ChevronUp,
  Code2, Quote, Pencil, Check, X, Copy, Users, BarChart3,
  HelpCircle, Zap, MoreHorizontal, Repeat2, Pin, MessageCircle,
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

// ── Type icon metadata ────────────────────────────────────────────────────────

const TYPE_ICON_META: Record<string, {
  icon: React.ElementType;
  color: string;
  bg: string;
  glowClass: string;
  label: string;
  badgeClass: string;
}> = {
  build_update:   { icon: Zap,          color: '#FF8A00', bg: 'rgba(255,138,0,0.12)',  glowClass: 'icon-block-build',    label: 'BUILD UPDATE',    badgeClass: 'badge-build'    },
  code_snippet:   { icon: Code2,        color: '#00E5FF', bg: 'rgba(0,229,255,0.1)',   glowClass: 'icon-block-code',     label: 'CODE SNIPPET',    badgeClass: 'badge-code'     },
  collab_request: { icon: Users,        color: '#FFA62B', bg: 'rgba(255,162,43,0.1)',  glowClass: 'icon-block-collab',   label: 'COLLABORATION',   badgeClass: 'badge-collab'   },
  poll:           { icon: BarChart3,    color: '#4F9EFF', bg: 'rgba(79,158,255,0.1)',  glowClass: 'icon-block-poll',     label: 'POLL',            badgeClass: 'badge-poll'     },
  question:       { icon: HelpCircle,  color: '#FFD60A', bg: 'rgba(255,214,10,0.1)',   glowClass: 'icon-block-question', label: 'QUESTION',        badgeClass: 'badge-question' },
  general:        { icon: MessageCircle, color: '#64748B', bg: 'rgba(100,116,139,0.08)', glowClass: 'icon-block-general', label: '',               badgeClass: ''               },
};

// ── Type icon column (left column) ────────────────────────────────────────────

function TypeIconColumn({ type }: { type: string }) {
  const meta = TYPE_ICON_META[type] ?? TYPE_ICON_META['general'];
  const Icon = meta.icon;
  return (
    <div className="flex-shrink-0 flex flex-col items-center pt-4 pb-3 px-3 w-[76px]">
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center ${meta.glowClass}`}
        style={{ backgroundColor: meta.bg }}
      >
        <Icon size={24} style={{ color: meta.color }} />
      </div>
      {/* Connector line (visual) */}
      <div className="flex-1 mt-2 w-px min-h-[12px]" style={{ backgroundColor: 'var(--color-border)' }} />
    </div>
  );
}

// ── Card hover classes ─────────────────────────────────────────────────────────

const CARD_HOVER_CLASS: Record<string, string> = {
  build_update:   'card-hover-build',
  code_snippet:   'card-hover-code',
  collab_request: 'card-hover-collab',
  poll:           'card-hover-poll',
  question:       'card-hover-question',
  general:        'card-hover-general',
};

// ── Card shell ────────────────────────────────────────────────────────────────

function CardShell({ children, post }: { children: React.ReactNode; post: Post }) {
  const type = post.type || 'general';
  const hoverClass = CARD_HOVER_CLASS[type] ?? 'card-hover-general';
  const hasMedia = !!(post.mediaUrl);

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${hoverClass}`}
      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex">
        {/* Left: Type icon column */}
        <TypeIconColumn type={type} />

        {/* Center: All post content */}
        <div className="flex-1 min-w-0 flex">
          <div className="flex-1 min-w-0">
            {children}
          </div>

          {/* Right: Media column (if present) */}
          {hasMedia && (
            <div className="flex-shrink-0 w-28 p-3 flex items-start">
              {post.mediaType === 'image'
                ? (
                  <img
                    src={post.mediaUrl!}
                    alt=""
                    className="w-full h-24 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(post.mediaUrl!, '_blank')}
                  />
                ) : (
                  <video
                    src={post.mediaUrl!}
                    className="w-full h-24 object-cover rounded-xl"
                    controls
                  />
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Type badge (inline label) ────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const meta = TYPE_ICON_META[type];
  if (!meta || !meta.label || type === 'general') return null;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wide ${meta.badgeClass}`}>
      <Icon size={9} />
      {meta.label}
    </span>
  );
}

// ── Post author header ────────────────────────────────────────────────────────

function PostHeader({ post, author, onDelete, canDelete, canEdit, onStartEdit }: {
  post: Post; author: AuthorSnippet | null;
  onDelete: () => void; canDelete: boolean; canEdit: boolean; onStartEdit: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="flex items-start justify-between pr-4 pt-3 pb-2">
      <div className="flex items-center gap-2 min-w-0">
        <Link to={`/u/${author?.username}`} className="flex-shrink-0">
          <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))', color: 'white' }}>
            {author?.avatar
              ? <img src={author.avatar} alt={author.username} className="w-full h-full object-cover" />
              : author?.username?.[0]?.toUpperCase() ?? '?'}
          </div>
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link to={`/u/${author?.username}`} className="text-sm font-semibold text-white hover:text-slate-200 transition-colors leading-none">
              {author?.displayName || author?.username}
            </Link>
            <span className="text-xs text-slate-600 leading-none">@{author?.username}</span>
            <span className="text-xs text-slate-700">·</span>
            <span className="text-xs text-slate-600 leading-none">{timeAgo(post.createdAt)}</span>
            {post.pinnedAt && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>
                <Pin size={9} /> Pinned
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="relative flex-shrink-0 ml-2">
        <button onClick={() => setMenuOpen(p => !p)}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/5 transition-all">
          <MoreHorizontal size={15} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border shadow-xl py-1"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
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

// ── Post actions bar ──────────────────────────────────────────────────────────

function PostActions({ post, user, onLike, onSave, onComment, onQuote, liked, saved, likeCount, saveCount, commentCount }: {
  post: Post; user: any;
  onLike: () => void; onSave: () => void;
  onComment: () => void; onQuote: () => void;
  liked: boolean; saved: boolean;
  likeCount: number; saveCount: number; commentCount: number;
}) {
  return (
    <div className="flex items-center gap-1 pr-4 py-2.5 border-t post-actions" style={{ borderColor: 'var(--color-border)' }}>
      <button onClick={onLike}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5 ${liked ? 'text-orange-400' : 'text-slate-500 hover:text-slate-300'}`}
        style={liked ? { textShadow: '0 0 8px rgba(255,138,0,0.7)' } : {}}>
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

// ── Type-specific content sections ───────────────────────────────────────────

function BuildUpdateContent({ post }: { post: Post }) {
  return (
    <div className="pr-4 pb-3">
      <TypeBadge type="build_update" />
      {post.milestone && (
        <div className="text-xs font-semibold mt-2 mb-2 px-2 py-1 rounded-md inline-block"
          style={{ backgroundColor: 'rgba(255,138,0,0.1)', color: '#FF8A00' }}>
          🚀 {post.milestone}
        </div>
      )}
      <div className="text-sm text-slate-300 leading-relaxed mt-1">
        <PostMarkdown content={post.content} />
      </div>
    </div>
  );
}

function CodeSnippetContent({ post }: { post: Post }) {
  const [copied, setCopied] = useState(false);
  const lang = post.language ?? 'typescript';

  const codeMatch = post.content.match(/```(?:\w+)?\n?([\s\S]+?)```/);
  const code = codeMatch ? codeMatch[1].trim() : post.content;
  const title = !codeMatch ? undefined : post.content.split('\n')[0]?.replace(/^#\s*/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="pr-4 pb-3">
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
    <div className="pr-4 pb-3">
      <TypeBadge type="collab_request" />
      <div className="flex gap-3 mt-2">
        <div className="flex-1 min-w-0">
          {post.roleNeeded && (
            <div className="text-base font-semibold text-white mb-1">{post.roleNeeded}</div>
          )}
          <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">{post.content}</p>
          {post.skills && post.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {post.skills.slice(0, 5).map(s => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-md border"
                  style={{ borderColor: 'rgba(255,162,43,0.25)', color: 'var(--color-amber)', backgroundColor: 'rgba(255,162,43,0.08)' }}>
                  {s}
                </span>
              ))}
            </div>
          )}
          {post.compensation && (
            <div className="text-xs text-slate-500 capitalize mt-1">{post.compensation.replace('_', ' ')}</div>
          )}
        </div>
        <div className="flex-shrink-0">
          {!applying ? (
            <button
              onClick={() => { if (!user) { navigate('/login'); return; } setApplying(true); }}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all btn-primary whitespace-nowrap"
              style={{ backgroundColor: 'var(--color-accent)', boxShadow: '0 0 14px rgba(255,138,0,0.4)' }}>
              Connect
            </button>
          ) : (
            <div className="space-y-1.5 w-36">
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
          {applyMut.isSuccess && <p className="text-xs text-center mt-1" style={{ color: 'var(--color-success)' }}>Applied!</p>}
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
    <div className="pr-4 pb-3">
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
                      borderColor: opt.myVote ? 'rgba(79,158,255,0.6)' : 'var(--color-border)',
                      backgroundColor: 'var(--color-elevated)',
                      boxShadow: opt.myVote ? '0 0 12px rgba(79,158,255,0.2), inset 0 0 20px rgba(79,158,255,0.05)' : undefined,
                    }}>
                    <div className="absolute inset-0 rounded-xl transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: opt.myVote ? 'rgba(79,158,255,0.12)' : 'rgba(255,255,255,0.04)' }} />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {opt.myVote && <Check size={12} style={{ color: '#4F9EFF' }} />}
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
    <div className="pr-4 pb-3">
      <TypeBadge type="question" />
      <div className="mt-2">
        <p className="text-base font-semibold text-white mb-2 leading-snug">{post.content}</p>
        {post.commentCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <MessageSquare size={12} />
            <span>{post.commentCount} {post.commentCount === 1 ? 'answer' : 'answers'}</span>
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
    <div className="pr-4 pb-3">
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
    </div>
  );
}

// ── Main PostCard ─────────────────────────────────────────────────────────────

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

  const likeMut    = useMutation({ mutationFn: () => postsApi.like(post.id),    onSuccess: invalidate });
  const saveMut    = useMutation({ mutationFn: () => postsApi.save(post.id),    onSuccess: invalidate });
  const deleteMut  = useMutation({ mutationFn: () => postsApi.delete(post.id),  onSuccess: invalidate });
  const pinMut     = useMutation({ mutationFn: () => postsApi.pin(post.id),     onSuccess: invalidate });
  const editMut    = useMutation({
    mutationFn: () => postsApi.edit(post.id, editContent),
    onSuccess: () => { invalidate(); setEditing(false); },
  });
  const commentMut = useMutation({
    mutationFn: () => postsApi.comment(post.id, commentText),
    onSuccess: (res) => {
      setComments(prev => [...prev, res.data]);
      setCommentText('');
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
  const deleteCommentMut = useMutation({
    mutationFn: (cid: string) => postsApi.deleteComment(cid),
    onSuccess: (_data, cid) => setComments(prev => prev.filter((c: any) => c.comment.id !== cid)),
  });

  const isOwner = user?.id === post.userId;
  const isPlatformAdmin = !!user?.isAdmin || !!user?.platformAdmin;
  const isCommunityAdmin = isPlatformAdmin || !!user?.communityAdmin;
  const canEdit = isOwner && (Date.now() - new Date(post.createdAt).getTime() < 15 * 60 * 1000);
  const canDelete = isOwner || isPlatformAdmin;

  const act = (fn: () => void) => { if (!user) { navigate('/login'); return; } fn(); };

  const loadComments = async () => {
    if (!commentsLoaded) {
      const res = await postsApi.comments(post.id);
      setComments((res.data as any).comments ?? []);
      setCommentsLoaded(true);
    }
    setShowComments(p => !p);
  };

  const liked = false;
  const saved = false;
  const postType = post.type ?? 'general';

  return (
    <CardShell post={post}>
      {/* Author header */}
      <PostHeader
        post={post} author={author}
        canDelete={canDelete} canEdit={canEdit}
        onDelete={() => act(() => deleteMut.mutate())}
        onStartEdit={() => { setEditContent(post.content); setEditing(true); }}
      />

      {/* Pin/admin controls */}
      {isCommunityAdmin && !editing && (
        <div className="pb-2 -mt-1">
          <button
            onClick={() => pinMut.mutate()}
            disabled={pinMut.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all hover:bg-white/5 disabled:opacity-50"
            style={{ borderColor: 'rgba(255,138,0,0.25)', color: post.pinnedAt ? 'var(--color-accent)' : 'var(--color-muted)' }}
          >
            <Pin size={12} />
            {post.pinnedAt ? 'Unpin post' : 'Pin post'}
          </button>
        </div>
      )}

      {/* Inline edit */}
      {editing && (
        <div className="pr-4 pb-4 space-y-2">
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
          {postType === 'build_update'   && <BuildUpdateContent  post={post} />}
          {postType === 'code_snippet'   && <CodeSnippetContent  post={post} />}
          {postType === 'collab_request' && <CollabContent       post={post} />}
          {postType === 'poll'           && <PollContent         post={post} />}
          {postType === 'question'       && <QuestionContent     post={post} />}
          {(postType === 'general' || !postType) && <GeneralContent post={post} />}
        </>
      )}

      {/* Quoted content */}
      {(quotedPost || quotedMemory) && !editing && (
        <div className="pr-4 pb-3">
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
        <div className="pr-4 pb-4 border-t space-y-3 pt-3" style={{ borderColor: 'var(--color-border)' }}>
          {comments.map((c: any) => (
            <div key={c.comment.id} className="flex gap-2.5">
              <Link to={`/u/${c.author?.username}`} className="flex-shrink-0">
                <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--color-accent)', color: 'white' }}>
                  {c.author?.avatar
                    ? <img src={c.author.avatar} alt="" className="w-full h-full object-cover" />
                    : c.author?.username?.[0]?.toUpperCase()}
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
              placeholder="Write a reply…"
              isPending={commentMut.isPending}
            />
          )}
        </div>
      )}
    </CardShell>
  );
}
