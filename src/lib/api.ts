import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/v1';

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('shiphub_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('shiphub_token');
      localStorage.removeItem('shiphub_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Types ──────────────────────────────────────────────────────────────────
export type Category = 'prompt' | 'workflow' | 'architecture' | 'template' | 'tutorial' | 'agent_setup' | 'mcp' | 'deployment' | 'productivity';
export type EventType = 'demo_day' | 'build_session' | 'hackathon';
export type ProjectStatus = 'building' | 'launched' | 'archived';

export interface User {
  id: string; username: string; displayName: string | null; bio: string | null;
  avatar: string | null; website: string | null; githubUsername: string | null;
  followerCount: number; followingCount: number; memoryCount: number;
  memoBankUserId: string | null; memoBankUsername: string | null;
  emailVerified: number; isAdmin: number; platformAdmin: number; communityAdmin: number; banned: number;
  communityMutedUntil: string | null;
  pinnedMemoryIds: string[] | null;
  createdAt: string;
}

export interface Memory {
  id: string; userId: string; title: string; content: string; category: Category;
  tags: string[]; visibility: 'public' | 'private';
  forkedFromId: string | null; forkedFromUserId: string | null;
  originalMemoryId: string | null; originalUserId: string | null;
  forkCount: number; likeCount: number; saveCount: number; createdAt: string;
}

export interface AuthorSnippet { id: string; username: string; displayName: string | null; avatar: string | null; }
export interface MemoryWithAuthor { memory: Memory; author: AuthorSnippet; }

export interface Comment { id: string; memoryId: string; userId: string; content: string; createdAt: string; }
export interface CommentWithAuthor { comment: Comment; author: AuthorSnippet; }

export interface Project {
  id: string; userId: string; name: string; slug: string; description: string | null;
  status: ProjectStatus; tags: string[]; websiteUrl: string | null; githubUrl: string | null;
  followerCount: number; memoryCount: number; createdAt: string;
}
export interface ProjectWithOwner { project: Project; owner: AuthorSnippet; }

export interface ShipEvent {
  id: string; userId: string; title: string; description: string | null;
  type: EventType; startsAt: string; endsAt: string | null; location: string | null;
  rsvpCount: number; createdAt: string;
}
export interface EventWithOrganizer { event: ShipEvent; organizer: AuthorSnippet; }

// ── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  register: (d: { email: string; password: string; username: string; displayName?: string }) =>
    api.post<{ user: User; token: string }>('/auth/register', d),
  login: (d: { email: string; password: string }) =>
    api.post<{ user: User; token: string }>('/auth/login', d),
  me: () => api.get<{ user: User }>('/auth/me'),
  memobank: (apiKey: string) =>
    api.post<{ user: User; token: string; isNew?: boolean }>('/auth/memobank', { apiKey }),
  verifyEmail: (token: string) =>
    api.get<{ verified: boolean; username: string }>(`/auth/verify-email?token=${token}`),
  resendVerification: () =>
    api.post<{ sent: boolean }>('/auth/resend-verification'),
  forgotPassword: (email: string) =>
    api.post<{ sent: boolean }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post<{ reset: boolean }>('/auth/reset-password', { token, password }),
  connectMemoBank: (apiKey: string) =>
    api.post<{ connected: boolean; memoBankUsername: string }>('/auth/memobank/connect', { apiKey }),
  disconnectMemoBank: () =>
    api.delete('/auth/memobank/connect'),
};

// ── Memories ───────────────────────────────────────────────────────────────
export const memoriesApi = {
  feed: (limit = 20, offset = 0) =>
    api.get<{ memories: MemoryWithAuthor[] }>('/memories', { params: { limit, offset } }),
  get: (id: string) => api.get<MemoryWithAuthor>(`/memories/${id}`),
  create: (d: { title: string; content: string; category: Category; tags?: string[]; visibility?: 'public' | 'private' }) =>
    api.post<Memory>('/memories', d),
  update: (id: string, d: Partial<{ title: string; content: string; category: Category; tags: string[]; visibility: 'public' | 'private' }>) =>
    api.patch<Memory>(`/memories/${id}`, d),
  delete: (id: string) => api.delete(`/memories/${id}`),
  fork: (id: string) => api.post<Memory>(`/memories/${id}/fork`),
  like: (id: string) => api.post<{ liked: boolean }>(`/memories/${id}/like`),
  save: (id: string) => api.post<{ saved: boolean }>(`/memories/${id}/save`),
  saved: () => api.get<{ memories: MemoryWithAuthor[] }>('/memories/saved/me'),
  comments: (id: string) => api.get<{ comments: CommentWithAuthor[] }>(`/memories/${id}/comments`),
  comment: (id: string, content: string) => api.post<CommentWithAuthor>(`/memories/${id}/comments`, { content }),
  deleteComment: (commentId: string) => api.delete(`/comments/${commentId}`),
  byUser: (username: string) => api.get<{ memories: Memory[] }>(`/users/${username}/memories`),
};

// ── Users ──────────────────────────────────────────────────────────────────
export const usersApi = {
  profile: (username: string) => api.get<{ user: User }>(`/users/${username}`),
  update: (d: Partial<{ displayName: string; bio: string; website: string; githubUsername: string; avatar: string }>) =>
    api.patch<{ user: User }>('/users/me', d),
  follow: (username: string) => api.post<{ following: boolean }>(`/users/${username}/follow`),
  followStatus: (username: string) => api.get<{ following: boolean }>(`/users/${username}/following-status`),
  followers: (username: string) => api.get<{ users: User[] }>(`/users/${username}/followers`),
  following: (username: string) => api.get<{ users: User[] }>(`/users/${username}/following`),
  pin: (memoryId: string) => api.post<{ pinned: boolean; pinnedMemoryIds: string[] }>(`/users/me/pin/${memoryId}`),
  trending: () => api.get<{ builders: TrendingBuilder[] }>('/users/trending'),
};

// ── Projects ───────────────────────────────────────────────────────────────
export const projectsApi = {
  list: (limit = 20, offset = 0) =>
    api.get<{ projects: ProjectWithOwner[] }>('/projects', { params: { limit, offset } }),
  get: (id: string) => api.get<ProjectWithOwner>(`/projects/${id}`),
  create: (d: { name: string; description?: string; status?: ProjectStatus; tags?: string[]; websiteUrl?: string; githubUrl?: string }) =>
    api.post<Project>('/projects', d),
  update: (id: string, d: Partial<{ name: string; description: string; status: ProjectStatus; tags: string[]; websiteUrl: string; githubUrl: string }>) =>
    api.patch<Project>(`/projects/${id}`, d),
  delete: (id: string) => api.delete(`/projects/${id}`),
  memories: (id: string) => api.get<{ memories: MemoryWithAuthor[] }>(`/projects/${id}/memories`),
  addMemory: (id: string, memoryId: string) => api.post(`/projects/${id}/memories`, { memoryId }),
  removeMemory: (id: string, memoryId: string) => api.delete(`/projects/${id}/memories/${memoryId}`),
  follow: (id: string) => api.post<{ following: boolean }>(`/projects/${id}/follow`),
  followStatus: (id: string) => api.get<{ following: boolean }>(`/projects/${id}/follow-status`),
  byUser: (username: string) => api.get<{ projects: Project[] }>(`/users/${username}/projects`),
};

// ── Events ─────────────────────────────────────────────────────────────────
export const eventsApi = {
  list: (limit = 20, offset = 0) =>
    api.get<{ events: EventWithOrganizer[] }>('/events', { params: { limit, offset } }),
  get: (id: string) => api.get<EventWithOrganizer>(`/events/${id}`),
  create: (d: { title: string; description?: string; type: EventType; startsAt: string; endsAt?: string; location?: string }) =>
    api.post<ShipEvent>('/events', d),
  rsvp: (id: string) => api.post<{ rsvped: boolean }>(`/events/${id}/rsvp`),
  rsvpStatus: (id: string) => api.get<{ rsvped: boolean }>(`/events/${id}/rsvp-status`),
};

// ── Graph ──────────────────────────────────────────────────────────────────
export const graphApi = {
  get: (limit = 50) => api.get('/graph', { params: { limit } }),
};

// ── Notifications ──────────────────────────────────────────────────────────
export interface Notification {
  id: string; userId: string; actorId: string;
  type: 'fork' | 'follow' | 'comment' | 'like' | 'mention' | 'reaction' | 'quote';
  memoryId: string | null; projectId: string | null; commentId: string | null; postId: string | null;
  read: number; createdAt: string;
}
export interface NotificationWithActor { notification: Notification; actor: AuthorSnippet; }

export const notificationsApi = {
  list: (limit = 30) => api.get<{ notifications: NotificationWithActor[] }>('/notifications', { params: { limit } }),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  readAll: () => api.post('/notifications/read-all'),
  readOne: (id: string) => api.patch(`/notifications/${id}/read`),
};

// ── Search ─────────────────────────────────────────────────────────────────
export const searchApi = {
  search: (q: string, type: 'all' | 'memories' | 'users' | 'projects' | 'packs' | 'tags' = 'all') =>
    api.get<{ memories: MemoryWithAuthor[]; users: User[]; projects: any[]; packs: any[] }>('/search', { params: { q, type } }),
};

// ── Trending ───────────────────────────────────────────────────────────────
export const trendingApi = {
  get: (limit = 20) => api.get<{ memories: MemoryWithAuthor[] }>('/memories/trending', { params: { limit } }),
};

// ── Packs ──────────────────────────────────────────────────────────────────
export interface Pack {
  id: string; userId: string; title: string; description: string | null;
  visibility: 'public' | 'private'; memoryCount: number; createdAt: string;
}
export interface PackWithOwner { pack: Pack; owner: AuthorSnippet; }

export const packsApi = {
  list: (limit = 20, offset = 0) =>
    api.get<{ packs: PackWithOwner[] }>('/packs', { params: { limit, offset } }),
  get: (id: string) =>
    api.get<{ pack: Pack; owner: AuthorSnippet; memories: MemoryWithAuthor[] }>(`/packs/${id}`),
  create: (d: { title: string; description?: string; visibility?: 'public' | 'private' }) =>
    api.post<PackWithOwner>('/packs', d),
  update: (id: string, d: Partial<{ title: string; description: string; visibility: 'public' | 'private' }>) =>
    api.patch<{ pack: Pack }>(`/packs/${id}`, d),
  delete: (id: string) => api.delete(`/packs/${id}`),
  addMemory: (id: string, memoryId: string) =>
    api.post<{ added: boolean }>(`/packs/${id}/memories`, { memoryId }),
  removeMemory: (id: string, memoryId: string) =>
    api.delete(`/packs/${id}/memories/${memoryId}`),
  byUser: (username: string) =>
    api.get<{ packs: Pack[] }>(`/users/${username}/packs`),
};

// ── Leaderboard ────────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  id: string; username: string; displayName: string | null; avatar: string | null;
  bio: string | null; followerCount: number; memoryCount: number;
  totalForks: number; totalLikes: number; rep: number;
}

