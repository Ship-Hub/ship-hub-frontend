import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const APP_URL = import.meta.env.VITE_APP_URL ?? 'https://community.memobank.online';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import { usersApi, memoriesApi, projectsApi, authApi, uploadApi, packsApi, type User } from '../lib/api';
import { Link as RouterLink } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { MemoryCard } from '../components/MemoryCard';
import { useAuthStore } from '../store/auth';
import { timeAgo, STATUS_COLORS } from '../lib/utils';
import { Loader2, Globe, GitBranch, Pencil, X, FolderKanban, Users, BookOpen, Camera, Package, MessageSquare, Pin, PinOff } from 'lucide-react';

const STATUS_COLOR_MAP: Record<string, string> = {
  building: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  launched: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  archived: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};

function EditProfileModal({ profile, onClose }: { profile: User; onClose: () => void }) {
  const { setAuth } = useAuthStore();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(profile.avatar ?? '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState({
    displayName: profile.displayName ?? '',
    bio: profile.bio ?? '',
    website: profile.website ?? '',
    githubUsername: profile.githubUsername ?? '',
    avatar: profile.avatar ?? '',
  });

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Avatar must be under 2MB'); return; }
    setUploadingAvatar(true);
    try {
      const res = await uploadApi.upload(file);
      const url = res.data.url;
      setAvatarPreview(url);
      setForm(f => ({ ...f, avatar: url }));
    } catch {
      alert('Upload failed. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveMut = useMutation({
    mutationFn: () => usersApi.update(form),
    onSuccess: async () => {
      const meRes = await authApi.me();
      setAuth(meRes.data.user, localStorage.getItem('shiphub_token')!);
      qc.invalidateQueries({ queryKey: ['profile', profile.username] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl border p-6" style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="mono font-semibold text-white text-sm">EDIT_PROFILE</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
        </div>
        <div className="space-y-4">

          {/* Avatar upload */}
          <div className="flex items-center gap-4 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center mono font-bold text-2xl"
                   style={{ background: 'linear-gradient(135deg, #7C3AED, #00E5FF)', color: 'white' }}>
                {avatarPreview
                  ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                  : profile.username[0].toUpperCase()
                }
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #00E5FF)' }}
              >
                {uploadingAvatar ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
            </div>
            <div>
              <p className="text-xs mono text-slate-300 font-medium">AVATAR</p>
              <p className="text-xs text-slate-500 mt-0.5">PNG, JPG up to 2MB</p>
              {avatarPreview && (
                <button onClick={() => { setAvatarPreview(''); setForm(f => ({ ...f, avatar: '' })); }}
                  className="text-xs mono text-slate-500 hover:text-red-400 transition-colors mt-1">
                  remove
                </button>
              )}
            </div>
          </div>

          {[
            { key: 'displayName', label: 'DISPLAY_NAME', placeholder: 'Your name' },
            { key: 'bio', label: 'BIO', placeholder: 'Tell builders who you are', textarea: true },
            { key: 'website', label: 'WEBSITE', placeholder: 'https://yoursite.com' },
            { key: 'githubUsername', label: 'GITHUB', placeholder: 'username' },
          ].map(({ key, label, placeholder, textarea }) => (
            <div key={key}>
              <label className="block text-xs mono text-slate-400 mb-1.5">{label}</label>
              {textarea ? (
                <textarea value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} rows={3} className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-violet-500 transition-colors resize-none" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }} placeholder={placeholder} />
              ) : (
                <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-violet-500 transition-colors" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }} placeholder={placeholder} />
              )}
            </div>
          ))}
          <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || uploadingAvatar} className="w-full py-2.5 rounded-lg text-xs mono font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)' }}>
            {saveMut.isPending ? 'SAVING...' : 'SAVE_PROFILE'}
          </button>
        </div>
      </div>
    </div>
  );
}

type ProfileTab = 'memories' | 'projects' | 'packs' | 'followers' | 'following';

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<ProfileTab>('memories');
  const [showEdit, setShowEdit] = useState(false);

  const profileQ = useQuery({ queryKey: ['profile', username], queryFn: () => usersApi.profile(username!).then(r => r.data.user) });
  const memoriesQ = useQuery({ queryKey: ['user-memories', username], queryFn: () => memoriesApi.byUser(username!).then(r => r.data.memories), enabled: tab === 'memories' });
  const projectsQ = useQuery({ queryKey: ['user-projects', username], queryFn: () => projectsApi.byUser(username!).then(r => r.data.projects), enabled: tab === 'projects' });
  const packsQ = useQuery({ queryKey: ['user-packs', username], queryFn: () => packsApi.byUser(username!).then(r => r.data.packs), enabled: tab === 'packs' });
  const followersQ = useQuery({ queryKey: ['followers', username], queryFn: () => usersApi.profile(username!).then(() => fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/v1'}/users/${username}/followers`, { headers: { Authorization: `Bearer ${localStorage.getItem('shiphub_token')}` } }).then(r => r.json())), enabled: tab === 'followers' });
  const followingQ = useQuery({ queryKey: ['following', username], queryFn: () => fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/v1'}/users/${username}/following`, { headers: { Authorization: `Bearer ${localStorage.getItem('shiphub_token')}` } }).then(r => r.json()), enabled: tab === 'following' });
  const followStatusQ = useQuery({ queryKey: ['follow-status', username], queryFn: () => usersApi.followStatus(username!).then(r => r.data.following), enabled: !!user && user.username !== username });

  const followMut = useMutation({
    mutationFn: () => usersApi.follow(username!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profile', username] }); qc.invalidateQueries({ queryKey: ['follow-status', username] }); },
  });

  const pinMut = useMutation({
    mutationFn: (memoryId: string) => usersApi.pin(memoryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', username] });
      qc.invalidateQueries({ queryKey: ['user-memories', username] });
    },
  });

  if (profileQ.isLoading) return <Layout><div className="flex items-center justify-center h-64"><Loader2 size={20} className="animate-spin text-violet-400" /></div></Layout>;

  const profile = profileQ.data;
  if (!profile) return null;
  const isOwn = user?.username === username;
  const isFollowing = followStatusQ.data;

  const tabs: { key: ProfileTab; label: string }[] = [
    { key: 'memories',  label: 'MEMORIES' },
    { key: 'projects',  label: 'PROJECTS' },
    { key: 'packs',     label: 'PACKS' },
    { key: 'followers', label: `FOLLOWERS (${profile.followerCount})` },
    { key: 'following', label: `FOLLOWING (${profile.followingCount})` },
  ];

  const ogTitle = `${profile.displayName ?? profile.username} (@${profile.username}) — ShipHub`;
  const ogDesc = profile.bio ?? `${profile.memoryCount} memories · ${profile.followerCount} followers on ShipHub`;

  return (
    <Layout>
      <Helmet>
        <title>{ogTitle}</title>
        <meta name="description" content={ogDesc} />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDesc} />
        <meta property="og:url" content={`${APP_URL}/u/${profile.username}`} />
        {profile.avatar && <meta property="og:image" content={profile.avatar} />}
        <meta name="twitter:card" content="summary" />
      </Helmet>
      {showEdit && <EditProfileModal profile={profile} onClose={() => setShowEdit(false)} />}
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header card */}
        <div className="rounded-2xl border p-6 mb-6" style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-2xl mono font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #00E5FF 100%)', color: 'white' }}>
                {profile.avatar
                  ? <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
                  : profile.username[0].toUpperCase()
                }
              </div>
              <div>
                <h1 className="mono text-lg font-bold text-white">{profile.displayName ?? profile.username}</h1>
                <p className="text-slate-400 text-xs mono">@{profile.username}</p>
                {profile.memoBankUsername && (
                  <span className="text-xs mono text-cyan-500 flex items-center gap-1 mt-0.5">⬡ MB: @{profile.memoBankUsername}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOwn && (
                <button onClick={() => setShowEdit(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs mono text-slate-400 hover:text-white border transition-all" style={{ borderColor: 'var(--color-border)' }}>
                  <Pencil size={12} /> EDIT
                </button>
              )}
              <Link to={`/u/${username}/showcase`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs mono text-slate-400 hover:text-violet-400 border transition-all" style={{ borderColor: 'var(--color-border)' }}>
                <BookOpen size={12} /> SHOWCASE
              </Link>
              {!isOwn && user && (
                <div className="flex items-center gap-2">
                  <button onClick={() => followMut.mutate()} disabled={followMut.isPending} className="px-4 py-2 rounded-lg text-xs mono font-semibold transition-all" style={isFollowing ? { backgroundColor: 'var(--color-elevated)', color: '#94a3b8', border: '1px solid var(--color-border)' } : { background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 45%, #22D3EE 100%)', color: 'white' }}>
                    {followMut.isPending ? '...' : isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                  </button>
                  <RouterLink to={`/messages/${profile.username}`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs mono text-slate-400 hover:text-white border transition-all" style={{ borderColor: 'var(--color-border)' }}>
                    <MessageSquare size={12} /> DM
                  </RouterLink>
                </div>
              )}
            </div>
          </div>

          {profile.bio && <p className="text-slate-300 text-sm mb-3">{profile.bio}</p>}

          <div className="flex flex-wrap gap-4">
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs mono text-violet-400 hover:text-violet-300">
                <Globe size={11} />{profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            {profile.githubUsername && (
              <a href={`https://github.com/${profile.githubUsername}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs mono text-slate-400 hover:text-white">
                <GitBranch size={11} />{profile.githubUsername}
              </a>
            )}
          </div>
        </div>

        {/* Pinned memories */}
        {(profile.pinnedMemoryIds?.length ?? 0) > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Pin size={12} className="text-violet-400" />
              <span className="mono text-xs font-semibold text-slate-400">PINNED</span>
            </div>
            <div className="space-y-2">
              {(memoriesQ.data ?? [])
                .filter((m: any) => profile.pinnedMemoryIds?.includes(m.id))
                .map((memory: any) => (
                  <div key={memory.id} className="relative group/pin">
                    <MemoryCard memory={memory} author={profile} />
                    {isOwn && (
                      <button
                        onClick={() => pinMut.mutate(memory.id)}
                        className="absolute top-3 right-3 opacity-0 group-hover/pin:opacity-100 flex items-center gap-1 text-xs mono text-slate-500 hover:text-red-400 transition-all px-2 py-1 rounded"
                        style={{ backgroundColor: 'var(--color-elevated)' }}
                      >
                        <PinOff size={11} /> UNPIN
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2.5 text-xs mono font-medium transition-all border-b-2 -mb-px ${tab === t.key ? 'text-white border-violet-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'memories' && (
          <div className="space-y-4">
            {memoriesQ.isLoading && <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-violet-400" /></div>}
            {memoriesQ.data?.map((memory: any) => {
              const isPinned = profile.pinnedMemoryIds?.includes(memory.id);
              return (
                <div key={memory.id} className="relative group/mem">
                  <MemoryCard memory={memory} author={profile} />
                  {isOwn && (
                    <button
                      onClick={() => pinMut.mutate(memory.id)}
                      disabled={!isPinned && (profile.pinnedMemoryIds?.length ?? 0) >= 3}
                      className={`absolute top-3 right-3 opacity-0 group-hover/mem:opacity-100 flex items-center gap-1 text-xs mono transition-all px-2 py-1 rounded disabled:opacity-30 ${isPinned ? 'text-violet-400 hover:text-red-400' : 'text-slate-500 hover:text-violet-400'}`}
                      style={{ backgroundColor: 'var(--color-elevated)' }}
                      title={isPinned ? 'Unpin' : (profile.pinnedMemoryIds?.length ?? 0) >= 3 ? 'Max 3 pinned' : 'Pin to profile'}
                    >
                      {isPinned ? <PinOff size={11} /> : <Pin size={11} />}
                      {isPinned ? 'UNPIN' : 'PIN'}
                    </button>
                  )}
                </div>
              );
            })}
            {!memoriesQ.isLoading && memoriesQ.data?.length === 0 && <p className="text-center text-slate-500 mono text-xs py-8">NO_MEMORIES_YET</p>}
          </div>
        )}

        {tab === 'packs' && (
          <div className="space-y-3">
            {packsQ.isLoading && <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-violet-400" /></div>}
            {packsQ.data?.map((pack: any) => (
              <Link key={pack.id} to={`/packs/${pack.id}`}>
                <div className="flex items-center gap-3 p-4 rounded-xl border hover:border-violet-500/30 transition-all" style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
                  <Package size={16} className="text-violet-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="mono text-sm font-semibold text-white">{pack.title}</div>
                    {pack.description && <div className="text-xs text-slate-500 line-clamp-1">{pack.description}</div>}
                  </div>
                  <span className="text-xs mono text-slate-500">{pack.memoryCount} memories</span>
                </div>
              </Link>
            ))}
            {!packsQ.isLoading && packsQ.data?.length === 0 && <p className="text-center text-slate-500 mono text-xs py-8">NO_PACKS_YET</p>}
          </div>
        )}

        {tab === 'projects' && (
          <div className="space-y-4">
            {projectsQ.isLoading && <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-violet-400" /></div>}
            {projectsQ.data?.map((project: any) => (
              <Link key={project.id} to={`/projects/${project.id}`}>
                <div className="rounded-xl border p-4 hover:border-violet-500/30 transition-all" style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FolderKanban size={16} className="text-violet-400 flex-shrink-0" />
                      <div>
                        <div className="mono text-sm font-semibold text-white">{project.name}</div>
                        {project.description && <div className="text-xs text-slate-500 line-clamp-1">{project.description}</div>}
                      </div>
                    </div>
                    <span className={`text-xs mono px-2 py-0.5 rounded border ${STATUS_COLOR_MAP[project.status]}`}>{project.status.toUpperCase()}</span>
                  </div>
                </div>
              </Link>
            ))}
            {!projectsQ.isLoading && projectsQ.data?.length === 0 && <p className="text-center text-slate-500 mono text-xs py-8">NO_PROJECTS_YET</p>}
          </div>
        )}

        {(tab === 'followers' || tab === 'following') && (
          <div className="space-y-3">
            {(tab === 'followers' ? followersQ : followingQ).isLoading && <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-violet-400" /></div>}
            {((tab === 'followers' ? followersQ.data?.users : followingQ.data?.users) ?? []).map((u: any) => (
              <Link key={u.id} to={`/u/${u.username}`}>
                <div className="flex items-center gap-3 p-3 rounded-xl border hover:border-violet-500/30 transition-all" style={{ backgroundColor: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
                  <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center mono font-bold text-sm" style={{ background: 'linear-gradient(135deg, #7C3AED, #00E5FF)', color: 'white' }}>
                    {u.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mono text-sm font-semibold text-white">{u.displayName ?? u.username}</div>
                    <div className="text-xs mono text-slate-500">@{u.username}</div>
                  </div>
                  <div className="text-xs mono text-slate-600">{u.followerCount} followers</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
