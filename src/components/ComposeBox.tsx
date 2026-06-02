import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi, uploadApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { processContent } from '../lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Send, BookMarked, Globe, Lock, Image, Video, X,
  Loader2, Code2, Eye, PenLine, ChevronDown,
} from 'lucide-react';

const LANGUAGES = [
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'tsx',        label: 'TSX / JSX' },
  { value: 'python',     label: 'Python' },
  { value: 'rust',       label: 'Rust' },
  { value: 'go',         label: 'Go' },
  { value: 'bash',       label: 'Bash / Shell' },
  { value: 'sql',        label: 'SQL' },
  { value: 'json',       label: 'JSON' },
  { value: 'html',       label: 'HTML' },
  { value: 'css',        label: 'CSS' },
  { value: 'markdown',   label: 'Markdown' },
];

function insertAtCursor(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  before: string,
  after: string,
  placeholder: string,
  setter: (v: string) => void,
  current: string
) {
  const el = ref.current;
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const selected = current.slice(start, end) || placeholder;
  const next = current.slice(0, start) + before + selected + after + current.slice(end);
  setter(next);
  setTimeout(() => {
    el.focus();
    const cursorAt = start + before.length + selected.length;
    el.setSelectionRange(cursorAt, cursorAt);
  }, 0);
}

