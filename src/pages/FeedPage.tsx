import { useState, useRef } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { feedApi, postsApi, projectsApi, type FeedItem, type FeedTabType, type PostType } from '../lib/api';
import { MemoryCard } from '../components/MemoryCard';
import { PostCard } from '../components/PostCard';
import { ProjectCard } from '../components/ProjectCard';
import { Layout } from '../components/Layout';
import { useAuthStore } from '../store/auth';
import { useNavigate, Link } from 'react-router-dom';
import {
  Loader2, Zap, Code2, Brain, FolderKanban, Users, BarChart3,
  HelpCircle, MoreHorizontal, X, Plus, ChevronDown, Bold, Italic,
  Link2, List, Image, Smile, SlidersHorizontal, Globe, Sparkles,
  ExternalLink, Star, Users2,
} from 'lucide-react';

// ── Tab definition ────────────────────────────────────────────────────────

type TabDef = { key: FeedTabType; label: string };
const TABS: TabDef[] = [
  { key: 'all',            label: 'For You' },
  { key: 'build_updates',  label: 'Build' },
  { key: 'projects',       label: 'Projects' },
  { key: 'memories',       label: 'Memories' },
  { key: 'code',           label: 'Snippets' },
  { key: 'collaborations', label: 'Collabs' },
  { key: 'polls',          label: 'Polls' },
  { key: 'questions',      label: 'Questions' },
];

const PAGE_SIZE = 30;

// ── Post type options for composer ───────────────────────────────────────

type ComposerType = PostType | 'memory_import';

const POST_TYPES: { key: ComposerType; icon: React.ElementType; label: string; color: string; shortLabel: string }[] = [
  { key: 'build_update',   icon: Zap,          label: 'Build Update',             shortLabel: 'Build',     color: '#FF8A00' },
  { key: 'code_snippet',   icon: Code2,         label: 'Code Snippet',             shortLabel: 'Snippet',   color: '#00E5FF' },
  { key: 'memory_import',  icon: Brain,         label: 'Memory',                   shortLabel: 'Memory',    color: '#A855F7' },
  { key: 'general',        icon: FolderKanban,  label: 'Project Update',           shortLabel: 'Project',   color: '#00D97E' },
  { key: 'collab_request', icon: Users,         label: 'Looking for Collaborator', shortLabel: 'Collab',    color: '#FFA62B' },
  { key: 'poll',           icon: BarChart3,     label: 'Poll',                     shortLabel: 'Poll',      color: '#4F9EFF' },
  { key: 'question',       icon: HelpCircle,    label: 'Question',                 shortLabel: 'Question',  color: '#FFD60A' },
];

// ── Markdown insert helper ────────────────────────────────────────────────

function insertAtCursor(
  content: string,
  setContent: (v: string) => void,
  ta: HTMLTextAreaElement | null,
  before: string,
  after = ''
) {
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = content.slice(start, end);
  const newText = content.slice(0, start) + before + selected + after + content.slice(end);
  setContent(newText);
  setTimeout(() => {
    ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    ta.focus();
  }, 0);
}

// ── Feed Composer ─────────────────────────────────────────────────────────

