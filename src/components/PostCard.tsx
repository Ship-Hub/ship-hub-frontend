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
  HelpCircle, Zap, MoreHorizontal, Pin, MessageCircle,
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
  gradient: string;
  iconColor: string;
  glowColor: string;
  glowClass: string;
  label: string;
  badgeClass: string;
  color: string;
}> = {
  build_update: {
    icon: Zap,
    gradient: 'linear-gradient(145deg, #4A1800 0%, #8B2E00 55%, #C24000 100%)',
    iconColor: '#FFB347',
    glowColor: 'rgba(255,138,0,0.85)',
    glowClass: 'icon-block-build',
    label: 'BUILD UPDATE',
    badgeClass: 'badge-build',
    color: '#FF8A00',
  },
  code_snippet: {
    icon: Code2,
    gradient: 'linear-gradient(145deg, #011120 0%, #023048 55%, #04527A 100%)',
    iconColor: '#67E8F9',
    glowColor: 'rgba(0,229,255,0.75)',
    glowClass: 'icon-block-code',
    label: 'CODE SNIPPET',
    badgeClass: 'badge-code',
    color: '#00E5FF',
  },
  collab_request: {
    icon: Users,
    gradient: 'linear-gradient(145deg, #2A1400 0%, #6B3500 55%, #8B4C00 100%)',
    iconColor: '#FCC581',
    glowColor: 'rgba(255,162,43,0.75)',
    glowClass: 'icon-block-collab',
    label: 'COLLABORATION',
    badgeClass: 'badge-collab',
    color: '#FFA62B',
  },
  poll: {
    icon: BarChart3,
    gradient: 'linear-gradient(145deg, #040E2E 0%, #0A2480 55%, #1230B0 100%)',
    iconColor: '#93C5FD',
    glowColor: 'rgba(79,158,255,0.75)',
    glowClass: 'icon-block-poll',
    label: 'POLL',
    badgeClass: 'badge-poll',
    color: '#4F9EFF',
  },
  question: {
    icon: HelpCircle,
    gradient: 'linear-gradient(145deg, #1E1000 0%, #5A3800 55%, #7A5200 100%)',
    iconColor: '#FDE68A',
    glowColor: 'rgba(255,214,10,0.75)',
    glowClass: 'icon-block-question',
    label: 'QUESTION',
    badgeClass: 'badge-question',
    color: '#FFD60A',
  },
  general: {
    icon: MessageCircle,
    gradient: '',
    iconColor: '#94A3B8',
    glowColor: 'transparent',
    glowClass: '',
    label: '',
    badgeClass: '',
    color: '#94A3B8',
  },
};

// ── Card hover classes ─────────────────────────────────────────────────────────

const CARD_HOVER_CLASS: Record<string, string> = {
  build_update:   'card-hover-build',
  code_snippet:   'card-hover-code',
  collab_request: 'card-hover-collab',
  poll:           'card-hover-poll',
  question:       'card-hover-question',
  general:        'card-hover-general',
};

// ── Type icon column (left column) ────────────────────────────────────────────

function TypeIconColumn({ type }: { type: string; author?: AuthorSnippet | null }) {
  const meta = TYPE_ICON_META[type] ?? TYPE_ICON_META['general'];
  const Icon = meta.icon;
  const isGeneral = !meta.gradient; // general has empty gradient string

  return (
    <div className="flex-shrink-0 flex flex-col items-center pt-3 pb-3 w-[64px] md:w-[72px]">
      {/* Every post shows a type icon block — no avatars in left column */}
      <div
        className={`w-12 h-12 md:w-[52px] md:h-[52px] rounded-2xl flex items-center justify-center ${meta.glowClass}`}
        style={{
          background: isGeneral
            ? 'linear-gradient(145deg, #0D1220 0%, #1A2438 55%, #232F43 100%)'
            : meta.gradient,
        }}
      >
        <Icon
          size={22}
          style={{
            color: meta.iconColor,
            filter: meta.glowColor && meta.glowColor !== 'transparent'
              ? `drop-shadow(0 0 5px ${meta.glowColor})`
              : undefined,
            opacity: isGeneral ? 0.5 : 1,
          }}
        />
      </div>
      {/* Connector line */}
      <div className="flex-1 mt-2 w-px min-h-[12px]" style={{ backgroundColor: 'var(--color-border)' }} />
    </div>
  );
}

// ── Card shell ────────────────────────────────────────────────────────────────