export const leaderboardApi = {
  get: (limit = 50) => api.get<{ builders: LeaderboardEntry[] }>('/leaderboard', { params: { limit } }),
};

// ── Browse ─────────────────────────────────────────────────────────────────
export const browseApi = {
  byTag: (tag: string, limit = 30) =>
    api.get<{ memories: MemoryWithAuthor[] }>('/browse', { params: { tag, limit } }),
  byCategory: (category: string, limit = 30) =>
    api.get<{ memories: MemoryWithAuthor[] }>('/browse', { params: { category, limit } }),
};

// ── Posts ──────────────────────────────────────────────────────────────────
export type PostType = 'general' | 'build_update' | 'code_snippet' | 'collab_request' | 'poll' | 'question';

export interface Post {
  id: string; userId: string;
  type: PostType;
  content: string;
  visibility: 'public' | 'private';
  mediaUrl: string | null; mediaType: 'image' | 'video' | null;
  quotePostId: string | null; quoteMemoryId: string | null;
  // code snippet
  language: string | null;
  // build update
  projectId: string | null; milestone: string | null;
  // collab request
  roleNeeded: string | null;
  skills: string[] | null;
  compensation: 'paid' | 'equity' | 'volunteer' | 'revenue_share' | null;
  applyUrl: string | null;
  // question
  acceptedAnswerId: string | null;
  // poll
  pollIsAnonymous: number; pollAllowMultiple: number;
  // stats
  likeCount: number; saveCount: number; commentCount: number;
  editedAt: string | null; createdAt: string;
  pinnedAt: string | null; pinnedById: string | null;
}

