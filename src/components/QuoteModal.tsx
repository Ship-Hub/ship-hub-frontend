import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi } from '../lib/api';
import { useComposeStore } from '../store/compose';
import { PostMarkdown } from './ComposeBox';
import { processContent, timeAgo, CATEGORY_COLORS } from '../lib/utils';
import { cn } from '../lib/utils';
import { X, Send, Loader2, Code2, Bold, Quote } from 'lucide-react';
import { Link } from 'react-router-dom';

// Embedded quoted item preview (read-only)
function QuotedPostPreview({ quotePost, quoteMemory }: { quotePost?: any; quoteMemory?: any }) {
  if (quotePost) {
    const { post, author } = quotePost;
    return (
      <div className="rounded-lg border p-3" style={{ borderColor: 'rgba(139,92,246,0.2)', backgroundColor: 'var(--color-elevated)' }}>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs mono font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg,#7C3AED,#00E5FF)', color: 'white' }}>
            {author?.username?.[0]?.toUpperCase()}
          </div>
          <span className="text-xs mono text-slate-400">@{author?.username}</span>
          <span className="text-xs mono text-slate-600">{timeAgo(post.createdAt)}</span>
        </div>
        <div className="text-xs text-slate-400 line-clamp-3">
          <PostMarkdown content={processContent(post.content)} />
        </div>
      </div>
    );
  }
  if (quoteMemory) {
    const { memory, author } = quoteMemory;
    const cc = CATEGORY_COLORS[memory.category] ?? 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    return (
      <div className="rounded-lg border p-3" style={{ borderColor: 'rgba(139,92,246,0.2)', backgroundColor: 'var(--color-elevated)' }}>
        <div className="flex items-center gap-2 mb-1.5">
          <span className={cn('text-xs mono px-1.5 py-0.5 rounded border', cc)}>{memory.category.toUpperCase()}</span>
          <span className="text-xs mono text-white font-semibold truncate">{memory.title}</span>
        </div>
        <div className="text-xs text-slate-400 line-clamp-2">{memory.content.slice(0, 120)}{memory.content.length > 120 ? 'â€¦' : ''}</div>
        <div className="text-xs mono text-slate-600 mt-1">by @{author?.username}</div>
      </div>
    );
  }
  return null;
}

export function QuoteModal() {
  const { quotePost, quoteMemory, clear } = useComposeStore();
  const qc = useQueryClient();
  const [content, setContent] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  const postMut = useMutation({
    mutationFn: () => postsApi.create({
      content: content.trim(),
      quotePostId: quotePost?.post.id,
      quoteMemoryId: quoteMemory?.memory.id,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      setContent('');
      clear();
    },
  });

  if (!quotePost && !quoteMemory) return null;

  const insert = (before: string, after: string, ph: string) => {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const sel = content.slice(s, e) || ph;
    const next = content.slice(0, s) + before + sel + after + content.slice(e);
    setContent(next);
    setTimeout(() => { el.focus(); el.setSelectionRange(s + before.length, s + before.length + sel.length); }, 0);
  };

  const label = quotePost
    ? `Quoting @${quotePost.author?.username}'s post`
    : `Quoting memory: ${quoteMemory?.memory.title}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-lg rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <Quote size={14} className="text-slate-400" />
            <span className="text-xs mono text-slate-300 truncate">{label}</span>
          </div>
          <button onClick={clear} className="text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
        </div>

        {/* Compose area */}
        <div className="p-4 space-y-3">
          <textarea
            ref={ref}
            value={content}
            onChange={e => setContent(e.target.value)}
            autoFocus
            placeholder="Add your thoughts..."
            rows={3}
            className="w-full bg-transparent text-sm text-slate-300 placeholder-slate-600 outline-none resize-none leading-relaxed font-mono"
          />

          {/* Quoted item */}
          <QuotedPostPreview quotePost={quotePost ?? undefined} quoteMemory={quoteMemory ?? undefined} />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 pb-4 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-1">
            <button onClick={() => insert('**', '**', 'bold')} className="px-2 py-1 rounded text-xs font-bold text-slate-500 hover:text-slate-400 hover:bg-violet-400/5 transition-all">B</button>
            <button onClick={() => insert('*', '*', 'italic')} className="px-2 py-1 rounded text-xs italic font-semibold text-slate-500 hover:text-slate-400 hover:bg-violet-400/5 transition-all">I</button>
            <button onClick={() => insert('`', '`', 'code')} className="px-1.5 py-1 rounded text-xs mono text-slate-500 hover:text-cyan-400 transition-all">`Â·`</button>
            <button onClick={() => insert('```typescript\n', '\n```', '// code')} className="flex items-center gap-1 px-2 py-1 rounded text-xs mono text-slate-500 hover:text-cyan-400 transition-all"><Code2 size={11} /></button>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs mono ${content.length > 4500 ? 'text-red-400' : 'text-slate-600'}`}>{content.length}/5000</span>
            <button
              onClick={() => postMut.mutate()}
              disabled={!content.trim() || postMut.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs mono font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: 'var(--color-accent)' }}
            >
              {postMut.isPending ? <><Loader2 size={11} className="animate-spin" />POSTING...</> : <><Send size={12} />QUOTE</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Small embedded quote card shown inside PostCard for already-posted quotes
export function EmbeddedQuote({ quotedPost, quotedMemory }: { quotedPost?: any; quotedMemory?: any }) {
  if (!quotedPost && !quotedMemory) return null;
  return (
    <div className="mt-3 rounded-lg border overflow-hidden" style={{ borderColor: 'rgba(139,92,246,0.15)', backgroundColor: 'var(--color-elevated)' }}>
      <QuotedPostPreview quotePost={quotedPost} quoteMemory={quotedMemory} />
    </div>
  );
}