function FeedComposer({ onPosted }: { onPosted: () => void }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [selectedType, setSelectedType] = useState<ComposerType | null>(null);
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [milestone, setMilestone] = useState('');
  const [roleNeeded, setRoleNeeded] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [compensation, setCompensation] = useState<string>('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollAnonymous, setPollAnonymous] = useState(false);
  const [pollMultiple, setPollMultiple] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createMut = useMutation({
    mutationFn: (data: Parameters<typeof postsApi.create>[0]) => postsApi.create(data),
    onSuccess: () => {
      setContent(''); setSelectedType(null); setExpanded(false);
      setMilestone(''); setRoleNeeded(''); setSkills([]); setSkillInput('');
      setPollOptions(['', '']); setPollAnonymous(false); setPollMultiple(false);
      qc.invalidateQueries({ queryKey: ['feed'] });
      onPosted();
    },
  });

  const handleTypeClick = (type: ComposerType) => {
    if (!user) { navigate('/login'); return; }
    if (type === 'memory_import') { navigate('/publish'); return; }
    setSelectedType(type);
    setExpanded(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSubmit = () => {
    if (!content.trim() && selectedType !== 'poll') return;
    if (selectedType === 'poll') {
      const validOptions = pollOptions.filter(o => o.trim());
      if (validOptions.length < 2) return;
    }

    const payload: Parameters<typeof postsApi.create>[0] = {
      type: (selectedType as PostType) ?? 'general',
      content: content.trim() || (selectedType === 'poll' ? 'Community Poll' : ''),
      language: selectedType === 'code_snippet' ? language : undefined,
      milestone: selectedType === 'build_update' ? milestone : undefined,
      roleNeeded: selectedType === 'collab_request' ? roleNeeded : undefined,
      skills: selectedType === 'collab_request' ? skills : undefined,
      compensation: selectedType === 'collab_request' ? compensation || undefined : undefined,
      pollOptions: selectedType === 'poll' ? pollOptions.filter(o => o.trim()) : undefined,
      pollIsAnonymous: selectedType === 'poll' ? pollAnonymous : undefined,
      pollAllowMultiple: selectedType === 'poll' ? pollMultiple : undefined,
    };

    createMut.mutate(payload);
  };

  const placeholder = {
    build_update:    "What did you ship today? Share your progress...",
    code_snippet:    "Paste or write your code snippet...",
    general:         "Tell us about your project...",
    collab_request:  "Describe what you're building and who you're looking for...",
    poll:            "Write your poll question...",
    question:        "Ask the community anything...",
  }[selectedType as string] ?? "What are you building today?";

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s]);
    setSkillInput('');
  };

  const updatePollOption = (i: number, val: string) => {
    setPollOptions(prev => prev.map((o, idx) => idx === i ? val : o));
  };

  const ins = (before: string, after = '') =>
    insertAtCursor(content, setContent, textareaRef.current, before, after);

  const selectedTypeDef = POST_TYPES.find(t => t.key === selectedType);

  if (!user) {
    return (
      <div
        className="rounded-2xl border p-6 mb-4"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <p className="text-center text-slate-400 text-sm mb-4">Join the community to share your work</p>
        <div className="flex gap-3 justify-center">
          <Link
            to="/login"
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="px-5 py-2 rounded-xl text-sm font-semibold border transition-all hover:bg-white/5"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            Register
          </Link>
        </div>
      </div>
    );
  }

  const borderGrad = expanded && selectedTypeDef?.color
    ? `linear-gradient(var(--color-card), var(--color-card)) padding-box, linear-gradient(135deg, ${selectedTypeDef.color}99 0%, ${selectedTypeDef.color}22 40%, rgba(0,229,255,0.22) 70%, rgba(0,229,255,0.8) 100%) border-box`
    : 'linear-gradient(var(--color-card), var(--color-card)) padding-box, linear-gradient(135deg, rgba(255,138,0,0.55) 0%, rgba(255,138,0,0.12) 35%, rgba(0,229,255,0.12) 65%, rgba(0,229,255,0.5) 100%) border-box';

  return (
    <div
      className="rounded-2xl mb-4 overflow-hidden transition-all relative"
      style={{ background: borderGrad, border: '1px solid transparent' }}
    >
      {/* Dot grid texture */}
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none rounded-2xl" />

      {/* Composer header */}
      <div
        className="relative flex items-start gap-3 p-4"
        onClick={() => !expanded && setExpanded(true)}
      >
        <div
          className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5"
          style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))', color: 'white' }}
        >
          {user.avatar
            ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            : user.username[0].toUpperCase()}
        </div>

        {!expanded ? (
          <div className="flex-1">
            <div
              className="px-4 py-3 rounded-xl text-sm text-slate-400 cursor-text border transition-colors hover:border-slate-500 font-medium"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
            >
              What are you shipping today?
            </div>
            <p className="text-xs text-slate-600 mt-1.5 pl-1">
              Share an update, memory, snippet, or ask the community.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-2">
            {selectedTypeDef && (
              <span
                className="text-xs font-semibold px-2 py-1 rounded-md"
                style={{ backgroundColor: `${selectedTypeDef.color}18`, color: selectedTypeDef.color }}
              >
                {selectedTypeDef.shortLabel.toUpperCase()}
              </span>
            )}
            <span className="text-sm text-slate-400">
              {selectedTypeDef ? selectedTypeDef.label : 'New post'}
            </span>
          </div>
        )}

        {expanded && (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(false); setSelectedType(null); }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Type selector (collapsed) */}
      {!expanded && (
        <div className="relative flex items-center gap-2 px-4 pb-4 overflow-x-auto scrollbar-none">
          {POST_TYPES.map(({ key, icon: Icon, shortLabel, color }) => (
            <button
              key={key}
              onClick={() => handleTypeClick(key)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border flex-shrink-0 transition-all hover:scale-105"
              style={{ borderColor: `${color}45`, backgroundColor: `${color}10`, color }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px ${color}40, 0 0 24px ${color}18`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{shortLabel}</span>
            </button>
          ))}
        </div>
      )}

      {/* Expanded composer */}
      {expanded && (
        <div className="relative px-4 pb-4 space-y-3">
          {/* Type selector row */}
          <div className="flex items-center gap-2 flex-wrap">
            {POST_TYPES.filter(t => t.key !== 'memory_import').map(({ key, icon: Icon, shortLabel, color }) => (
              <button
                key={key}
                onClick={() => setSelectedType(key)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                style={selectedType === key
                  ? { borderColor: color, backgroundColor: `${color}18`, color }
                  : { borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
              >
                <Icon size={12} />{shortLabel}
              </button>
            ))}
          </div>

          {/* Build update — milestone */}
          {selectedType === 'build_update' && (
            <input
              value={milestone}
              onChange={e => setMilestone(e.target.value)}
              placeholder="Milestone (e.g. v2.0 launched, +20% revenue)"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors"
              style={{ backgroundColor: 'var(--color-elevated)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            />
          )}

          {/* Code snippet — language selector */}
          {selectedType === 'code_snippet' && (
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs border outline-none"
              style={{ backgroundColor: 'var(--color-elevated)', borderColor: 'var(--color-border)', color: 'var(--color-cyan)' }}
            >
              {['typescript', 'javascript', 'tsx', 'jsx', 'python', 'rust', 'go', 'bash', 'sql', 'json', 'html', 'css'].map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          )}

          {/* Main textarea */}
          {selectedType !== 'poll' && (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={placeholder}
              rows={selectedType === 'code_snippet' ? 6 : 5}
              className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none transition-colors"
              style={{
                backgroundColor: 'var(--color-elevated)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
                fontFamily: selectedType === 'code_snippet' ? "'JetBrains Mono', monospace" : 'inherit',
              }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
            />
          )}

          {/* Rich text toolbar (non-code posts) */}
          {selectedType !== 'poll' && selectedType !== 'code_snippet' && (
            <div
              className="flex items-center gap-0.5 px-2 py-1.5 rounded-lg border"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
            >
              <button
                onClick={() => ins('**', '**')}
                className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-white/8 transition-all"
                title="Bold"
              >
                <Bold size={13} />
              </button>
              <button
                onClick={() => ins('*', '*')}
                className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-white/8 transition-all"
                title="Italic"
              >
                <Italic size={13} />
              </button>
              <button
                onClick={() => ins('`', '`')}
                className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-white/8 transition-all font-mono text-xs font-bold"
                title="Inline code"
              >
                {'</>'}
              </button>
              <button
                onClick={() => ins('[', '](url)')}
                className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-white/8 transition-all"
                title="Link"
              >
                <Link2 size={13} />
              </button>
              <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--color-border)' }} />
              <button
                onClick={() => ins('\n- ')}
                className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-white/8 transition-all"
                title="Bullet list"
              >
                <List size={13} />
              </button>
              <button
                onClick={() => ins('\n```\n', '\n```')}
                className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-white/8 transition-all"
                title="Code block"
              >
                <Code2 size={13} />
              </button>
              <span className="text-[10px] text-slate-700 ml-auto pr-1 hidden sm:block">⌘+Enter to publish</span>
            </div>
          )}

          {/* Poll options */}
          {selectedType === 'poll' && (
            <div className="space-y-2">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="What's your question?"
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none"
                style={{ backgroundColor: 'var(--color-elevated)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={opt}
                    onChange={e => updatePollOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ backgroundColor: 'var(--color-elevated)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  {pollOptions.length > 2 && (
                    <button
                      onClick={() => setPollOptions(prev => prev.filter((_, idx) => idx !== i))}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 6 && (
                <button
                  onClick={() => setPollOptions(prev => [...prev, ''])}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors px-1"
                >
                  <Plus size={13} /> Add option
                </button>
              )}
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={pollAnonymous} onChange={e => setPollAnonymous(e.target.checked)} className="rounded" />
                  Anonymous
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={pollMultiple} onChange={e => setPollMultiple(e.target.checked)} className="rounded" />
                  Multiple choice
                </label>
              </div>
            </div>
          )}

          {/* Collab fields */}
          {selectedType === 'collab_request' && (
            <div className="space-y-2">
              <input
                value={roleNeeded}
                onChange={e => setRoleNeeded(e.target.value)}
                placeholder="Role needed (e.g. Frontend Developer)"
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ backgroundColor: 'var(--color-elevated)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
              <div className="flex gap-2">
                <input
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                  placeholder="Add skills (press Enter)"
                  className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ backgroundColor: 'var(--color-elevated)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <select
                  value={compensation}
                  onChange={e => setCompensation(e.target.value)}
                  className="px-3 py-2 rounded-lg text-xs border outline-none"
                  style={{ backgroundColor: 'var(--color-elevated)', borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                >
                  <option value="">Compensation</option>
                  <option value="paid">Paid</option>
                  <option value="equity">Equity</option>
                  <option value="volunteer">Volunteer</option>
                  <option value="revenue_share">Rev Share</option>
                </select>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map(s => (
                    <span
                      key={s}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border"
                      style={{ borderColor: 'rgba(255,166,43,0.3)', color: 'var(--color-amber)', backgroundColor: 'rgba(255,166,43,0.08)' }}
                    >
                      {s}
                      <button
                        onClick={() => setSkills(prev => prev.filter(x => x !== s))}
                        className="hover:text-red-400 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bottom bar: audience + publish */}
          <div className="flex items-center gap-3 pt-1">
            {/* Audience selector */}
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:bg-white/5"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
            >
              <Globe size={12} />
              Everyone
              <ChevronDown size={11} />
            </button>

            {/* Publish button */}
            <button
              onClick={handleSubmit}
              disabled={createMut.isPending || (!content.trim() && selectedType !== 'poll')}
              className="ml-auto px-6 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 btn-primary"
              style={{ backgroundColor: selectedTypeDef?.color ?? 'var(--color-accent)' }}
            >
              {createMut.isPending ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Featured Project Card ─────────────────────────────────────────────────

function FeaturedProjectBanner() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const projectsQ = useQuery({
    queryKey: ['featured-project'],
    queryFn: () => feedApi.get('projects', 1, 0).then(r => r.data.items[0]),
    staleTime: 5 * 60_000,
  });

  const item = projectsQ.data as any;
  const project = item?.project ?? item;
  const author = item?.author;

  const followStatusQ = useQuery({
    queryKey: ['project-follow', project?.id],
    queryFn: () => projectsApi.followStatus(project!.id).then(r => r.data.following),
    enabled: !!user && !!project?.id,
  });

  const followMut = useMutation({
    mutationFn: () => projectsApi.follow(project!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-follow', project!.id] });
      qc.invalidateQueries({ queryKey: ['featured-project'] });
    },
  });

  if (!item || !project?.name) return null;

  return (
    <div
      className="rounded-2xl border mb-4 overflow-hidden relative"
      style={{
        background: 'linear-gradient(var(--color-card), var(--color-card)) padding-box, linear-gradient(135deg, rgba(0,217,126,0.4) 0%, rgba(0,229,255,0.2) 50%, rgba(255,138,0,0.2) 100%) border-box',
        border: '1px solid transparent',
      }}
    >
      <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />
      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wide"
            style={{ backgroundColor: 'rgba(52,211,153,0.12)', color: 'var(--color-success)' }}
          >
            ✦ FEATURED PROJECT
          </span>
          {project.status === 'launched' && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-md"
              style={{ backgroundColor: 'rgba(0,217,126,0.1)', color: 'var(--color-success)' }}
            >
              LAUNCHED
            </span>
          )}
        </div>

        <div className="flex gap-4">
          {/* Project icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(145deg, #051F0E 0%, #0D4A22 55%, #136E30 100%)',
              boxShadow: '0 0 14px rgba(52,211,153,0.3), 0 0 28px rgba(52,211,153,0.12)',
            }}
          >
            <FolderKanban
              size={24}
              style={{ color: '#6EE7B7', filter: 'drop-shadow(0 0 5px rgba(52,211,153,0.85))' }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <Link
              to={`/projects/${project.id}`}
              className="text-lg font-bold text-white hover:opacity-80 transition-opacity block leading-tight"
            >
              {project.name}
            </Link>
            {project.description && (
              <p className="text-sm text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {project.description}
              </p>
            )}
          </div>
        </div>

        {/* Tags */}
        {project.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {project.tags.slice(0, 5).map((tag: string) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: 'var(--color-elevated)', color: 'var(--color-muted)' }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          {author && (
            <Link to={`/u/${author.username}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div
                className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--color-accent)', color: 'white' }}
              >
                {author.avatar
                  ? <img src={author.avatar} alt="" className="w-full h-full object-cover" />
                  : author.username?.[0]?.toUpperCase()}
              </div>
              <span className="text-xs text-slate-500">{author.displayName || author.username}</span>
            </Link>
          )}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Users2 size={12} />
            <span>{(project.followerCount ?? 0).toLocaleString()} followers</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* Follow button */}
            <button
              onClick={() => { if (!user) { navigate('/login'); return; } followMut.mutate(); }}
              disabled={followMut.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border disabled:opacity-50"
              style={followStatusQ.data
                ? { borderColor: 'rgba(52,211,153,0.3)', color: 'var(--color-success)', backgroundColor: 'rgba(52,211,153,0.08)' }
                : { borderColor: 'rgba(52,211,153,0.4)', color: 'var(--color-success)', backgroundColor: 'rgba(52,211,153,0.1)' }
              }
            >
              {followStatusQ.data ? '✓ Following' : '+ Follow'}
            </button>
            <Link
              to={`/projects/${project.id}`}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white transition-all btn-primary"
              style={{ backgroundColor: 'var(--color-success)' }}
            >
              View
              <ExternalLink size={11} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Feed Page ─────────────────────────────────────────────────────────────

export function FeedPage() {
  const [tab, setTab] = useState<FeedTabType>('all');
  const qc = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['feed', tab],
    queryFn: ({ pageParam = 0 }) =>
      feedApi.get(tab, PAGE_SIZE, pageParam as number).then(r => r.data),
    getNextPageParam: (lastPage, pages) =>
      lastPage.items.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined,
    initialPageParam: 0,
  });

  const items = query.data?.pages.flatMap(p => p.items) ?? [];
  const isLoading = query.isLoading;
  const isFetchingNextPage = query.isFetchingNextPage;
  const hasNextPage = query.hasNextPage;

  return (
    <Layout>
      <Helmet>
        <title>ShipHub — The home of builders</title>
        <meta name="description" content="Join builders shipping projects, sharing code, and finding collaborators." />
      </Helmet>

      <div className="px-4 md:px-6 py-5">

        {/* Composer */}
        <FeedComposer onPosted={() => qc.invalidateQueries({ queryKey: ['feed'] })} />

        {/* Featured Project */}
        <FeaturedProjectBanner />

        {/* Tabs */}
        <div
          className="sticky top-14 z-20 -mx-4 px-4 pt-1 pb-0 mb-3"
          style={{ backgroundColor: 'var(--color-base)' }}
        >
          <div
            className="flex items-center gap-0 overflow-x-auto scrollbar-none border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex gap-0 flex-1 overflow-x-auto scrollbar-none">
              {TABS.map(({ key, label }) => (
                <button
                  key={key + label}
                  onClick={() => setTab(key)}
                  className={`px-3 py-2.5 text-sm font-semibold whitespace-nowrap flex-shrink-0 border-b-2 -mb-px transition-all ${
                    tab === key && label === (TABS.find(t => t.key === tab)?.label)
                      ? 'text-white'
                      : 'text-slate-600 border-transparent hover:text-slate-400'
                  }`}
                  style={tab === key ? {
                    borderColor: 'var(--color-accent)',
                    color: 'var(--color-text)',
                    textShadow: '0 0 12px rgba(255,138,0,0.5)',
                  } : {}}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Filter icon */}
            <button
              className="flex-shrink-0 p-2 ml-1 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all"
              title="Filter"
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 size={20} className="animate-spin text-slate-600" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && items.length === 0 && (
          <div className="text-center py-20">
            <p className="text-white font-semibold mb-2">Nothing here yet</p>
            <p className="text-slate-500 text-sm">Be the first to post in this category.</p>
          </div>
        )}

        {/* Feed items */}
        <div className="space-y-3">
          {items.map((item: FeedItem) => {
            if (item.type === 'memory') {
              return <MemoryCard key={item.memory.id} memory={item.memory} author={item.author} />;
            }
            if (item.type === 'project') {
              return <ProjectCard key={item.project.id} project={item.project} author={item.author} />;
            }
            return (
              <PostCard
                key={item.post.id}
                post={item.post}
                author={item.author}
                quotedPost={(item as any).quotedPost}
                quotedMemory={(item as any).quotedMemory}
                quotedProject={(item as any).quotedProject}
              />
            );
          })}
        </div>

        {/* Pagination */}
        {!isLoading && items.length > 0 && (
          <div className="flex justify-center mt-8 pb-4">
            {hasNextPage ? (
              <button
                onClick={() => query.fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-6 py-2.5 rounded-xl border text-sm font-medium text-slate-400 hover:text-white hover:border-slate-500 transition-all disabled:opacity-50"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
              >
                {isFetchingNextPage
                  ? <Loader2 size={14} className="animate-spin mx-auto" />
                  : 'Load more'}
              </button>
            ) : (
              <p className="text-xs text-slate-600">You're all caught up ✓</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

// ── Project feed card ─────────────────────────────────────────────────────

function ProjectFeedCard({ project, author }: { project: any; author: any }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const followStatusQ = useQuery({
    queryKey: ['project-follow', project.id],
    queryFn: () => projectsApi.followStatus(project.id).then(r => r.data.following),
    enabled: !!user,
  });

  const followMut = useMutation({
    mutationFn: () => projectsApi.follow(project.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-follow', project.id] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const isFollowing = followStatusQ.data;

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all card-scanline"
      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(52,211,153,0.35)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(52,211,153,0.07), 0 0 0 1px rgba(52,211,153,0.1)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
        (e.currentTarget as HTMLElement).style.boxShadow = '';
        (e.currentTarget as HTMLElement).style.transform = '';
      }}
    >
      <div className="flex">
        {/* Left icon column */}
        <div className="flex-shrink-0 flex flex-col items-center pt-3 pb-3 w-[64px] md:w-[72px]">
          <div
            className="w-12 h-12 md:w-[52px] md:h-[52px] rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(145deg, #051F0E 0%, #0D4A22 55%, #136E30 100%)',
              boxShadow: '0 0 14px rgba(52,211,153,0.3), 0 0 28px rgba(52,211,153,0.12)',
              animation: 'none',
            }}
          >
            <FolderKanban
              size={22}
              style={{ color: '#6EE7B7', filter: 'drop-shadow(0 0 5px rgba(52,211,153,0.85))' }}
            />
          </div>
          <div className="flex-1 mt-2 w-px min-h-[12px]" style={{ backgroundColor: 'var(--color-border)' }} />
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0">
          {/* Top row */}
          <div className="flex items-center gap-2 pr-3 pt-3 pb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wide badge-project flex-shrink-0">
              PROJECT
            </span>
            {project.status === 'launched' && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0"
                style={{ backgroundColor: 'rgba(0,217,126,0.1)', color: 'var(--color-success)' }}
              >
                LAUNCHED
              </span>
            )}
          </div>

          {/* Title */}
          <div className="pr-4 pb-1">
            <Link
              to={`/projects/${project.id}`}
              className="text-base font-semibold text-white hover:text-slate-200 transition-colors leading-snug block"
            >
              {project.name}
            </Link>
          </div>

          {/* Description + optional demo link */}
          <div className="pr-4 pb-2 flex gap-3 items-start">
            <div className="flex-1 min-w-0">
              {project.description && (
                <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">{project.description}</p>
              )}
              {project.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {project.tags.slice(0, 4).map((tag: string) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: 'var(--color-elevated)', color: 'var(--color-muted)' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {project.websiteUrl && (
              <a
                href={project.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ backgroundColor: 'rgba(0,217,126,0.1)', color: 'var(--color-success)' }}
              >
                Demo →
              </a>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center gap-2 pr-3 py-2 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <Link
              to={`/u/${author?.username}`}
              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            >
              <div
                className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold"
                style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))', color: 'white' }}
              >
                {author?.avatar
                  ? <img src={author.avatar} alt="" className="w-full h-full object-cover" />
                  : author?.username?.[0]?.toUpperCase()}
              </div>
              <span className="text-xs text-slate-500">{author?.displayName || author?.username}</span>
            </Link>

            <span className="text-slate-700 text-xs mx-0.5 hidden sm:block">·</span>
            <span className="text-xs text-slate-600 hidden sm:block">
              <span className="font-semibold text-slate-400">{project.followerCount ?? 0}</span> followers
            </span>

            {/* Follow button */}
            <button
              onClick={() => { if (!user) { navigate('/login'); return; } followMut.mutate(); }}
              disabled={followMut.isPending}
              className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border disabled:opacity-50"
              style={isFollowing
                ? { borderColor: 'rgba(52,211,153,0.25)', color: 'var(--color-success)', backgroundColor: 'rgba(52,211,153,0.06)' }
                : { borderColor: 'rgba(52,211,153,0.35)', color: 'var(--color-success)', backgroundColor: 'rgba(52,211,153,0.08)' }
              }
            >
              {isFollowing ? (
                <>✓ Following</>
              ) : (
                <>
                  <Star size={11} />
                  Follow
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