export interface PostWithAuthor {
  post: Post; author: AuthorSnippet;
  quotedPost?: PostWithAuthor | null;
  quotedMemory?: MemoryWithAuthor | null;
  poll?: { options: PollOption[] } | null;
}

export interface PollOption {
  id: string; postId: string; text: string; position: number; voteCount: number;
}
export interface PollResults {
  postId: string; isAnonymous: boolean; allowMultiple: boolean; totalVotes: number;
  options: Array<PollOption & { myVote: boolean; voters?: AuthorSnippet[] }>;
}

export type ReactionMap = Record<string, { count: number; reacted: boolean }>;

export const postsApi = {
  list: (limit = 20, offset = 0, type?: string) =>
    api.get<{ posts: PostWithAuthor[] }>('/posts', { params: { limit, offset, type } }),
  get: (id: string) => api.get<PostWithAuthor>(`/posts/${id}`),
  create: (data: {
    type?: PostType; content: string; visibility?: 'public' | 'private';
    mediaUrl?: string; mediaType?: 'image' | 'video';
    quotePostId?: string; quoteMemoryId?: string;
    language?: string; projectId?: string; milestone?: string;
    roleNeeded?: string; skills?: string[]; compensation?: string; applyUrl?: string;
    pollOptions?: string[]; pollIsAnonymous?: boolean; pollAllowMultiple?: boolean;
  }) => api.post<PostWithAuthor>('/posts', data),
  delete: (id: string) => api.delete(`/posts/${id}`),
  like: (id: string) => api.post<{ liked: boolean }>(`/posts/${id}/like`),
  save: (id: string) => api.post<{ saved: boolean }>(`/posts/${id}/save`),
  comments: (id: string) => api.get(`/posts/${id}/comments`),
  comment: (id: string, content: string) => api.post(`/posts/${id}/comments`, { content }),
  deleteComment: (id: string) => api.delete(`/posts/comments/${id}`),
  saved: () => api.get<{ posts: PostWithAuthor[] }>('/posts/saved/me'),
  edit: (id: string, content: string) => api.patch<PostWithAuthor>(`/posts/${id}`, { content }),
  pin: (id: string) => api.post<{ pinned: boolean }>(`/posts/${id}/pin`),
  reactions: (id: string) => api.get<{ reactions: ReactionMap }>(`/posts/${id}/reactions`),
  react: (id: string, emoji: string) => api.post<{ reacted: boolean; emoji: string }>(`/posts/${id}/reactions`, { emoji }),
  pollResults: (id: string) => api.get<PollResults>(`/posts/${id}/poll`),
  vote: (id: string, optionId: string) => api.post<{ ok: boolean; optionId: string }>(`/posts/${id}/vote`, { optionId }),
  apply: (id: string, message: string) => api.post(`/posts/${id}/apply`, { message }),
  applications: (id: string) => api.get(`/posts/${id}/applications`),
  updateApplication: (postId: string, appId: string, status: 'accepted' | 'rejected') =>
    api.patch(`/posts/${postId}/applications/${appId}`, { status }),
  acceptAnswer: (postId: string, commentId: string) =>
    api.post(`/posts/${postId}/comments/${commentId}/accept`),
};

