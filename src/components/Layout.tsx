import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Home, BookMarked, Plus, LogOut, FolderKanban, CalendarDays, Network, Bell, Search, LayoutGrid, Trophy, Package, Menu, X, Mail, MessageSquare } from 'lucide-react';
import logo from '../assets/logo.png';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { authApi, dmApi } from '../lib/api';
import { QuoteModal } from './QuoteModal';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/v1';

const navItems = [
  { to: '/',            icon: Home,         label: 'FEED',           group: 'main' },
  { to: '/browse',      icon: LayoutGrid,   label: 'BROWSE',         group: 'main' },
  { to: '/leaderboard', icon: Trophy,        label: 'LEADERBOARD',    group: 'main' },
  { to: '/packs',       icon: Package,      label: 'PACKS',          group: 'main' },
  { to: '/projects',    icon: FolderKanban, label: 'PROJECTS',       group: 'main' },
  { to: '/events',      icon: CalendarDays, label: 'EVENTS',         group: 'main' },
  { to: '/graph',       icon: Network,      label: 'KNOWLEDGE_GRAPH', group: 'main' },
  { to: '/saved',       icon: BookMarked,   label: 'SAVED',          group: 'main' },
  { to: '/messages',    icon: MessageSquare, label: 'MESSAGES',       group: 'social', authOnly: true },
] as const;

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, clearAuth } = useAuthStore();
  const [searchVal, setSearchVal] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dmUnreadQ = useQuery({
    queryKey: ['dm-unread'],
    queryFn: () => dmApi.unreadCount().then(r => r.data.count),
    enabled: !!user,
    refetchInterval: 10_000,
    staleTime: 8_000,
  });
  const dmUnread = dmUnreadQ.data ?? 0;
  const esRef = useRef<EventSource | null>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('shiphub_token');
    if (!token) return;

    const url = `${BASE_URL}/notifications/stream`;
    const es = new EventSource(`${url}?token=${token}`);
    esRef.current = es;

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'count') {
        setUnreadCount(data.count);
      } else if (data.type === 'notification') {
        setUnreadCount(c => c + 1);
        qc.invalidateQueries({ queryKey: ['notifications'] });
        // A DM sends a notification — refresh the DM unread count too
        qc.invalidateQueries({ queryKey: ['dm-unread'] });
      }
    };
    es.onerror = () => { es.close(); };

    return () => { es.close(); esRef.current = null; };
  }, [user?.id]);

  const handleLogout = () => { clearAuth(); navigate('/login'); };

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname === to || location.pathname.startsWith(to + '/');

  const NavLinks = ({ onClick }: { onClick?: () => void }) => {
    const mainItems = navItems.filter(i => i.group === 'main' && (!('authOnly' in i && i.authOnly) || user));
    const socialItems = navItems.filter(i => i.group === 'social' && (!('authOnly' in i && i.authOnly) || user));

    return (
      <>
        {/* Main nav group */}
        <div className="space-y-0.5">
          {mainItems.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} onClick={onClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-xs mono font-medium transition-all',
                isActive(to) ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
              style={isActive(to) ? { backgroundColor: 'var(--color-elevated)', color: 'var(--color-violet)' } : {}}
            >
              <Icon size={15} />{label}
            </Link>
          ))}
        </div>

        {/* Social group — notifications + messages */}
        {user && (
          <div className="mt-3 pt-3 border-t space-y-0.5" style={{ borderColor: 'var(--color-border)' }}>
            <p className="px-3 pb-1 text-[10px] mono text-slate-600 tracking-wider">SOCIAL</p>

            <Link to="/notifications" onClick={onClick}
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg text-xs mono font-medium transition-all',
                isActive('/notifications') ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
              style={isActive('/notifications') ? { backgroundColor: 'var(--color-elevated)', color: 'var(--color-violet)' } : {}}
            >
              <div className="flex items-center gap-3"><Bell size={15} />NOTIFICATIONS</div>
              {unreadCount > 0 && (
                <span className="badge-pulse text-xs mono font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--color-violet)', color: 'white', fontSize: '10px' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            {socialItems.map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to} onClick={onClick}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-lg text-xs mono font-medium transition-all',
                  isActive(to) ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                )}
                style={isActive(to) ? { backgroundColor: 'var(--color-elevated)', color: 'var(--color-violet)' } : {}}
              >
                <div className="flex items-center gap-3"><Icon size={15} />{label}</div>
                {to === '/messages' && dmUnread > 0 && (
                  <span className="text-xs mono font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-cyan)', color: '#04050A', fontSize: '10px' }}>
                    {dmUnread > 99 ? '99+' : dmUnread}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-base)' }}>
      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 flex-col border-r fixed h-full hidden md:flex"
        style={{ backgroundColor: 'var(--color-secondary)', borderColor: 'var(--color-border)' }}>

        {/* Logo */}
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="ShipHub" className="w-10 h-10 object-contain flex-shrink-0" />
            <span className="mono font-bold text-sm tracking-wider text-white">SHIP_HUB</span>
          </Link>
        </div>

        {/* Search */}
        <div className="px-3 pt-3 pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <form onSubmit={e => { e.preventDefault(); if (searchVal.trim()) navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`); }}>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                placeholder="Search..."
                className="w-full pl-7 pr-3 py-2 rounded-lg text-xs text-slate-300 bg-transparent border outline-none transition-colors"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
              />
            </div>
          </form>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <NavLinks />
        </nav>

        {/* Publish / New Project */}
        <div className="p-3 border-t space-y-1.5" style={{ borderColor: 'var(--color-border)' }}>
          <Link
            to="/publish"
            className="btn-primary flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs mono font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}
          >
            <Plus size={14} />PUBLISH_MEMORY
          </Link>
          {user && (
            <Link
              to="/projects/new"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs mono font-medium transition-all hover:bg-white/5"
              style={{ color: 'var(--color-cyan)', border: '1px solid rgba(0,229,255,0.2)' }}
            >
              <FolderKanban size={14} />NEW_PROJECT
            </Link>
          )}
        </div>

        {/* User */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          {user ? (
            <>
              <Link to={`/u/${user.username}`} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 transition-all">
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs mono font-bold flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-violet)', color: 'white' }}>
                  {user.avatar
                    ? <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                    : user.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs mono text-white truncate">@{user.username}</div>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 w-full rounded text-xs mono text-slate-500 hover:text-red-400 transition-all mt-1"
              >
                <LogOut size={12} />LOGOUT
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="btn-primary flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs mono font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}
            >
              SIGN_IN
            </Link>
          )}
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────────── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 border-b"
        style={{ backgroundColor: 'var(--color-secondary)', borderColor: 'var(--color-border)' }}
      >
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="ShipHub" className="w-9 h-9 object-contain" />
          <span className="mono font-bold text-sm text-white">SHIP_HUB</span>
        </Link>
        <div className="flex items-center gap-4">
          {user && (
            <Link to="/notifications" className="relative p-1">
              <Bell size={20} className="text-slate-400" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center mono font-bold text-white"
                  style={{ backgroundColor: 'var(--color-violet)', fontSize: '9px' }}
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
          style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="drawer-slide-down absolute top-14 left-0 right-0 border-b shadow-2xl p-4"
            style={{ backgroundColor: 'var(--color-secondary)', borderColor: 'var(--color-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <NavLinks onClick={() => setMobileMenuOpen(false)} />
            <div className="pt-3 mt-2 border-t space-y-2" style={{ borderColor: 'var(--color-border)' }}>
              <Link
                to="/publish"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-primary flex items-center justify-center gap-2 w-full py-3 rounded-xl text-xs mono font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}
              >
                <Plus size={14} />PUBLISH_MEMORY
              </Link>
              {user ? (
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="flex items-center justify-center gap-2 w-full py-2 text-xs mono text-slate-500 hover:text-red-400 transition-all"
                >
                  <LogOut size={12} />LOGOUT
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-primary flex items-center justify-center gap-2 w-full py-3 rounded-xl text-xs mono font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}
                >
                  SIGN_IN
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile bottom nav ────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t"
        style={{ backgroundColor: 'var(--color-secondary)', borderColor: 'var(--color-border)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {[
          { to: '/', icon: Home },
          { to: '/browse', icon: LayoutGrid },
          { to: '/leaderboard', icon: Trophy },
          { to: '/saved', icon: BookMarked },
          ...(user ? [{ to: `/u/${user.username}`, icon: null as any }] : [{ to: '/login', icon: null as any }]),
        ].map(({ to, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex flex-col items-center justify-center w-14 h-14 rounded-lg transition-all',
              isActive(to) ? 'text-violet-400' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            {Icon ? (
              <Icon size={22} />
            ) : (
              <div
                className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs mono font-bold"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#00E5FF)', color: 'white' }}
              >
                {user
                  ? (user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : user.username[0].toUpperCase())
                  : '?'}
              </div>
            )}
          </Link>
        ))}
      </nav>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="flex-1 md:ml-56 pt-14 md:pt-0 pb-14 md:pb-0 animate-in">
        {children}
      </main>

      <QuoteModal />

      {user && !user.emailVerified && <VerifyBanner />}
    </div>
  );
}

function VerifyBanner() {
  const { user } = useAuthStore();
  const [dismissed, setDismissed] = useState(false);

  const resendMut = useMutation({
    mutationFn: () => authApi.resendVerification(),
  });

  if (dismissed || !user) return null;

  return (
    <div className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 md:px-0">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl"
        style={{ backgroundColor: 'var(--color-panel)', borderColor: 'rgba(139,92,246,0.3)', boxShadow: '0 0 20px rgba(139,92,246,0.15)' }}
      >
        <Mail size={15} className="text-violet-400 flex-shrink-0" />
        <p className="text-xs mono text-slate-300 flex-1">
          Verify your email to unlock full access.{' '}
          {resendMut.isSuccess
            ? <span className="text-emerald-400">Email sent!</span>
            : (
              <button
                onClick={() => resendMut.mutate()}
                disabled={resendMut.isPending}
                className="text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2"
              >
                {resendMut.isPending ? 'Sending...' : 'Resend email'}
              </button>
            )
          }
        </p>
        <button onClick={() => setDismissed(true)} className="text-slate-600 hover:text-white transition-colors flex-shrink-0">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