export function ComposeBox() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const DRAFT_KEY = 'shiphub_compose_draft';
  const [content, setContent] = useState(() => localStorage.getItem(DRAFT_KEY) ?? '');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');

  // Persist draft on every keystroke
  const handleContentChange = (val: string) => {
    setContent(val);
    if (val) localStorage.setItem(DRAFT_KEY, val);
    else localStorage.removeItem(DRAFT_KEY);
  };
  const [focused, setFocused] = useState(false);
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    const incoming = searchParams.get('compose');
    if (!incoming) return;

    handleContentChange(incoming.slice(0, 5000));
    setFocused(true);
    setMode('write');
    window.setTimeout(() => textareaRef.current?.focus(), 0);

    const next = new URLSearchParams(searchParams);
    next.delete('compose');
    next.delete('source');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const postMut = useMutation({
    mutationFn: async () => {
      let mediaUrl: string | undefined;
      let mtype: 'image' | 'video' | undefined;
      if (mediaFile) {
        const res = await uploadApi.upload(mediaFile);
        mediaUrl = res.data.url;
        mtype = res.data.mediaType;
      }
      return postsApi.create({ content: content.trim(), visibility, mediaUrl, mediaType: mtype });
    },
    onSuccess: () => {
      setContent('');
      localStorage.removeItem(DRAFT_KEY);
      setMediaFile(null);
      setMediaPreview(null);
      setMediaType(null);
      setFocused(false);
      setMode('write');
      setUploadError('');
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
    onError: (err: any) => setUploadError(err.response?.data?.message ?? 'Failed to post'),
  });

  const handleFile = (file: File, type: 'image' | 'video') => {
    const maxMB = type === 'image' ? 2 : 5;
    if (file.size > maxMB * 1024 * 1024) { setUploadError(`${type === 'image' ? 'Image' : 'Video'} must be under ${maxMB}MB`); return; }
    setUploadError('');
    setMediaFile(file);
    setMediaType(type);
    setMediaPreview(URL.createObjectURL(file));
    setFocused(true);
  };

  const clearMedia = () => {
    setMediaFile(null);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    setMediaType(null);
  };

  const insertCode = (lang: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end);
    const snippet = `\`\`\`${lang}\n${selected || '// your code here'}\n\`\`\``;
    const next = content.slice(0, start) + snippet + content.slice(end);
    handleContentChange(next);
    setShowLangPicker(false);
    setFocused(true);
    setTimeout(() => {
      el.focus();
      const pos = start + `\`\`\`${lang}\n`.length;
      el.setSelectionRange(pos, pos + (selected || '// your code here').length);
    }, 0);
  };

  const insertBold = () =>
    insertAtCursor(textareaRef, '**', '**', 'bold text', handleContentChange, content);

  const insertItalic = () =>
    insertAtCursor(textareaRef, '*', '*', 'italic text', handleContentChange, content);

  const insertInlineCode = () =>
    insertAtCursor(textareaRef, '`', '`', 'code', handleContentChange, content);

  if (!user) {
    return (
      <div className="rounded-xl border p-4 mb-5 text-center" style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
        <p className="text-xs mono text-slate-500">
          <Link to="/login" className="text-violet-400 hover:text-violet-300 transition-colors">Sign in</Link>
          {' '}to post and share with the community
        </p>
      </div>
    );
  }

  const canPost = (content.trim() || mediaFile) && content.length <= 5000 && !postMut.isPending;
  const isActive = focused || !!content || !!mediaFile;

  return (
    <div
      className="rounded-xl border mb-5 overflow-hidden transition-all"
      style={{ backgroundColor: 'var(--color-panel)', borderColor: isActive ? 'rgba(139,92,246,0.4)' : 'var(--color-border)' }}
    >
      <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0], 'image')} />
      <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0], 'video')} />

      {/* Write / Preview toggle — only shown when active */}
      {isActive && (
        <div className="flex items-center gap-0.5 px-4 pt-3">
          {(['write', 'preview'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs mono font-medium transition-all ${
                mode === m ? 'text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
              style={mode === m ? { backgroundColor: 'var(--color-elevated)' } : {}}
            >
              {m === 'write' ? <PenLine size={11} /> : <Eye size={11} />}
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3 p-4 pt-3">
        {/* Avatar */}
        <Link to={`/u/${user.username}`} className="flex-shrink-0 mt-0.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center mono font-bold text-sm" style={{ background: 'linear-gradient(135deg, #7C3AED, #00E5FF)', color: 'white' }}>
            {user.username[0].toUpperCase()}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          {mode === 'write' ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => handleContentChange(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="Share a snippet, insight, or build update... (markdown supported)"
              rows={isActive ? 4 : 1}
              className="w-full bg-transparent text-sm text-slate-300 placeholder-slate-600 outline-none resize-none leading-relaxed font-mono"
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canPost) { e.preventDefault(); postMut.mutate(); } }}
            />
          ) : (
            /* Preview mode */
            <div className="min-h-[80px] text-sm">
              {content.trim() ? (
                <PostPreview content={content} />
              ) : (
                <p className="text-slate-600 text-xs mono italic">Nothing to preview yet...</p>
              )}
            </div>
          )}

          {/* Media preview */}
          {mediaPreview && (
            <div className="relative mt-2 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
              {mediaType === 'image'
                ? <img src={mediaPreview} alt="preview" className="max-h-48 w-auto rounded-lg object-contain" style={{ backgroundColor: 'var(--color-elevated)' }} />
                : <video src={mediaPreview} controls className="max-h-48 w-full rounded-lg" />
              }
              <button onClick={clearMedia} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                <X size={12} />
              </button>
            </div>
          )}

          {uploadError && <p className="text-xs mono text-red-400 mt-1">{uploadError}</p>}
        </div>
      </div>

      {/* Toolbar */}
      {isActive && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-0.5">

            {/* Code block */}
            <div className="relative">
              <button
                onClick={() => setShowLangPicker(p => !p)}
                className="flex items-center gap-1 px-2 py-1.5 rounded text-xs mono text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/5 transition-all"
                title="Insert code block"
              >
                <Code2 size={14} />
                <span className="hidden sm:inline">CODE</span>
                <ChevronDown size={10} />
              </button>
              {showLangPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowLangPicker(false)} />
                  <div
                    className="absolute bottom-9 left-0 z-20 w-44 rounded-xl border shadow-xl py-1"
                    style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}
                  >
                    <p className="text-xs mono text-slate-600 px-3 py-1.5">SELECT_LANGUAGE</p>
                    {LANGUAGES.map(l => (
                      <button
                        key={l.value}
                        onClick={() => insertCode(l.value)}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs mono text-slate-300 hover:text-white hover:bg-white/5 transition-all text-left"
                      >
                        <Code2 size={10} className="text-cyan-500 flex-shrink-0" />
                        {l.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Bold */}
            <button onClick={insertBold} className="px-2 py-1.5 rounded text-xs text-slate-400 hover:text-violet-400 hover:bg-violet-400/5 transition-all font-bold" title="Bold (**text**)">
              B
            </button>

            {/* Italic */}
            <button onClick={insertItalic} className="px-2 py-1.5 rounded text-xs text-slate-400 hover:text-violet-400 hover:bg-violet-400/5 transition-all italic font-semibold" title="Italic (*text*)">
              I
            </button>

            {/* Inline code */}
            <button onClick={insertInlineCode} className="flex items-center px-2 py-1.5 rounded text-xs mono text-slate-400 hover:text-violet-400 hover:bg-violet-400/5 transition-all" title="Inline code (`code`)">
              <span className="font-mono text-xs px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--color-elevated)' }}>`·`</span>
            </button>

            <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--color-border)' }} />

            {/* Image */}
            <button onClick={() => imageRef.current?.click()} className="flex items-center gap-1 px-2 py-1.5 rounded text-xs mono text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/5 transition-all" title="Add image (max 2MB)">
              <Image size={14} /><span className="hidden sm:inline">IMG</span>
            </button>

            {/* Video */}
            <button onClick={() => videoRef.current?.click()} className="flex items-center gap-1 px-2 py-1.5 rounded text-xs mono text-slate-400 hover:text-blue-400 hover:bg-blue-400/5 transition-all" title="Add video (max 5MB)">
              <Video size={14} /><span className="hidden sm:inline">VID</span>
            </button>

            <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--color-border)' }} />

            {/* Visibility */}
            <button onClick={() => setVisibility(v => v === 'public' ? 'private' : 'public')} className="flex items-center gap-1 px-2 py-1.5 rounded text-xs mono transition-all" style={{ color: visibility === 'public' ? 'var(--color-cyan)' : '#64748B' }}>
              {visibility === 'public' ? <Globe size={12} /> : <Lock size={12} />}
              <span className="hidden sm:inline">{visibility === 'public' ? 'PUBLIC' : 'PRIVATE'}</span>
            </button>

            <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--color-border)' }} />

            {/* Publish memory shortcut */}
            <Link to="/publish" className="flex items-center gap-1 px-2 py-1.5 rounded text-xs mono text-slate-500 hover:text-violet-400 transition-all" title="Publish a structured memory">
              <BookMarked size={12} />
              <span className="hidden sm:inline">MEMORY</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs mono ${content.length > 4500 ? 'text-red-400' : 'text-slate-600'}`}>
              {content.length}/5000
            </span>
            <button
              onClick={() => postMut.mutate()}
              disabled={!canPost}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs mono font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}
            >
              {postMut.isPending
                ? <><Loader2 size={11} className="animate-spin" />POSTING...</>
                : <><Send size={12} />POST</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Shared markdown renderer used by both preview and PostCard
export function PostMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      urlTransform={(url) => url}
      components={{
        // Code blocks — syntax highlighted
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const isBlock = !!match;
          if (isBlock) {
            return (
              <div className="my-3 rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(0,229,255,0.1)' }}>
                {/* Language label */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ backgroundColor: 'rgba(0,0,0,0.4)', borderColor: 'rgba(0,229,255,0.1)' }}>
                  <span className="text-xs mono text-cyan-500">{match[1]}</span>
                  <Code2 size={11} className="text-slate-600" />
                </div>
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.75rem', backgroundColor: '#0d1117', padding: '12px 16px' }}
                  codeTagProps={{ style: { fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace' } }}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            );
          }
          return (
            <code className="text-xs font-mono text-cyan-300 bg-slate-800/70 px-1.5 py-0.5 rounded" {...props}>
              {children}
            </code>
          );
        },
        pre({ children }) { return <>{children}</>; },
        p({ children }) { return <p className="text-slate-300 text-sm leading-relaxed mb-2 last:mb-0">{children}</p>; },
        h1({ children }) { return <h1 className="mono text-base font-bold text-white mt-3 mb-1">{children}</h1>; },
        h2({ children }) { return <h2 className="mono text-sm font-bold text-white mt-2 mb-1">{children}</h2>; },
        h3({ children }) { return <h3 className="mono text-xs font-bold text-slate-200 mt-2 mb-0.5">{children}</h3>; },
        ul({ children }) { return <ul className="list-disc list-inside text-slate-300 text-sm space-y-0.5 mb-2 pl-1">{children}</ul>; },
        ol({ children }) { return <ol className="list-decimal list-inside text-slate-300 text-sm space-y-0.5 mb-2 pl-1">{children}</ol>; },
        li({ children }) { return <li className="text-slate-300 text-sm">{children}</li>; },
        blockquote({ children }) { return <blockquote className="border-l-2 border-violet-500/50 pl-3 italic text-slate-400 text-sm my-2">{children}</blockquote>; },
        a({ href, children }) { return <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">{children}</a>; },
        strong({ children }) { return <strong className="text-white font-semibold">{children}</strong>; },
        em({ children }) { return <em className="text-slate-300 italic">{children}</em>; },
        hr() { return <hr className="border-slate-700/50 my-3" />; },
      }}
    >
      {processContent(content)}
    </ReactMarkdown>
  );
}

function PostPreview({ content }: { content: string }) {
  return (
    <div className="rounded-lg border p-3" style={{ backgroundColor: 'var(--color-elevated)', borderColor: 'var(--color-border)' }}>
      <PostMarkdown content={content} />
    </div>
  );
}