// ── Post editing ───────────────────────────────────────────────────────────
// (postsApi.edit added inline below)

// ── Direct messages ────────────────────────────────────────────────────────
export interface DirectMessage {
  id: string; senderId: string; receiverId: string;
  content: string; read: number; createdAt: string;
}
export interface Conversation {
  id: string; username: string; displayName: string | null; avatar: string | null;
  lastMessage: string; lastMessageAt: string; lastSenderId: string; unread: number;
}

export const dmApi = {
  conversations: () => api.get<{ conversations: Conversation[] }>('/dm'),
  messages: (username: string) => api.get<{ partner: AuthorSnippet; messages: DirectMessage[] }>(`/dm/${username}`),
  send: (username: string, content: string) => api.post<DirectMessage>(`/dm/${username}`, { content }),
  unreadCount: () => api.get<{ count: number }>('/dm/unread-count'),
};

// ── Admin ───────────────────────────────────────────────────────────────────
export const adminApi = {
  stats: () => api.get<{ users: number; memories: number; posts: number; newUsersToday: number }>('/admin/stats'),
  users: (q = '', limit = 30, offset = 0) => api.get('/admin/users', { params: { q, limit, offset } }),
  ban: (id: string, banned: boolean) => api.patch(`/admin/users/${id}/ban`, { banned }),
  roles: (id: string, roles: { platformAdmin?: boolean; communityAdmin?: boolean }) => api.patch(`/admin/users/${id}/roles`, roles),
  muteCommunity: (id: string, minutes: number | null) => api.patch(`/admin/users/${id}/community-mute`, { minutes }),
  deleteMemory: (id: string) => api.delete(`/admin/memories/${id}`),
  deletePost: (id: string) => api.delete(`/admin/posts/${id}`),
};

