import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { postsApi, type Post, type AuthorSnippet, type ReactionMap } from '../lib/api';
import type { PostWithAuthor } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { useComposeStore } from '../store/compose';
import { timeAgo, processContent } from '../lib/utils';
import { Heart, Bookmark, MessageSquare, Trash2, ChevronDown, ChevronUp, Code2, Quote, Pencil, Check, X } from 'lucide-react';
import { PostMarkdown } from './ComposeBox';
import { CommentInput, CommentBody } from './CommentInput';
import { EmbeddedQuote } from './QuoteModal';

interface PostCardProps {
  post: Post;
  author: AuthorSnippet | null;
  quotedPost?: PostWithAuthor | null;
  quotedMemory?: any | null;
}

const REACTIONS = ['🔥', '🧠', '👀', '🚀', '✅', '💡'];

function hasCode(content: string) { return /```[\s\S]+?```/.test(content); }
function lineCount(content: string) { return content.split('\n').length; }
const COLLAPSE_THRESHOLD = 20;

export function PostCard({ post, author, quotedPost, quotedMemory }: PostCardProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { setQuotePost } = useComposeStore();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  const isCodePost = hasCode(post.content);
  const isLong = lineCount(post.content) > COLLAPSE_THRESHOLD || post.content.length > 800;
  const displayContent = isLong && !expanded ? post.content.slice(0, 600) + '\n\n…' : post.content;

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

  const isOwner = user?.id === post.userId;
  const canEdit = isOwner && (Date.now() - new Date(post.createdAt).getTime() < 15 * 60 * 1000);
  const reactMut = useMutation({
    mutationFn: (emoji: string) => postsApi.react(post.id, emoji),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reactions', post.id] }); setShowReactionPicker(false); },
  });
  const commentMut = useMutation({
    mutationFn: () => postsApi.comment(post.id, commentText),
    onSuccess: (res) => { setComments(prev => [...prev, res.data]); setCommentText(''); qc.invalidateQueries({ queryKey: ['feed'] }); },
  });
  const deleteCommentMut = useMutation({
    mutationFn: (cid: string) => postsApi.deleteComment(cid),
    onSuccess: (_, cid) => setComments(prev => prev.filter((c: any) => c.comment.id !== cid)),
  });

  const reactionsQ = useQuery({
    queryKey: ['reactions', post.id],
    queryFn: () => postsApi.reactions(post.id).then(r => r.data.reactions),
    enabled: showComments || showReactionPicker,
  });
  const reactions: ReactionMap = reactionsQ.data ?? {};

  const act = (fn: () => void) => { if (!user) { navigate('/login'); return; } fn(); };

  const toggleComments = async () => {
    if (!showComments && !commentsLoaded) {
      const res = await postsApi.comments(post.id);
      setComments((res.data as any).comments ?? []);
      setCommentsLoaded(true);
    }
    setShowComments(v => !v);
  };

  return (
    <div className="rounded-xl border card-hover" style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            {author && (
              <Link to={`/u/${author.username}`}>
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mono font-bold text-sm overflow-hidden" style={{ background: 'linear-gradient(135deg,#7C3AED,#00E5FF)', color: 'white' }}>
                  {author.avatar ? <img src={author.avatar} alt={author.username} className="w-full h-full object-cover" /> : author.username[0].toUpperCase()}
                </div>
              </Link>
            )}
            <div>
              {author && <Link to={`/u/${author.username}`} className="text-xs mono font-semibold text-white hover:text-violet-300 transition-colors">{author.displayName ?? author.username}</Link>}
              <div className="text-xs mono text-slate-600">{timeAgo(post.createdAt)}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isCodePost && <span className="flex items-center gap-1 text-xs mono px-2 py-0.5 rounded border text-cyan-400 border-cyan-400/20 bg-cyan-400/5"><Code2 size={10} /> CODE</span>}
            {(post.quotePostId || post.quoteMemoryId) && <span className="flex items-center gap-1 text-xs mono px-2 py-0.5 rounded border text-violet-400 border-violet-400/20 bg-violet-400/5"><Quote size={10} /> QUOTE</span>}
            <span className="text-xs mono px-2 py-0.5 rounded border text-slate-500 border-slate-700/50 bg-slate-800/30">POST</span>
            {canEdit && !editing && (
              <button onClick={() => { setEditContent(post.content); setEditing(true); }} className="text-slate-600 hover:text-violet-400 transition-colors ml-1"><Pencil size={12} /></button>
            )}
            {editing && (
              <>
                <button onClick={() => editMut.mutate()} disabled={editMut.isPending} className="text-emerald-400 hover:text-emerald-300 transition-colors ml-1"><Check size={13} /></button>
                <button onClick={() => setEditing(false)} className="text-slate-500 hover:text-white transition-colors ml-1"><X size={13} /></button>
              </>
            )}
            {isOwner && !editing && <button onClick={() => act(() => deleteMut.mutate())} className="text-slate-600 hover:text-red-400 transition-colors ml-1"><Trash2 size={13} /></button>}
          </div>
        </div>

        {/* Content */}
        <div className="mb-1">
          {editing ? (
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={4}
              className="w-full bg-transparent text-sm text-slate-300 outline-none resize-none leading-relaxed font-mono border rounded-lg p-3"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
              autoFocus
            />
          ) : (
            <PostMarkdown content={processContent(displayContent)} />
          )}
        </div>
        {post.editedAt && !editing && (
          <span className="text-xs mono text-slate-600">· edited</span>
        )}
        {isLong && (
          <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1 text-xs mono text-violet-400 hover:text-violet-300 transition-colors mt-1 mb-2">
            {expanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show more</>}
          </button>
        )}

        {/* Embedded quote */}
        <EmbeddedQuote quotedPost={quotedPost} quotedMemory={quotedMemory} />

        {/* Media */}
        {post.mediaUrl && (
          <div className="mt-3 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
            {post.mediaType === 'image' ? <img src={post.mediaUrl} alt="media" className="w-full max-h-80 object-cover" /> : <video src={post.mediaUrl} controls className="w-full max-h-80" />}
          </div>
        )}

        {/* Reaction bar — shown if any reactions exist */}
        {Object.keys(reactions).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {Object.entries(reactions).map(([emoji, { count, reacted }]) => (
              <button
                key={emoji}
                onClick={() => act(() => reactMut.mutate(emoji))}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-all hover:scale-110 ${reacted ? 'border-violet-500/40 bg-violet-500/10' : 'border-slate-700/50 hover:border-slate-500/50'}`}
              >
                <span>{emoji}</span>
                <span className="mono text-slate-400">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="post-actions flex items-center gap-1 px-3 py-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <button onClick={() => act(() => likeMut.mutate())} className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs mono text-slate-400 hover:text-pink-400 transition-colors">
          <Heart size={13} />{post.likeCount}
        </button>
        <button onClick={toggleComments} className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs mono text-slate-400 hover:text-blue-400 transition-colors">
          <MessageSquare size={13} />{post.commentCount}
          {showComments ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>

        {/* Reaction picker */}
        <div className="relative">
          <button onClick={() => act(() => setShowReactionPicker(p => !p))} className="flex items-center gap-0.5 px-2 py-1.5 rounded text-xs mono text-slate-400 hover:text-amber-400 transition-colors" title="React">
            <span>+</span><span>😊</span>
          </button>
          {showReactionPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowReactionPicker(false)} />
              <div className="absolute bottom-9 left-0 z-20 flex gap-1 p-2 rounded-xl border shadow-xl" style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
                {REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => act(() => reactMut.mutate(emoji))}
                    className={`text-lg p-1 rounded-lg hover:scale-125 transition-all ${reactions[emoji]?.reacted ? 'bg-violet-500/20' : 'hover:bg-white/5'}`}>
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Quote */}
        {user && (
          <button
            onClick={() => setQuotePost({ post, author: author! })}
            className="flex items-center gap-1 px-2 py-1.5 rounded text-xs mono text-slate-400 hover:text-violet-400 transition-colors"
            title="Quote post"
          >
            <Quote size={13} />
          </button>
        )}

        <button onClick={() => act(() => saveMut.mutate())} className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs mono text-slate-400 hover:text-amber-400 transition-colors ml-auto">
          <Bookmark size={13} />{post.saveCount}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="px-4 pb-4 pt-3 border-t space-y-3" style={{ borderColor: 'var(--color-border)' }}>
          {user ? (
            <CommentInput
              value={commentText}
              onChange={setCommentText}
              onSubmit={() => commentText.trim() && commentMut.mutate()}
              isPending={commentMut.isPending}
            />
          ) : (
            <p className="text-xs mono text-slate-500"><Link to="/login" className="text-violet-400 hover:text-violet-300">Sign in</Link> to comment</p>
          )}
          {comments.map(({ comment, author: ca }: any) => (
            <div key={comment.id} className="flex gap-2">
              <Link to={`/u/${ca?.username}`}>
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs mono font-bold" style={{ backgroundColor: 'var(--color-elevated)', color: 'var(--color-cyan)' }}>
                  {ca?.username?.[0]?.toUpperCase() ?? '?'}
                </div>
              </Link>
              <div className="flex-1">
                <span className="text-xs mono text-slate-400 font-semibold">@{ca?.username} </span>
                <CommentBody content={comment.content} />
              </div>
              {user?.id === comment.userId && (
                <button onClick={() => deleteCommentMut.mutate(comment.id)} className="text-slate-700 hover:text-red-400 transition-colors flex-shrink-0"><Trash2 size={10} /></button>
              )}
            </div>
          ))}
          {comments.length === 0 && commentsLoaded && <p className="text-xs mono text-slate-700 text-center py-2">No comments yet</p>}
        </div>
      )}
    </div>
  );
}