function CardShell({ children, post, author }: { children: React.ReactNode; post: Post; author: AuthorSnippet | null }) {
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

// ── Card top row: type badge + time + menu ────────────────────────────────────

function CardTopRow({ post, onDelete, canDelete, canEdit, onStartEdit, isCommunityAdmin, onPin, pinIsPending }: {
  post: Post;
  onDelete: () => void; canDelete: boolean; canEdit: boolean; onStartEdit: () => void;
  isCommunityAdmin: boolean; onPin: () => void; pinIsPending: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = TYPE_ICON_META[post.type ?? 'general'];
  const isTyped = !!(post.type && post.type !== 'general');

  return (
    <div className="flex items-center gap-2 pr-3 pt-3 pb-1.5 min-w-0">
      {/* Type badge */}
      {isTyped && meta?.label && (
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wide flex-shrink-0 ${meta.badgeClass}`}>
          {meta.label}
        </span>
      )}
      {/* Timestamp */}
      <span className="text-xs text-slate-600 flex-shrink-0">{timeAgo(post.createdAt)}</span>
      {/* Pinned */}
      {post.pinnedAt && (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold flex-shrink-0" style={{ color: 'var(--color-accent)' }}>
          <Pin size={9} /> Pinned
        </span>
      )}
      {/* Menu */}
      <div className="relative ml-auto flex-shrink-0">
        <button
          onClick={() => setMenuOpen(p => !p)}
          className="p-1 rounded-lg text-slate-700 hover:text-slate-400 hover:bg-white/5 transition-all"
        >
          <MoreHorizontal size={14} />
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-7 z-20 w-44 rounded-xl border shadow-xl py-1"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            {isCommunityAdmin && (
              <button
                onClick={() => { onPin(); setMenuOpen(false); }}
                disabled={pinIsPending}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
              >
                <Pin size={12} />
                {post.pinnedAt ? 'Unpin post' : 'Pin post'}
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => { onStartEdit(); setMenuOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-all"
              >
                <Pencil size={12} /> Edit post
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => { onDelete(); setMenuOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/5 transition-all"
              >
                <Trash2 size={12} /> Delete
              </button>
            )}
            {!canDelete && !canEdit && !isCommunityAdmin && (
              <div className="px-3 py-2 text-xs text-slate-600">No actions</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Card footer: author + engagement ─────────────────────────────────────────

function CardFooter({ post, author, onLike, onSave, onComment, onQuote, liked, saved, likeCount, commentCount }: {
  post: Post; author: AuthorSnippet | null;
  onLike: () => void; onSave: () => void;
  onComment: () => void; onQuote: () => void;
  liked: boolean; saved: boolean;
  likeCount: number; commentCount: number;
}) {
  return (
    <div className="flex items-center pr-3 py-2 border-t post-actions" style={{ borderColor: 'var(--color-border)' }}>
      {/* Author */}
      <Link
        to={`/u/${author?.username ?? ''}`}
        className="flex items-center gap-1.5 mr-2 hover:opacity-80 transition-opacity flex-shrink-0"
      >
        <div
          className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))', color: 'white' }}
        >
          {author?.avatar
            ? <img src={author.avatar} alt={author?.username} className="w-full h-full object-cover" />
            : author?.username?.[0]?.toUpperCase() ?? '?'}
        </div>
        <span className="text-xs text-slate-500 max-w-[72px] truncate hidden sm:block">
          {author?.displayName || author?.username}
        </span>
      </Link>

      <span className="text-slate-700 text-xs mx-1 hidden sm:block">·</span>

      {/* Like */}
      <button
        onClick={onLike}
        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5 ${liked ? 'text-orange-400' : 'text-slate-500 hover:text-slate-300'}`}
        style={liked ? { textShadow: '0 0 8px rgba(255,138,0,0.7)' } : {}}
      >
        <Heart size={13} fill={liked ? 'currentColor' : 'none'} />
        {likeCount > 0 && <span>{likeCount}</span>}
      </button>

      {/* Comment */}
      <button
        onClick={onComment}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
      >
        <MessageSquare size={13} />
        {commentCount > 0 && <span>{commentCount}</span>}
      </button>

      {/* Quote */}
      <button
        onClick={onQuote}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-violet-400 hover:bg-white/5 transition-all"
        title="Quote post"
      >
        <Quote size={13} />
      </button>

      {/* Save */}
      <button
        onClick={onSave}
        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5 ml-auto ${saved ? '' : 'text-slate-500 hover:text-slate-300'}`}
        style={saved ? { color: 'var(--color-cyan)', textShadow: '0 0 8px rgba(0,229,255,0.6)' } : {}}
      >
        <Bookmark size={13} fill={saved ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}

// ── Type-specific content sections ───────────────────────────────────────────

function BuildUpdateContent({ post }: { post: Post }) {
  return (
    <div className="pr-4 pb-2">
      {post.milestone && (
        <div className="mb-2">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-md inline-flex items-center gap-1.5"
            style={{ backgroundColor: 'rgba(255,138,0,0.12)', color: '#FF8A00' }}
          >
            🚀 {post.milestone}
          </span>
        </div>
      )}
      <div className="text-sm text-slate-300 leading-relaxed">
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

  // Extract title: first line if it's a comment or heading
  const firstLine = post.content.split('\n')[0]?.trim() ?? '';
  const titleFromComment = (firstLine.startsWith('//') || firstLine.startsWith('# ') || firstLine.startsWith('--'))
    ? firstLine.replace(/^\/\/\s*|^#\s*|^--\s*/, '').trim()
    : null;
  const titleFromMarkdown = !codeMatch && firstLine.length < 80 && post.content.split('\n').length > 2
    ? firstLine.replace(/^#+\s*/, '').trim()
    : null;
  const title = titleFromComment ?? titleFromMarkdown;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="pr-4 pb-2">
      {title && (
        <p className="text-base font-semibold text-white mb-2 leading-snug">{title}</p>
      )}
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
        <div
          className="flex items-center justify-between px-3 py-2 border-b"
          style={{ borderColor: 'rgba(0,229,255,0.15)', backgroundColor: 'rgba(0,229,255,0.05)' }}
        >
          <span
            className="text-xs font-bold tracking-wider"
            style={{ color: 'var(--color-cyan)', textShadow: '0 0 8px rgba(0,229,255,0.5)' }}
          >
            {lang}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all border"
            style={{
              color: copied ? 'var(--color-success)' : 'var(--color-cyan)',
              borderColor: copied ? 'rgba(0,217,126,0.3)' : 'rgba(0,229,255,0.25)',
              backgroundColor: copied ? 'rgba(0,217,126,0.08)' : 'rgba(0,229,255,0.07)',
            }}
          >
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
    <div className="pr-4 pb-2">
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          {post.roleNeeded && (
            <p className="text-base font-semibold text-white mb-1.5 leading-snug">{post.roleNeeded}</p>
          )}
          <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">{post.content}</p>
          {post.skills && post.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {post.skills.slice(0, 5).map(s => (
                <span
                  key={s}
                  className="text-xs px-2 py-0.5 rounded-md border"
                  style={{ borderColor: 'rgba(255,162,43,0.25)', color: 'var(--color-amber)', backgroundColor: 'rgba(255,162,43,0.08)' }}
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          {post.compensation && (
            <div className="text-xs text-slate-500 capitalize mt-1.5">{post.compensation.replace('_', ' ')}</div>
          )}
        </div>
        <div className="flex-shrink-0">
          {!applying ? (
            <button
              onClick={() => { if (!user) { navigate('/login'); return; } setApplying(true); }}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all btn-primary whitespace-nowrap"
              style={{ backgroundColor: 'var(--color-accent)', boxShadow: '0 0 14px rgba(255,138,0,0.4)' }}
            >
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
                <button
                  onClick={() => applyMut.mutate()}
                  disabled={!message.trim() || applyMut.isPending}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  {applyMut.isPending ? '...' : 'Apply'}
                </button>
                <button
                  onClick={() => setApplying(false)}
                  className="px-2 py-1.5 rounded-lg text-xs text-slate-500 hover:text-white transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}
          {applyMut.isSuccess && (
            <p className="text-xs text-center mt-1" style={{ color: 'var(--color-success)' }}>Applied!</p>
          )}
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
    <div className="pr-4 pb-2">
      <p className="text-base font-semibold text-white mb-3 leading-snug">{post.content}</p>
      {data ? (
        <div className="space-y-2">
          {data.options.map(opt => {
            const pct = data.totalVotes > 0 ? Math.round((opt.voteCount / data.totalVotes) * 100) : 0;
            return (
              <button
                key={opt.id}
                onClick={() => { if (!user) { navigate('/login'); return; } if (!hasVoted) voteMut.mutate(opt.id); }}
                disabled={hasVoted || voteMut.isPending}
                className="w-full text-left"
              >
                <div
                  className="relative px-3 py-2.5 rounded-xl border overflow-hidden transition-all"
                  style={{
                    borderColor: opt.myVote ? 'rgba(79,158,255,0.6)' : 'var(--color-border)',
                    backgroundColor: 'var(--color-elevated)',
                    boxShadow: opt.myVote ? '0 0 12px rgba(79,158,255,0.2), inset 0 0 20px rgba(79,158,255,0.05)' : undefined,
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-xl transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: opt.myVote ? 'rgba(79,158,255,0.12)' : 'rgba(255,255,255,0.04)' }}
                  />
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
          <p className="text-xs text-slate-600 mt-1">
            {data.totalVotes} votes
            {data.isAnonymous ? ' · Anonymous' : ''}
            {data.allowMultiple ? ' · Multiple choice' : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--color-elevated)' }} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionContent({ post }: { post: Post }) {
  return (
    <div className="pr-4 pb-2">
      <p className="text-base font-semibold text-white mb-2 leading-snug">{post.content}</p>
      {post.commentCount > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <MessageSquare size={12} />
          <span>{post.commentCount} {post.commentCount === 1 ? 'answer' : 'answers'}</span>
        </div>
      )}
    </div>
  );
}

function GeneralContent({ post }: { post: Post }) {
  const [expanded, setExpanded] = useState(false);

  const lines = post.content.split('\n').filter(l => l.trim());
  const isLong = post.content.length > 600 || post.content.split('\n').length > 15;

  // Extract title from first line when content has multiple lines
  const hasMultipleLines = lines.length > 1 && lines[0].length <= 120;
  const titleLine = hasMultipleLines ? lines[0].replace(/^#+\s*/, '').trim() : null;
  const bodyLines = hasMultipleLines ? lines.slice(1).join('\n') : post.content;

  const displayBody = isLong && !expanded ? bodyLines.slice(0, 400) + '…' : bodyLines;
  const displaySingle = isLong && !expanded ? post.content.slice(0, 500) + '…' : post.content;

  return (
    <div className="pr-4 pb-2">
      {titleLine ? (
        <>
          <p className="text-base font-semibold text-white mb-1.5 leading-snug">{titleLine}</p>
          <div className="text-sm text-slate-400 leading-relaxed line-clamp-3">
            <PostMarkdown content={displayBody} />
          </div>
        </>
      ) : (
        <div className="text-sm text-slate-300 leading-relaxed">
          <PostMarkdown content={displaySingle} />
        </div>
      )}
      {isLong && (
        <button
          onClick={() => setExpanded(p => !p)}
          className="flex items-center gap-1 mt-2 text-xs transition-colors hover:opacity-80"
          style={{ color: 'var(--color-accent)' }}
        >
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

  const isOwner       = user?.id === post.userId;
  const isPlatformAdmin   = !!user?.isAdmin || !!user?.platformAdmin;
  const isCommunityAdmin  = isPlatformAdmin || !!user?.communityAdmin;
  const canEdit  = isOwner && (Date.now() - new Date(post.createdAt).getTime() < 15 * 60 * 1000);
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

  const liked   = false;
  const saved   = false;
  const postType = post.type ?? 'general';

  return (
    <CardShell post={post} author={author}>

      {/* ── Top row: type badge · time · menu ── */}
      <CardTopRow
        post={post}
        onDelete={() => act(() => deleteMut.mutate())}
        canDelete={canDelete}
        canEdit={canEdit}
        onStartEdit={() => { setEditContent(post.content); setEditing(true); }}
        isCommunityAdmin={isCommunityAdmin}
        onPin={() => pinMut.mutate()}
        pinIsPending={pinMut.isPending}
      />

      {/* ── Inline edit ── */}
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
            <button
              onClick={() => editMut.mutate()}
              disabled={editMut.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              <Check size={12} />
              {editMut.isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-white transition-colors"
            >
              <X size={12} />Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Type-specific content ── */}
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

      {/* ── Quoted content ── */}
      {(quotedPost || quotedMemory) && !editing && (
        <div className="pr-4 pb-3">
          <EmbeddedQuote quotedPost={quotedPost ?? undefined} quotedMemory={quotedMemory ?? undefined} />
        </div>
      )}

      {/* ── Footer: author + engagement ── */}
      {!editing && (
        <CardFooter
          post={post} author={author}
          onLike={() => act(() => likeMut.mutate())}
          onSave={() => act(() => saveMut.mutate())}
          onComment={() => act(loadComments)}
          onQuote={() => act(() => setQuotePost({ post, author } as any))}
          liked={liked} saved={saved}
          likeCount={post.likeCount} commentCount={post.commentCount}
        />
      )}

      {/* ── Comments ── */}
      {showComments && (
        <div className="pr-4 pb-4 border-t space-y-3 pt-3" style={{ borderColor: 'var(--color-border)' }}>
          {comments.map((c: any) => (
            <div key={c.comment.id} className="flex gap-2.5">
              <Link to={`/u/${c.author?.username}`} className="flex-shrink-0">
                <div
                  className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
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
                  <button
                    onClick={() => deleteCommentMut.mutate(c.comment.id)}
                    className="text-xs text-slate-600 hover:text-red-400 transition-colors mt-0.5"
                  >
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
