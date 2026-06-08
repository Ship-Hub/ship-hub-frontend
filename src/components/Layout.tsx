import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import {
  Home, Compass, FolderKanban, Brain, Code2, Users, Trophy, CalendarDays,
  ShoppingBag, MessageSquare, Mail, Bookmark, Network, Bell, Search,
  Settings, LogOut, Plus, X, Menu, TrendingUp, MessageCircle, FileText,
  Shield, Sparkles, Zap, Activity, ChevronDown, Star,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { authApi, dmApi, usersApi, eventsApi, feedApi, presenceApi, type TrendingBuilder, type OnlineUser } from '../lib/api';
import { QuoteModal } from './QuoteModal';
import { timeAgo } from '../lib/utils';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/v1';

type NavItem = { to: string; icon: React.ElementType; label: string; authOnly?: boolean; adminOnly?: boolean; badge?: string | number };
type NavGroup = { label?: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { to: '/',        icon: Home,    label: 'Home' },
      { to: '/explore', icon: Compass, label: 'Explore' },
    ],
  },
  {
    label: 'Build',
    items: [
      { to: '/projects',       icon: FolderKanban, label: 'Projects' },
      { to: '/memories',       icon: Brain,        label: 'Memories' },
      { to: '/code-snippets',  icon: Code2,        label: 'Code Snippets' },
      { to: '/collaborations', icon: Users,        label: 'Collaborations' },
      { to: '/showcase',       icon: Sparkles,     label: 'Showcase' },
    ],
  },
  {
    label: 'Community',
    items: [
      { to: '/builders', icon: Trophy,       label: 'Builders' },
      { to: '/events',   icon: CalendarDays, label: 'Events' },
      { to: '/chat',     icon: MessageSquare, label: 'Community Chat', badge: 'Live' },
      { to: '/messages', icon: Mail,          label: 'Messages', authOnly: true },
    ],
  },
  {
    label: 'Discover',
    items: [
      { to: '/saved',       icon: Bookmark,    label: 'Saved', authOnly: true },
      { to: '/marketplace', icon: ShoppingBag, label: 'Marketplace' },
      { to: '/graph',       icon: Network,     label: 'Knowledge Graph' },
      { to: '/admin',       icon: Shield,      label: 'Admin Panel', authOnly: true, adminOnly: true },
    ],
  },
];

// ── XP helpers ────────────────────────────────────────────────────────────────

function calcXp(memoryCount: number, followerCount: number, postCount?: number) {
  return (memoryCount ?? 0) * 40 + (followerCount ?? 0) * 8 + (postCount ?? 0) * 15;
}

