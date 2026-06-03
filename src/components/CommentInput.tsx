import { useState, useRef } from 'react';
import { Code2, Bold, ChevronDown } from 'lucide-react';
import { PostMarkdown } from './ComposeBox';
import { processContent } from '../lib/utils';

const LANGUAGES = ['typescript','javascript','python','rust','go','bash','sql','json','html','css'];

interface CommentInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isPending?: boolean;
  placeholder?: string;
}

export function CommentInput({ value, onChange, onSubmit, isPending, placeholder = 'Add a comment...' }: CommentInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [showLang, setShowLang] = useState(false);
  const [focused, setFocused] = useState(false);

  const insert = (before: string, after: string, ph: string) => {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const sel = value.slice(s, e) || ph;
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    onChange(next);
    setTimeout(() => { el.focus(); el.setSelectionRange(s + before.length, s + before.length + sel.length); }, 0);
  };

  const insertCode = (lang: string) => {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const sel = value.slice(s, e);
    const block = `\`\`\`${lang}\n${sel || '// code here'}\n\`\`\``;
    const next = value.slice(0, s) + block + value.slice(e);
    onChange(next);
    setShowLang(false);
    setTimeout(() => { el.focus(); }, 0);
  };

  const active = focused || !!value;

  return (
    <div className="rounded-lg border transition-all" style={{ borderColor: active ? 'rgba(139,92,246,0.4)' : 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}>
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && value.trim()) { e.preventDefault(); onSubmit(); } }}
        placeholder={placeholder}
        rows={active ? 3 : 1}
        className="w-full px-3 py-2 text-xs text-white bg-transparent outline-none resize-none font-mono leading-relaxed"
      />

      {active && (
        <div className="flex items-center gap-0.5 px-2 pb-2 pt-0.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          {/* Bold */}
          <button onClick={() => insert('**', '**', 'bold')} className="px-2 py-1 rounded text-xs font-bold text-slate-500 hover:text-slate-400 hover:bg-violet-400/5 transition-all">B</button>
          {/* Italic */}
          <button onClick={() => insert('*', '*', 'italic')} className="px-2 py-1 rounded text-xs italic font-semibold text-slate-500 hover:text-slate-400 hover:bg-violet-400/5 transition-all">I</button>
          {/* Inline code */}
          <button onClick={() => insert('`', '`', 'code')} className="px-1.5 py-1 rounded text-xs mono text-slate-500 hover:text-cyan-400 hover:bg-cyan-400/5 transition-all">`Â·`</button>

          {/* Code block */}
          <div className="relative">
            <button onClick={() => setShowLang(p => !p)} className="flex items-center gap-0.5 px-2 py-1 rounded text-xs mono text-slate-500 hover:text-cyan-400 hover:bg-cyan-400/5 transition-all">
              <Code2 size={11} /><ChevronDown size={9} />
            </button>
            {showLang && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowLang(false)} />
                <div className="absolute bottom-8 left-0 z-20 w-36 rounded-xl border shadow-xl py-1" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                  {LANGUAGES.map(l => (
                    <button key={l} onClick={() => insertCode(l)} className="w-full px-3 py-1.5 text-xs mono text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left">{l}</button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="ml-auto">
            <button
              onClick={onSubmit}
              disabled={!value.trim() || isPending}
              className="px-3 py-1 rounded text-xs mono font-semibold text-white disabled:opacity-40 transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))' }}
            >
              {isPending ? '...' : 'POST'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Renders a single comment body with markdown + mention/hashtag links
export function CommentBody({ content }: { content: string }) {
  return (
    <span className="text-xs text-slate-400 leading-relaxed">
      <PostMarkdown content={processContent(content)} />
    </span>
  );
}