// ── Trending tags ───────────────────────────────────────────────────────────
export const tagsApi = {
  trending: (limit = 20) => api.get<{ tags: { tag: string; count: number }[] }>('/tags/trending', { params: { limit } }),
};

// ── Upload ─────────────────────────────────────────────────────────────────
export const uploadApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    // POST /v1/upload — uses the same baseURL as all other api calls
    return api.post<{ url: string; mediaType: 'image' | 'video'; filename: string }>('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ── Unified feed ───────────────────────────────────────────────────────────
export type FeedTabType =
  | 'all' | 'memories' | 'posts' | 'trending' | 'following'
  | 'build_updates' | 'code' | 'collaborations' | 'polls' | 'questions' | 'projects';

export type FeedItemType = 'memory' | 'post' | 'project';
export type FeedItem =
  | ({ type: 'memory' } & MemoryWithAuthor & { createdAt: string })
  | ({ type: 'post' } & PostWithAuthor & { createdAt: string })
  | { type: 'project'; project: Project; author: AuthorSnippet; createdAt: string };

export const feedApi = {
  get: (type: FeedTabType = 'all', limit = 30, offset = 0) =>
    api.get<{ items: FeedItem[] }>('/feed', { params: { type, limit, offset } }),
};

// ── Presence ───────────────────────────────────────────────────────────────
export interface OnlineUser { id: string; username: string; displayName: string | null; avatar: string | null; lastSeen: string; }
export const presenceApi = {
  heartbeat: () => api.post<{ ok: boolean }>('/presence/heartbeat'),
  online: () => api.get<{ online: OnlineUser[]; count: number }>('/presence/online'),
};

// ── Chat ───────────────────────────────────────────────────────────────────
export interface ChatChannel { id: string; name: string; slug: string; description: string | null; isDefault: number; messageCount: number; createdAt: string; }
export interface ChatMessage {
  id: string; channelId: string; userId: string; content: string;
  pinnedAt: string | null; pinnedById: string | null; createdAt: string;
}
export interface ChatMessageWithAuthor { message: ChatMessage; author: AuthorSnippet; }
export const chatApi = {
  channels: () => api.get<{ channels: ChatChannel[] }>('/chat/channels'),
  messages: (slug: string, before?: string) =>
    api.get<{ messages: ChatMessageWithAuthor[]; channelId: string }>(`/chat/channels/${slug}/messages`, { params: before ? { before } : {} }),
  send: (slug: string, content: string) =>
    api.post<ChatMessageWithAuthor>(`/chat/channels/${slug}/messages`, { content }),
  pin: (id: string) => api.post<{ pinned: boolean }>(`/chat/messages/${id}/pin`),
};

// ── Trending builders ───────────────────────────────────────────────────────
export interface TrendingBuilder {
  id: string; username: string; displayName: string | null; avatar: string | null;
  bio: string | null; followerCount: number; memoryCount: number; weeklyScore: number;
}

// ── Import / Export ────────────────────────────────────────────────────────
export const importExportApi = {
  mbStatus: () => api.get<{ connected: boolean; memoBankUsername: string | null }>('/import/memobank/status'),
  mbProjects: (apiKey?: string) => api.post<{ projects: any[]; usingStoredKey: boolean }>('/import/memobank/projects', { apiKey }),
  mbMemories: (projectId: string, apiKey?: string) => api.post<{ memories: any[] }>('/import/memobank/memories', { projectId, apiKey }),
  importMemories: (memories: any[]) => api.post<{ imported: number; ids: string[] }>('/import/memories', { memories }),
  exportBulk: (format: 'json' | 'csv' | 'markdown', ids?: string[]) => {
    const params: any = { format };
    if (ids?.length) params.ids = ids.join(',');
    return `${import.meta.env.VITE_API_BASE_URL ?? '/v1'}/memories/export/bulk?${new URLSearchParams(params)}`;
  },
  exportOne: (id: string, format: 'json' | 'markdown') =>
    `${import.meta.env.VITE_API_BASE_URL ?? '/v1'}/memories/${id}/export?format=${format}`,
};