function calcLevel(xp: number) {
  return Math.max(1, Math.floor(xp / 500) + 1);
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, clearAuth, setAuth } = useAuthStore();
  const [searchVal, setSearchVal] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('shiphub_token');
    if (!token) return;
    authApi.me()
      .then(res => setAuth(res.data.user, token))
      .catch(() => {});
  }, [user?.id]);

  const dmUnreadQ = useQuery({
    queryKey: ['dm-unread'],
    queryFn: () => dmApi.unreadCount().then(r => r.data.count),
    enabled: !!user,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
  const dmUnread = dmUnreadQ.data ?? 0;

  // SSE for notifications
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('shiphub_token');
    if (!token) return;
    const es = new EventSource(`${BASE_URL}/notifications/stream?token=${token}`);
    esRef.current = es;
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'count') setUnreadCount(data.count);
      else if (data.type === 'notification') {
        setUnreadCount(c => c + 1);
        qc.invalidateQueries({ queryKey: ['notifications'] });
        qc.invalidateQueries({ queryKey: ['dm-unread'] });
      }
    };
    es.onerror = () => es.close();
    return () => { es.close(); esRef.current = null; };
  }, [user?.id]);

  // Heartbeat for presence
  const heartbeatMut = useMutation({ mutationFn: () => presenceApi.heartbeat() });
  useEffect(() => {
    if (!user) return;
    heartbeatMut.mutate();
    const interval = setInterval(() => heartbeatMut.mutate(), 60_000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleLogout = () => { clearAuth(); navigate('/login'); };

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const navGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items
      .filter(i => !i.authOnly || user)
      .filter(i => !i.adminOnly || !!(user?.isAdmin || user?.platformAdmin))
      .map(item => ({
        ...item,
        badge: item.to === '/messages' ? (dmUnread > 0 ? dmUnread : undefined) : item.badge,
      })),
  })).filter(g => g.items.length > 0);

  // Flat list for mobile drawer
  const navItemsFlat = navGroups.flatMap(g => g.items);

  // XP
  const xp = user ? calcXp(user.memoryCount ?? 0, user.followerCount ?? 0, (user as any).postCount) : 0;
  const level = calcLevel(xp);
  const xpProgress = Math.min(100, ((xp % 500) / 500) * 100);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-base)' }}>

      {/* ── Left Sidebar (fixed 280px) ──────────────────────────── */}
      <aside
        className="fixed left-0 top-0 h-full w-[280px] border-r hidden md:flex flex-col z-40 overflow-y-auto"
        style={{ backgroundColor: 'var(--color-secondary)', borderColor: 'var(--color-border)' }}
      >
        {/* Logo + tagline */}
        <div className="px-5 py-4 flex-shrink-0">
          <Link to="/" className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
              style={{ background: 'var(--color-accent)', boxShadow: '0 0 14px rgba(255,138,0,0.5), 0 0 28px rgba(255,138,0,0.2)' }}
            >
              S
            </div>
            <span className="font-bold text-white text-lg tracking-tight">ShipHub</span>
          </Link>
          <p className="mt-1 pl-[42px] text-xs text-slate-600 font-medium tracking-wide">
            Build together. Ship together.
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pb-2 space-y-0.5">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p
                  className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--color-accent)', opacity: 0.6 }}
                >
                  {group.label}
                </p>
              )}
              {group.items.map(({ to, icon: Icon, label, badge }) => {
                const active = isActive(to);
                return (
                  <Link
                    key={to} to={to}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                      active ? 'nav-active' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={17} className={active ? '' : 'group-hover:scale-105 transition-transform'} />
                      <span>{label}</span>
                    </div>
                    {badge !== undefined && badge !== '' && (
                      <span
                        className={cn('text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0',
                          badge === 'Live' ? 'text-emerald-300' : 'text-white'
                        )}
                        style={badge === 'Live'
                          ? { backgroundColor: 'rgba(52,211,153,0.15)', animation: 'liveGlow 1.8s ease-in-out infinite' }
                          : { backgroundColor: 'rgba(255,138,0,0.85)' }}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Profile card */}
        {user ? (
          <div className="px-3 pb-3 flex-shrink-0 mt-auto">
            <div
              className="rounded-xl p-3 border"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'rgba(255,138,0,0.2)', boxShadow: '0 0 20px rgba(255,138,0,0.06)' }}
            >
              <Link to={`/u/${user.username}`} className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))', color: 'white' }}
                >
                  {user.avatar
                    ? <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                    : user.username[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-white truncate">{user.displayName || user.username}</span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                      style={{ backgroundColor: 'rgba(255,138,0,0.15)', color: 'var(--color-accent)' }}
                    >
                      Lvl {level}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">@{user.username}</span>
                </div>
              </Link>

              {/* XP bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-slate-500">
                    {xp.toLocaleString()} XP
                  </span>
                  <span className="text-[10px] text-slate-600">
                    → {(level * 500).toLocaleString()} XP
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-elevated)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${xpProgress}%`,
                      background: 'linear-gradient(90deg, var(--color-accent), var(--color-cyan))',
                      boxShadow: '0 0 6px rgba(255,138,0,0.5)',
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                <div className="text-center">
                  <div className="font-semibold text-white text-sm">{user.memoryCount}</div>
                  <div>Memories</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-white text-sm">{user.followerCount}</div>
                  <div>Followers</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-white text-sm">{user.followingCount}</div>
                  <div>Following</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/notifications"
                  className="relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <Bell size={14} />
                  {unreadCount > 0 && (
                    <span
                      className="absolute top-1 right-2 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold badge-pulse"
                      style={{ backgroundColor: 'var(--color-accent)', fontSize: '9px' }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <Link
                  to={`/u/${user.username}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <Settings size={14} />
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/5 transition-all"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-3 pb-4 flex-shrink-0">
            <Link
              to="/login"
              className="btn-primary flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              Sign in
            </Link>
          </div>
        )}
      </aside>

      {/* ── Desktop top bar (md+) ───────────────────────────────── */}
      <header
        className="hidden md:flex fixed top-0 left-[280px] right-0 z-40 h-14 border-b items-center px-5 gap-4"
        style={{ backgroundColor: 'var(--color-secondary)', borderColor: 'var(--color-border)' }}
      >
        {/* Search */}
        <form
          className="flex-1 max-w-md"
          onSubmit={e => { e.preventDefault(); if (searchVal.trim()) navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`); }}
        >
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              placeholder="Search builders, projects, memories..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-sm text-slate-300 border outline-none transition-colors"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
            />
          </div>
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Create button */}
          <div className="relative">
            <button
              onClick={() => setCreateOpen(p => !p)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white transition-all btn-primary"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              <Plus size={15} />
              <span>Create</span>
              <ChevronDown size={13} className={`transition-transform ${createOpen ? 'rotate-180' : ''}`} />
            </button>
            {createOpen && (
              <div
                className="absolute right-0 top-11 z-50 w-44 rounded-xl border shadow-2xl py-1"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
              >
                {[
                  { to: '/publish',   icon: Brain,     label: 'Add Memory',  color: '#A855F7' },
                  { to: '/?compose=build_update',   icon: Zap,       label: 'Build Update',color: '#FF8A00' },
                  { to: '/?compose=code_snippet',   icon: Code2,     label: 'Code Snippet',color: '#00E5FF' },
                  { to: '/projects/new', icon: FolderKanban, label: 'New Project', color: '#00D97E' },
                ].map(({ to, icon: Icon, label, color }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setCreateOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <Icon size={14} style={{ color }} />
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          {user && (
            <Link to="/notifications" className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white badge-pulse"
                  style={{ backgroundColor: 'var(--color-accent)', fontSize: '9px' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* Messages */}
          {user && (
            <Link to="/messages" className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
              <MessageSquare size={18} />
              {dmUnread > 0 && (
                <span
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white badge-pulse"
                  style={{ backgroundColor: 'var(--color-accent)', fontSize: '9px' }}
                >
                  {dmUnread > 9 ? '9+' : dmUnread}
                </span>
              )}
            </Link>
          )}

          {/* User avatar */}
          {user ? (
            <Link to={`/u/${user.username}`} className="flex items-center gap-2 pl-1">
              <div className="relative">
                <div
                  className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))', color: 'white' }}
                >
                  {user.avatar
                    ? <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                    : user.username[0].toUpperCase()}
                </div>
                {/* Online indicator */}
                <span
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                  style={{ backgroundColor: '#34D399', borderColor: 'var(--color-secondary)' }}
                />
              </div>
            </Link>
          ) : (
            <Link
              to="/login"
              className="px-4 py-1.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* ── Mobile top bar ─────────────────────────────────────── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 border-b"
        style={{ backgroundColor: 'var(--color-secondary)', borderColor: 'var(--color-border)' }}
      >
        <Link to="/" className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-white text-xs"
            style={{ background: 'var(--color-accent)' }}
          >
            S
          </div>
          <span className="font-bold text-white text-base">ShipHub</span>
        </Link>
        <div className="flex items-center gap-3">
          {user && (
            <Link to="/notifications" className="relative p-1">
              <Bell size={20} className="text-slate-400" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white badge-pulse"
                  style={{ backgroundColor: 'var(--color-accent)', fontSize: '9px' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen(p => !p)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 pt-14"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="drawer-slide-down absolute top-14 left-0 right-0 border-b shadow-2xl p-4 max-h-[80vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--color-secondary)', borderColor: 'var(--color-border)' }}
            onClick={e => e.stopPropagation()}
          >
            {navItemsFlat.map(({ to, icon: Icon, label, badge }) => (
              <Link
                key={to} to={to}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center justify-between px-3 py-3 rounded-lg mb-0.5 text-sm font-medium transition-all',
                  isActive(to) ? 'nav-active' : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
              >
                <div className="flex items-center gap-3"><Icon size={18} />{label}</div>
                {badge !== undefined && badge !== '' && (
                  <span
                    className={cn('text-xs font-semibold px-1.5 py-0.5 rounded-full',
                      badge === 'Live' ? 'text-emerald-300' : 'text-white'
                    )}
                    style={badge === 'Live'
                      ? { backgroundColor: 'rgba(52,211,153,0.15)' }
                      : { backgroundColor: 'rgba(255,138,0,0.85)' }}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            ))}
            {!user && (
              <div className="pt-3 mt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center w-full py-3 rounded-xl text-sm font-semibold text-white"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  Sign in
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main content area ───────────────────────────────────── */}
      <div className="flex flex-1 md:ml-[280px] xl:mr-[340px]">
        <main className="flex-1 min-w-0 pt-14 pb-20 md:pb-0 animate-in">
          {children}
        </main>
      </div>

      {/* ── Right Sidebar (fixed 340px, xl+) ──────────────────── */}
      <aside
        className="fixed right-0 top-14 h-[calc(100svh-56px)] w-[340px] border-l hidden xl:flex flex-col overflow-y-auto z-30"
        style={{ backgroundColor: 'var(--color-secondary)', borderColor: 'var(--color-border)' }}
      >
        <RightSidebar />
      </aside>

      {/* ── Mobile bottom nav ────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t"
        style={{ backgroundColor: 'var(--color-secondary)', borderColor: 'var(--color-border)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {[
          { to: '/', icon: Home },
          { to: '/explore', icon: Compass },
          { to: '/chat', icon: MessageSquare },
          { to: '/messages', icon: Mail },
          { to: user ? `/u/${user.username}` : '/login', icon: null as any },
        ].map(({ to, icon: Icon }) => (
          <Link
            key={to} to={to}
            className={cn('flex items-center justify-center w-14 h-14 transition-all',
              isActive(to) ? '' : 'text-slate-500 hover:text-slate-300'
            )}
            style={isActive(to) ? { color: 'var(--color-accent)' } : {}}
          >
            {Icon ? <Icon size={22} /> : (
              <div
                className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--color-accent)', color: 'white' }}
              >
                {user
                  ? (user.avatar
                    ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    : user.username[0].toUpperCase())
                  : '?'}
              </div>
            )}
          </Link>
        ))}
      </nav>

      {/* ── Mobile create button ─────────────────────────────────── */}
      <Link
        to="/publish"
        className="md:hidden fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg btn-primary"
        style={{ backgroundColor: 'var(--color-accent)' }}
      >
        <Plus size={22} className="text-white" />
      </Link>

      <QuoteModal />
      {user && !user.emailVerified && <VerifyBanner />}
    </div>
  );
}

// ── Right Sidebar ─────────────────────────────────────────────────────────────

function RightSidebar() {
  const trendingQ = useQuery({
    queryKey: ['trending-builders'],
    queryFn: () => usersApi.trending().then(r => r.data.builders),
    staleTime: 60_000,
  });

  const projectsQ = useQuery({
    queryKey: ['trending-projects-sidebar'],
    queryFn: () => feedApi.get('projects', 5, 0).then(r => r.data.items),
    staleTime: 60_000,
  });

  const eventsQ = useQuery({
    queryKey: ['upcoming-events-sidebar'],
    queryFn: () => eventsApi.list(4).then(r => r.data.events),
    staleTime: 60_000,
  });

  const onlineQ = useQuery({
    queryKey: ['online-now'],
    queryFn: () => presenceApi.online().then(r => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // "Today on ShipHub" stats from recent feed
  const statsQ = useQuery({
    queryKey: ['today-stats'],
    queryFn: () => feedApi.get('all', 20, 0).then(r => {
      const items = r.data.items as any[];
      return {
        builds:   items.filter(i => i.post?.type === 'build_update').length,
        memories: items.filter(i => i.type === 'memory').length,
        code:     items.filter(i => i.post?.type === 'code_snippet').length,
        collabs:  items.filter(i => i.post?.type === 'collab_request').length,
      };
    }),
    staleTime: 5 * 60_000,
  });

  // Community activity (recent 6 feed items)
  const activityQ = useQuery({
    queryKey: ['community-activity'],
    queryFn: () => feedApi.get('all', 6, 0).then(r => r.data.items),
    staleTime: 30_000,
  });

  const navigate = useNavigate();

  const getActivityLine = (item: any) => {
    const name = item.author?.displayName || item.author?.username || 'Someone';
    if (item.type === 'memory') return `${name} added a memory`;
    if (item.type === 'project') return `${name} shared a project`;
    if (item.post?.type === 'build_update') return `${name} shipped a build update`;
    if (item.post?.type === 'code_snippet') return `${name} shared a code snippet`;
    if (item.post?.type === 'collab_request') return `${name} is looking for collaborators`;
    if (item.post?.type === 'poll') return `${name} posted a poll`;
    if (item.post?.type === 'question') return `${name} asked a question`;
    return `${name} posted an update`;
  };

  return (
    <div className="flex-1 p-4 space-y-5">

      {/* ── Trending Projects ──────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
            <Star size={13} style={{ color: 'var(--color-accent)' }} />
            Trending Projects
          </h3>
          <Link to="/projects" className="text-xs font-medium transition-colors hover:opacity-80" style={{ color: 'var(--color-accent)' }}>
            View all
          </Link>
        </div>
        <div className="space-y-1.5">
          {(projectsQ.data ?? []).slice(0, 5).map((item: any, i: number) => {
            const proj = item.project ?? item;
            if (!proj?.name) return null;
            return (
              <Link
                key={proj.id ?? i}
                to={`/projects/${proj.id}`}
                className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-white/5 transition-all group"
              >
                <span className="text-xs font-bold w-4 text-center flex-shrink-0" style={{ color: 'var(--color-muted)' }}>
                  {i + 1}
                </span>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))', color: 'white' }}
                >
                  {proj.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">
                    {proj.name}
                  </div>
                  <div className="text-xs text-slate-600">
                    {(proj.followerCount ?? 0).toLocaleString()} followers
                  </div>
                </div>
                <TrendingUp size={12} style={{ color: 'var(--color-accent)' }} className="flex-shrink-0" />
              </Link>
            );
          })}
          {!projectsQ.data && (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--color-card)' }} />
            ))
          )}
        </div>
      </section>

      {/* ── Today on ShipHub ───────────────────────────── */}
      <section>
        <h3 className="font-semibold text-white text-sm flex items-center gap-1.5 mb-3">
          <Activity size={13} style={{ color: 'var(--color-cyan)' }} />
          Today on ShipHub
        </h3>
        <div
          className="rounded-xl p-3 border grid grid-cols-2 gap-2"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          {[
            { label: 'Build Updates', value: statsQ.data?.builds ?? '—', icon: '⚡', color: '#FF8A00' },
            { label: 'Memories',      value: statsQ.data?.memories ?? '—', icon: '🧠', color: '#A855F7' },
            { label: 'Code Snippets', value: statsQ.data?.code ?? '—',    icon: '</>', color: '#00E5FF' },
            { label: 'Collaborations',value: statsQ.data?.collabs ?? '—', icon: '👥', color: '#FFA62B' },
          ].map(({ label, value, icon, color }) => (
            <div
              key={label}
              className="flex flex-col gap-1 p-2 rounded-lg"
              style={{ backgroundColor: 'var(--color-elevated)' }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{icon}</span>
                <span className="text-lg font-bold" style={{ color }}>{value}</span>
              </div>
              <span className="text-[10px] text-slate-500 leading-tight">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Top Builders ──────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white text-sm">Top Builders</h3>
          <Link to="/builders" className="text-xs font-medium transition-colors hover:opacity-80" style={{ color: 'var(--color-accent)' }}>
            View all
          </Link>
        </div>
        <div className="space-y-1.5">
          {(trendingQ.data ?? []).slice(0, 5).map((builder, i) => (
            <TrendingBuilderRow key={builder.id} builder={builder} rank={i + 1} />
          ))}
          {!trendingQ.data && (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--color-card)' }} />
            ))
          )}
        </div>
      </section>

      {/* ── Community Activity ─────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ backgroundColor: '#34D399', boxShadow: '0 0 6px rgba(52,211,153,0.8)', animation: 'liveGlow 1.8s ease-in-out infinite' }}
            />
            Community Activity
          </h3>
          {onlineQ.data && (
            <span className="text-xs text-emerald-400">{onlineQ.data.count ?? 0} online</span>
          )}
        </div>
        <div className="space-y-1">
          {(activityQ.data ?? []).slice(0, 5).map((item: any, i: number) => {
            const postId = item.post?.id ?? item.memory?.id ?? item.project?.id;
            const authorLink = `/u/${item.author?.username ?? ''}`;
            const timeStr = timeAgo(item.post?.createdAt ?? item.memory?.createdAt ?? item.project?.createdAt ?? new Date().toISOString());
            return (
              <div key={postId ?? i} className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/5 transition-all">
                <Link to={authorLink} className="flex-shrink-0">
                  <div
                    className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold"
                    style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))', color: 'white' }}
                  >
                    {item.author?.avatar
                      ? <img src={item.author.avatar} alt="" className="w-full h-full object-cover" />
                      : item.author?.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 leading-snug truncate">{getActivityLine(item)}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{timeStr}</p>
                </div>
              </div>
            );
          })}
          {!activityQ.data && (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--color-card)' }} />
            ))
          )}
        </div>
        {onlineQ.data && onlineQ.data.online?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {onlineQ.data.online.slice(0, 6).map((u: OnlineUser) => (
              <Link key={u.id} to={`/u/${u.username}`} title={`${u.username} (online)`}>
                <div
                  className="relative w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  {u.avatar
                    ? <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
                    : u.username[0].toUpperCase()}
                  <span
                    className="absolute bottom-0 right-0 w-2 h-2 rounded-full border"
                    style={{ backgroundColor: '#34D399', borderColor: 'var(--color-secondary)' }}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Upcoming Events ────────────────────────────── */}
      {eventsQ.data && eventsQ.data.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white text-sm">Upcoming Events</h3>
            <Link to="/events" className="text-xs font-medium transition-colors hover:opacity-80" style={{ color: 'var(--color-accent)' }}>
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {eventsQ.data.slice(0, 3).map(({ event }: any) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-all group"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(0,229,255,0.1)', color: 'var(--color-cyan)' }}
                >
                  <CalendarDays size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">
                    {event.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {new Date(event.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' · '}
                    <span className="text-slate-400">+{event.rsvpCount}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Knowledge Graph ─────────────────────────────── */}
      <section>
        <h3 className="font-semibold text-white text-sm mb-1.5">Knowledge Graph</h3>
        <p className="text-xs text-slate-500 mb-3 leading-relaxed">
          Explore how builders, memories, and projects connect across the community.
        </p>
        <Link
          to="/graph"
          className="block rounded-xl border overflow-hidden transition-all hover:border-violet-500/30 group"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          {/* Mini node visualization */}
          <div
            className="relative h-24 overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.12) 0%, transparent 70%)' }}
          >
            {[
              { x: '20%', y: '30%', size: 10, color: 'rgba(168,85,247,0.8)' },
              { x: '50%', y: '55%', size: 14, color: 'rgba(168,85,247,1)', glow: true },
              { x: '75%', y: '25%', size: 8,  color: 'rgba(0,229,255,0.7)' },
              { x: '35%', y: '72%', size: 7,  color: 'rgba(255,138,0,0.7)' },
              { x: '80%', y: '65%', size: 9,  color: 'rgba(52,211,153,0.7)' },
            ].map((n, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: n.x, top: n.y,
                  width: n.size, height: n.size,
                  backgroundColor: n.color,
                  boxShadow: n.glow ? '0 0 12px rgba(168,85,247,0.8), 0 0 24px rgba(168,85,247,0.4)' : undefined,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}
            <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.3 }}>
              <line x1="20%" y1="30%" x2="50%" y2="55%" stroke="rgba(168,85,247,0.6)" strokeWidth="1" />
              <line x1="75%" y1="25%" x2="50%" y2="55%" stroke="rgba(0,229,255,0.5)" strokeWidth="1" />
              <line x1="35%" y1="72%" x2="50%" y2="55%" stroke="rgba(255,138,0,0.5)" strokeWidth="1" />
              <line x1="80%" y1="65%" x2="50%" y2="55%" stroke="rgba(52,211,153,0.5)" strokeWidth="1" />
            </svg>
          </div>
          <div className="px-3 py-2.5 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-xs font-semibold text-slate-400 group-hover:text-white transition-colors">
              Explore Graph →
            </span>
            <Network size={13} className="text-slate-600 group-hover:text-violet-400 transition-colors" />
          </div>
        </Link>
      </section>

    </div>
  );
}

// ── Trending builder row ───────────────────────────────────────────────────────

function TrendingBuilderRow({ builder, rank }: { builder: TrendingBuilder; rank: number }) {
  const xp = calcXp(
    (builder as any).memoryCount ?? 0,
    builder.followerCount,
    (builder as any).postCount ?? 0
  );

  return (
    <Link
      to={`/u/${builder.username}`}
      className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-all group"
    >
      <span className="text-xs font-bold w-4 text-center flex-shrink-0" style={{ color: 'var(--color-muted)' }}>
        {rank}
      </span>
      <div
        className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))', color: 'white' }}
      >
        {builder.avatar
          ? <img src={builder.avatar} alt={builder.username} className="w-full h-full object-cover" />
          : builder.username[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">
          {builder.displayName || builder.username}
        </div>
        <div className="text-xs text-slate-600">
          {xp.toLocaleString()} XP
        </div>
      </div>
      <span
        className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
        style={{ backgroundColor: 'rgba(255,138,0,0.1)', color: 'var(--color-accent)' }}
      >
        Lvl {calcLevel(xp)}
      </span>
    </Link>
  );
}

// ── Verify banner ─────────────────────────────────────────────────────────────

function VerifyBanner() {
  const { user } = useAuthStore();
  const [dismissed, setDismissed] = useState(false);
  const resendMut = useMutation({ mutationFn: () => authApi.resendVerification() });
  if (dismissed || !user) return null;
  return (
    <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 md:px-0">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'rgba(255,138,0,0.3)' }}
      >
        <Mail size={15} style={{ color: 'var(--color-accent)' }} className="flex-shrink-0" />
        <p className="text-sm text-slate-300 flex-1">
          Verify your email to unlock full access.{' '}
          {resendMut.isSuccess
            ? <span style={{ color: 'var(--color-success)' }}>Email sent!</span>
            : <button
                onClick={() => resendMut.mutate()}
                disabled={resendMut.isPending}
                className="underline underline-offset-2 transition-colors"
                style={{ color: 'var(--color-accent)' }}
              >
                {resendMut.isPending ? 'Sending...' : 'Resend email'}
              </button>
          }
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-600 hover:text-white transition-colors flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
