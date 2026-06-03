import { useState, useRef } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { feedApi, postsApi, type FeedItem, type FeedTabType, type PostType } from '../lib/api';
import { MemoryCard } from '../components/MemoryCard';
import { PostCard } from '../components/PostCard';
import { Layout } from '../components/Layout';
import { useAuthStore } from '../store/auth';
import { useNavigate, Link } from 'react-router-dom';
import {
  Loader2, Zap, Code2, Brain, FolderKanban, Users, BarChart3,
  HelpCircle, MoreHorizontal, X, Plus, ChevronDown,
} from 'lucide-react';

// ── Tab definition ────────────────────────────────────────────────────────

type TabDef = { key: FeedTabType; label: string };
const TABS: TabDef[] = [
  { key: 'all',            label: 'All' },
  { key: 'build_updates',  label: 'Build Updates' },
  { key: 'projects',       label: 'Projects' },
  { key: 'code',           label: 'Code' },
  { key: 'memories',       label: 'Memories' },
  { key: 'collaborations', label: 'Collaborations' },
  { key: 'polls',          label: 'Polls' },
];

const PAGE_SIZE = 30;

// ── Post type options for composer ───────────────────────────────────────

type ComposerType = PostType | 'memory_import';

const POST_TYPES: { key: ComposerType; icon: React.ElementType; label: string; color: string; shortLabel: string }[] = [
  { key: 'build_update',   icon: Zap,          label: 'Build Update',             shortLabel: 'Build Update',  color: '#FF4D4D' },
  { key: 'code_snippet',   icon: Code2,         label: 'Code Snippet',             shortLabel: 'Code Snippet',  color: '#00E5FF' },
  { key: 'memory_import',  icon: Brain,         label: 'Memory',                   shortLabel: 'Memory',        color: '#A855F7' },
  { key: 'general',        icon: FolderKanban,  label: 'Project',                  shortLabel: 'Project',       color: '#00D97E' },
  { key: 'collab_request', icon: Users,         label: 'Looking for Collaborator', shortLabel: 'Collab',        color: '#FFA62B' },
  { key: 'poll',           icon: BarChart3,     label: 'Poll',                     shortLabel: 'Poll',          color: '#00E5FF' },
  { key: 'question',       icon: HelpCircle,    label: 'Question',                 shortLabel: 'Question',      color: '#00D97E' },
];

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
    build_update: "What did you ship today? Share your progress...",
    code_snippet: "Paste or write your code snippet...",
    general:      "Tell us about your project...",
    collab_request: "Describe what you're building and who you're looking for...",
    poll:         "Write your poll question...",
    question:     "Ask the community anything...",
  }[selectedType as string] ?? "What are you building today?";

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s]);
    setSkillInput('');
  };

  const updatePollOption = (i: number, val: string) => {
    setPollOptions(prev => prev.map((o, idx) => idx === i ? val : o));
  };

  const selectedTypeDef = POST_TYPES.find(t => t.key === selectedType);

  if (!user) {
    return (
      <div className="rounded-2xl border p-6 mb-4" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
        <p className="text-center text-slate-400 text-sm mb-4">Join the community to share your work</p>
        <div className="flex gap-3 justify-center">
          <Link to="/login" className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ backgroundColor: 'var(--color-accent)' }}>Sign in</Link>
          <Link to="/register" className="px-5 py-2 rounded-xl text-sm font-semibold border transition-all hover:bg-white/5"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>Register</Link>
        </div>
      </div>
    );
  }

  const borderGrad = expanded && selectedTypeDef?.color
    ? `linear-gradient(var(--color-card), var(--color-card)) padding-box, linear-gradient(135deg, ${selectedTypeDef.color}99 0%, ${selectedTypeDef.color}22 40%, rgba(0,229,255,0.22) 70%, rgba(0,229,255,0.8) 100%) border-box`
    : 'linear-gradient(var(--color-card), var(--color-card)) padding-box, linear-gradient(135deg, rgba(255,77,77,0.55) 0%, rgba(255,77,77,0.12) 35%, rgba(0,229,255,0.12) 65%, rgba(0,229,255,0.5) 100%) border-box';

  return (
    <div className="rounded-2xl mb-4 overflow-hidden transition-all relative"
      style={{ background: borderGrad, border: '1px solid transparent' }}>

      {/* Dot grid texture */}
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none rounded-2xl" />

      {/* Composer header */}
      <div className="relative flex items-center gap-3 p-4" onClick={() => !expanded && setExpanded(true)}>
        <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))', color: 'white' }}>
          {user.avatar
            ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            : user.username[0].toUpperCase()}
        </div>
        {!expanded ? (
          <div className="flex-1 px-4 py-2.5 rounded-xl text-sm text-slate-400 cursor-text border transition-colors hover:border-slate-500 font-medium"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
            What are you building today?
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-2">
            {selectedTypeDef && (
              <span className="text-xs font-semibold px-2 py-1 rounded-md"
                style={{ backgroundColor: `${selectedTypeDef.color}18`, color: selectedTypeDef.color }}>
                {selectedTypeDef.shortLabel.toUpperCase()}
              </span>
            )}
            <span className="text-sm text-slate-400">
              {selectedTypeDef ? selectedTypeDef.label : 'New post'}
            </span>
          </div>
        )}
        {expanded && (
          <button onClick={e => { e.stopPropagation(); setExpanded(false); setSelectedType(null); }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Type selector */}
      {!expanded && (
        <div className="relative flex items-center gap-2 px-4 pb-4 overflow-x-auto scrollbar-none">
          {POST_TYPES.map(({ key, icon: Icon, label, shortLabel, color }) => (
            <button key={key} onClick={() => handleTypeClick(key)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border flex-shrink-0 transition-all hover:scale-105"
              style={{ borderColor: `${color}45`, backgroundColor: `${color}10`, color }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px ${color}40, 0 0 24px ${color}18`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>
              <Icon size={13} />
              <span className="hidden sm:inline">{shortLabel}</span>
            </button>
          ))}
        </div>
      )}

      {/* Expanded composer */}
      {expanded && (
        <div className="relative px-4 pb-4 space-y-3">
          {/* Type selector when expanded */}
          <div className="flex items-center gap-2 flex-wrap">
            {POST_TYPES.filter(t => t.key !== 'memory_import').map(({ key, icon: Icon, shortLabel, color }) => (
              <button key={key} onClick={() => setSelectedType(key)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                style={selectedType === key
                  ? { borderColor: color, backgroundColor: `${color}18`, color }
                  : { borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
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
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs border outline-none"
              style={{ backgroundColor: 'var(--color-elevated)', borderColor: 'var(--color-border)', color: 'var(--color-cyan)' }}>
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
              rows={selectedType === 'code_snippet' ? 6 : 3}
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
                    <button onClick={() => setPollOptions(prev => prev.filter((_, idx) => idx !== i))}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 6 && (
                <button onClick={() => setPollOptions(prev => [...prev, ''])}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors px-1">
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
                <select value={compensation} onChange={e => setCompensation(e.target.value)}
                  className="px-3 py-2 rounded-lg text-xs border outline-none"
                  style={{ backgroundColor: 'var(--color-elevated)', borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
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
                    <span key={s} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border"
                      style={{ borderColor: 'rgba(255,166,43,0.3)', color: 'var(--color-amber)', backgroundColor: 'rgba(255,166,43,0.08)' }}>
                      {s}
                      <button onClick={() => setSkills(prev => prev.filter(x => x !== s))} className="hover:text-red-400 transition-colors">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-600">⌘ + Enter to post</span>
            <button
              onClick={handleSubmit}
              disabled={createMut.isPending || (!content.trim() && selectedType !== 'poll')}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 btn-primary"
              style={{ backgroundColor: selectedTypeDef?.color ?? 'var(--color-accent)' }}>
              {createMut.isPending ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      )}
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

      <div className="max-w-[680px] mx-auto px-4 py-5">

        {/* Composer */}
        <FeedComposer onPosted={() => qc.invalidateQueries({ queryKey: ['feed'] })} />

        {/* Tabs */}
        <div className="sticky top-0 z-20 -mx-4 px-4 pt-2 pb-1 mb-3"
          style={{ backgroundColor: 'var(--color-base)' }}>
          <div className="flex gap-1 overflow-x-auto scrollbar-none border-b pb-0"
            style={{ borderColor: 'var(--color-border)' }}>
            {TABS.map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`px-3 py-2.5 text-sm font-semibold whitespace-nowrap flex-shrink-0 border-b-2 -mb-px transition-all ${
                  tab === key ? 'text-white' : 'text-slate-600 border-transparent hover:text-slate-400'
                }`}
                style={tab === key ? {
                  borderColor: 'var(--color-accent)',
                  color: 'var(--color-text)',
                  textShadow: '0 0 12px rgba(255,77,77,0.5)',
                } : {}}>
                {label}
              </button>
            ))}
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
              return <ProjectFeedCard key={item.project.id} project={item.project} author={item.author} />;
            }
            return <PostCard key={item.post.id} post={item.post} author={item.author}
              quotedPost={(item as any).quotedPost} quotedMemory={(item as any).quotedMemory} />;
          })}
        </div>

        {/* Pagination */}
        {!isLoading && items.length > 0 && (
          <div className="flex justify-center mt-8 pb-4">
            {hasNextPage ? (
              <button onClick={() => query.fetchNextPage()} disabled={isFetchingNextPage}
                className="px-6 py-2.5 rounded-xl border text-sm font-medium text-slate-400 hover:text-white hover:border-slate-500 transition-all disabled:opacity-50"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
                {isFetchingNextPage ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Load more'}
              </button>
            ) : (
              <p className="text-xs text-slate-600">You're all caught up</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

// ── Project feed card ─────────────────────────────────────────────────────

function ProjectFeedCard({ project, author }: { project: any; author: any }) {
  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold px-2 py-0.5 rounded-md badge-project">PROJECT</span>
          {project.status === 'launched' && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(0,217,126,0.1)', color: 'var(--color-success)' }}>
              LAUNCHED
            </span>
          )}
        </div>

        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <Link to={`/projects/${project.id}`} className="text-base font-semibold text-white hover:text-slate-200 transition-colors block mb-1">
              {project.name}
            </Link>
            {project.description && (
              <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">{project.description}</p>
            )}
            {project.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {project.tags.slice(0, 4).map((tag: string) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-md"
                    style={{ backgroundColor: 'var(--color-elevated)', color: 'var(--color-muted)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {project.websiteUrl && (
              <a href={project.websiteUrl} target="_blank" rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ backgroundColor: 'rgba(0,217,126,0.1)', color: 'var(--color-success)' }}>
                Visit Demo →
              </a>
            )}
            <div className="text-xs text-slate-500 text-right">
              <span className="font-semibold text-white">{project.followerCount}</span> followers
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <Link to={`/u/${author?.username}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--color-accent)', color: 'white' }}>
              {author?.avatar ? <img src={author.avatar} alt="" className="w-full h-full object-cover" /> : author?.username?.[0]?.toUpperCase()}
            </div>
            <span className="text-xs text-slate-500">{author?.displayName || author?.username}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
