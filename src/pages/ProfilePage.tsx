import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import { usersApi, memoriesApi, projectsApi, authApi, uploadApi, packsApi, type User } from '../lib/api';
import { Link as RouterLink } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { MemoryCard } from '../components/MemoryCard';
import { useAuthStore } from '../store/auth';
import { timeAgo } from '../lib/utils';
import {
  Loader2, Globe, GitBranch, Pencil, X, FolderKanban, BookOpen,
  Camera, Package, MessageSquare, Pin, PinOff,
} from 'lucide-react';

const APP_URL = import.meta.env.VITE_APP_URL ?? 'https://community.memobank.online';

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-md rounded-xl border overflow-y-auto" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <h2 className="mono font-semibold text-white text-sm">EDIT_PROFILE</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center mono font-bold text-2xl"
                style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))', color: 'white' }}>
                {avatarPreview
                  ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                  : profile.username[0].toUpperCase()}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))' }}
              >
                {uploadingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
            </div>
            <div>
              <p className="text-xs mono text-slate-300 font-medium mb-0.5">AVATAR</p>
              <p className="text-xs text-slate-500">PNG, JPG up to 2MB</p>
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
                <textarea
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  rows={3}
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none resize-none transition-colors"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
                />
              ) : (
                <input
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none transition-colors"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
                />
              )}
            </div>
          ))}

          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || uploadingAvatar}
            className="btn-primary w-full py-3 rounded-xl text-xs mono font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: 'var(--color-accent)' }}
          >
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

  const profileQ = useQuery({
    queryKey: ['profile', username],
    queryFn: () => usersApi.profile(username!).then(r => r.data.user),
  });
  const memoriesQ = useQuery({
    queryKey: ['user-memories', username],
    queryFn: () => memoriesApi.byUser(username!).then(r => r.data.memories),
    enabled: tab === 'memories',
  });
  const projectsQ = useQuery({
    queryKey: ['user-projects', username],
    queryFn: () => projectsApi.byUser(username!).then(r => r.data.projects),
    enabled: tab === 'projects',
  });
  const packsQ = useQuery({
    queryKey: ['user-packs', username],
    queryFn: () => packsApi.byUser(username!).then(r => r.data.packs),
    enabled: tab === 'packs',
  });
  const followersQ = useQuery({
    queryKey: ['followers', username],
    queryFn: () => usersApi.followers(username!).then(r => r.data),
    enabled: tab === 'followers',
  });
  const followingQ = useQuery({
    queryKey: ['following', username],
    queryFn: () => usersApi.following(username!).then(r => r.data),
    enabled: tab === 'following',
  });
  const followStatusQ = useQuery({
    queryKey: ['follow-status', username],
    queryFn: () => usersApi.followStatus(username!).then(r => r.data.following),
    enabled: !!user && user.username !== username,
  });

  const followMut = useMutation({
    mutationFn: () => usersApi.follow(username!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', username] });
      qc.invalidateQueries({ queryKey: ['follow-status', username] });
    },
  });

  const pinMut = useMutation({
    mutationFn: (memoryId: string) => usersApi.pin(memoryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', username] });
      qc.invalidateQueries({ queryKey: ['user-memories', username] });
    },
  });

  if (profileQ.isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 size={20} className="animate-spin text-slate-400" />
        </div>
      </Layout>
    );
  }

  const profile = profileQ.data;
  if (!profile) return null;
  const isOwn = user?.username === username;
  const isFollowing = followStatusQ.data;

  const tabs: { key: ProfileTab; label: string; count?: number }[] = [
    { key: 'memories',  label: 'MEMORIES',  count: profile.memoryCount },
    { key: 'projects',  label: 'PROJECTS' },
    { key: 'packs',     label: 'PACKS' },
    { key: 'followers', label: 'FOLLOWERS', count: profile.followerCount },
    { key: 'following', label: 'FOLLOWING', count: profile.followingCount },
  ];

  const ogTitle = `${profile.displayName ?? profile.username} (@${profile.username}) â€” ShipHub`;
  const ogDesc = profile.bio ?? `${profile.memoryCount} memories Â· ${profile.followerCount} followers on ShipHub`;

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

      {/* â”€â”€ Profile header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-secondary)' }}>
        <div className="max-w-2xl mx-auto px-5 py-8">
          {/* Avatar + actions row */}
          <div className="flex items-start justify-between gap-4 mb-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center mono font-bold text-3xl"
                style={{
                  background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))',
                  color: 'white',
                  boxShadow: '0 0 0 3px var(--color-secondary), 0 0 0 5px rgba(139,92,246,0.4)',
                }}
              >
                {profile.avatar
                  ? <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
                  : profile.username[0].toUpperCase()}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap justify-end pt-1">
              {isOwn && (
                <button
                  onClick={() => setShowEdit(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs mono text-slate-300 border transition-all hover:text-white hover:border-slate-500"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <Pencil size={12} /> EDIT
                </button>
              )}
              <Link
                to={`/u/${username}/showcase`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs mono text-slate-400 border transition-all hover:text-slate-400 hover:border-slate-500/40"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <BookOpen size={12} /> SHOWCASE
              </Link>
              {!isOwn && user && (
                <>
                  <button
                    onClick={() => followMut.mutate()}
                    disabled={followMut.isPending}
                    className="btn-primary px-4 py-2 rounded-lg text-xs mono font-semibold transition-all"
                    style={isFollowing
                      ? { backgroundColor: 'var(--color-elevated)', color: '#94a3b8', border: '1px solid var(--color-border)' }
                      : { background: 'var(--color-accent)', color: 'white' }
                    }
                  >
                    {followMut.isPending ? '...' : isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                  </button>
                  <RouterLink
                    to={`/messages/${profile.username}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs mono text-slate-400 border transition-all hover:text-cyan-400 hover:border-cyan-400/40"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <MessageSquare size={12} /> DM
                  </RouterLink>
                </>
              )}
            </div>
          </div>

          {/* Name + username */}
          <div className="mb-3">
            <h1 className="text-xl font-bold text-white mono">{profile.displayName ?? profile.username}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-slate-400 mono">@{profile.username}</span>
              {profile.memoBankUsername && (
                <span className="text-xs mono text-cyan-500 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded">
                  MB @{profile.memoBankUsername}
                </span>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-slate-300 text-sm leading-relaxed mb-4 max-w-lg">{profile.bio}</p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-5 mb-3">
            <button onClick={() => setTab('memories')} className="text-left transition-colors hover:opacity-80 group">
              <span className="mono text-sm font-bold text-white group-hover:opacity-80">{profile.memoryCount}</span>
              <span className="mono text-xs text-slate-500 ml-1.5">memories</span>
            </button>
            <button onClick={() => setTab('followers')} className="text-left transition-colors hover:opacity-80 group">
              <span className="mono text-sm font-bold text-white group-hover:opacity-80">{profile.followerCount}</span>
              <span className="mono text-xs text-slate-500 ml-1.5">followers</span>
            </button>
            <button onClick={() => setTab('following')} className="text-left transition-colors hover:opacity-80 group">
              <span className="mono text-sm font-bold text-white group-hover:opacity-80">{profile.followingCount}</span>
              <span className="mono text-xs text-slate-500 ml-1.5">following</span>
            </button>
          </div>

          {/* Links */}
          {(profile.website || profile.githubUsername) && (
            <div className="flex flex-wrap gap-4">
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs mono text-slate-400 hover:opacity-80 transition-colors">
                  <Globe size={12} />{profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              {profile.githubUsername && (
                <a href={`https://github.com/${profile.githubUsername}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs mono text-slate-400 hover:text-white transition-colors">
                  <GitBranch size={12} />{profile.githubUsername}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ Tabs + content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="max-w-2xl mx-auto px-5">
        {/* Pinned memories */}
        {(profile.pinnedMemoryIds?.length ?? 0) > 0 && (
          <div className="pt-6 pb-2">
            <div className="flex items-center gap-2 mb-3">
              <Pin size={12} className="text-slate-400" />
              <span className="mono text-xs font-semibold text-slate-400 tracking-wider">PINNED</span>
            </div>
            <div className="space-y-3">
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

        {/* Tab bar */}
        <div className="flex gap-0 border-b mt-6 overflow-x-auto" style={{ borderColor: 'var(--color-border)' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs mono font-medium transition-all border-b-2 -mb-px whitespace-nowrap flex-shrink-0 ${
                tab === t.key ? 'text-white border-slate-500' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={`text-xs mono px-1 rounded ${tab === t.key ? 'text-slate-400' : 'text-slate-600'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="py-5">
          {tab === 'memories' && (
            <div className="space-y-4">
              {memoriesQ.isLoading && <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-slate-400" /></div>}
              {memoriesQ.data?.map((memory: any) => {
                const isPinned = profile.pinnedMemoryIds?.includes(memory.id);
                return (
                  <div key={memory.id} className="relative group/mem">
                    <MemoryCard memory={memory} author={profile} />
                    {isOwn && (
                      <button
                        onClick={() => pinMut.mutate(memory.id)}
                        disabled={!isPinned && (profile.pinnedMemoryIds?.length ?? 0) >= 3}
                        className={`absolute top-3 right-3 opacity-0 group-hover/mem:opacity-100 flex items-center gap-1 text-xs mono transition-all px-2 py-1 rounded disabled:opacity-30 ${
                          isPinned ? 'text-slate-400 hover:text-red-400' : 'text-slate-500 hover:text-slate-400'
                        }`}
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
              {!memoriesQ.isLoading && memoriesQ.data?.length === 0 && (
                <div className="text-center py-12">
                  <p className="mono text-slate-500 text-sm">No memories yet</p>
                  {isOwn && <p className="text-xs text-slate-600 mt-1">Publish your first memory from the feed</p>}
                </div>
              )}
            </div>
          )}

          {tab === 'packs' && (
            <div className="space-y-3">
              {packsQ.isLoading && <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-slate-400" /></div>}
              {packsQ.data?.map((pack: any) => (
                <Link key={pack.id} to={`/packs/${pack.id}`} className="flex items-center gap-3 p-4 rounded-xl border card-hover block" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                  <Package size={16} className="text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="mono text-sm font-semibold text-white">{pack.title}</div>
                    {pack.description && <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{pack.description}</div>}
                  </div>
                  <span className="text-xs mono text-slate-500 flex-shrink-0">{pack.memoryCount}</span>
                </Link>
              ))}
              {!packsQ.isLoading && packsQ.data?.length === 0 && (
                <div className="text-center py-12">
                  <p className="mono text-slate-500 text-sm">No packs yet</p>
                </div>
              )}
            </div>
          )}

          {tab === 'projects' && (
            <div className="space-y-3">
              {projectsQ.isLoading && <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-slate-400" /></div>}
              {projectsQ.data?.map((project: any) => (
                <Link key={project.id} to={`/projects/${project.id}`} className="flex items-center gap-3 p-4 rounded-xl border card-hover block" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                  <FolderKanban size={16} className="text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="mono text-sm font-semibold text-white">{project.name}</div>
                    {project.description && <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{project.description}</div>}
                  </div>
                  <span className={`text-xs mono px-2 py-0.5 rounded border flex-shrink-0 ${STATUS_COLOR_MAP[project.status]}`}>
                    {project.status.toUpperCase()}
                  </span>
                </Link>
              ))}
              {!projectsQ.isLoading && projectsQ.data?.length === 0 && (
                <div className="text-center py-12">
                  <p className="mono text-slate-500 text-sm">No projects yet</p>
                </div>
              )}
            </div>
          )}

          {(tab === 'followers' || tab === 'following') && (
            <div className="space-y-2">
              {(tab === 'followers' ? followersQ : followingQ).isLoading && (
                <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-slate-400" /></div>
              )}
              {((tab === 'followers' ? followersQ.data?.users : followingQ.data?.users) ?? []).map((u: any) => (
                <Link key={u.id} to={`/u/${u.username}`} className="flex items-center gap-3 p-3 rounded-xl border card-hover block" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                  <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center mono font-bold text-sm overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))', color: 'white' }}>
                    {u.avatar ? <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" /> : u.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mono text-sm font-semibold text-white truncate">{u.displayName ?? u.username}</div>
                    <div className="text-xs mono text-slate-500">@{u.username}</div>
                  </div>
                  <div className="text-xs mono text-slate-600 flex-shrink-0">{u.followerCount} followers</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
