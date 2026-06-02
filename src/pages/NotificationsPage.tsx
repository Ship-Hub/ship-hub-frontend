import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { notificationsApi, type NotificationWithActor } from '../lib/api';
import { Layout } from '../components/Layout';
import { timeAgo } from '../lib/utils';
import { Bell, GitFork, UserPlus, MessageSquare, Heart, Loader2, CheckCheck, AtSign, Smile, Quote } from 'lucide-react';

const NOTIF_CONFIG: Record<string, { icon: any; color: string; text: (a: string) => string }> = {
  fork:     { icon: GitFork,       color: 'text-cyan-400',    text: a => `@${a} forked your memory` },
  follow:   { icon: UserPlus,      color: 'text-violet-400',  text: a => `@${a} followed you` },
  comment:  { icon: MessageSquare, color: 'text-blue-400',    text: a => `@${a} commented on your post or memory` },
  like:     { icon: Heart,         color: 'text-pink-400',    text: a => `@${a} liked your memory` },
  mention:  { icon: AtSign,        color: 'text-emerald-400', text: a => `@${a} mentioned you` },
  reaction: { icon: Smile,         color: 'text-amber-400',   text: a => `@${a} reacted to your post` },
  quote:    { icon: Quote,         color: 'text-violet-300',  text: a => `@${a} quoted your post` },
};

export function NotificationsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then(r => r.data),
  });

  const readAllMut = useMutation({
    mutationFn: () => notificationsApi.readAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notif-count'] });
    },
  });

  const readOneMut = useMutation({
    mutationFn: (id: string) => notificationsApi.readOne(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notif-count'] });
    },
  });

  const unread = data?.notifications?.filter((n: NotificationWithActor) => !n.notification.read).length ?? 0;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="mono text-lg font-bold text-white">NOTIFICATIONS</h1>
            {unread > 0 && <p className="text-xs text-slate-500 mt-0.5">{unread} unread</p>}
          </div>
          {unread > 0 && (
            <button onClick={() => readAllMut.mutate()} disabled={readAllMut.isPending} className="flex items-center gap-1.5 text-xs mono text-slate-400 hover:text-white transition-colors">
              <CheckCheck size={13} /> MARK_ALL_READ
            </button>
          )}
        </div>

        {isLoading && <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-violet-400" /></div>}

        <div className="space-y-2">
          {data?.notifications?.map(({ notification, actor }: NotificationWithActor) => {
            const cfg = NOTIF_CONFIG[notification.type];
            const Icon = cfg.icon;
            const isUnread = !notification.read;

            return (
              <div
                key={notification.id}
                onClick={() => isUnread && readOneMut.mutate(notification.id)}
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${isUnread ? 'hover:border-violet-500/30' : 'opacity-60'}`}
                style={{
                  backgroundColor: isUnread ? 'var(--color-panel)' : 'transparent',
                  borderColor: isUnread ? 'var(--color-border)' : 'transparent',
                }}
              >
                {/* Actor avatar */}
                <Link to={`/u/${actor?.username}`} onClick={e => e.stopPropagation()}>
                  <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center mono font-bold text-sm" style={{ background: 'linear-gradient(135deg, #7C3AED, #00E5FF)', color: 'white' }}>
                    {actor?.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                </Link>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Icon size={12} className={cfg.color} />
                    <span className="text-xs text-slate-300">{cfg.text(actor?.username ?? 'someone')}</span>
                    {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />}
                  </div>

                  {notification.memoryId && (
                    <Link to={`/memory/${notification.memoryId}`} onClick={e => e.stopPropagation()} className="text-xs mono text-violet-400 hover:text-violet-300 transition-colors">
                      View memory →
                    </Link>
                  )}
                  {notification.postId && !notification.memoryId && (
                    <Link to={`/`} onClick={e => e.stopPropagation()} className="text-xs mono text-violet-400 hover:text-violet-300 transition-colors">
                      View feed →
                    </Link>
                  )}
                  {notification.type === 'follow' && actor && (
                    <Link
                      to={`/u/${actor.username}`}
                      onClick={e => e.stopPropagation()}
                      className="text-xs mono text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      View profile →
                    </Link>
                  )}

                  <div className="text-xs mono text-slate-600 mt-0.5">{timeAgo(notification.createdAt)}</div>
                </div>
              </div>
            );
          })}

          {!isLoading && data?.notifications?.length === 0 && (
            <div className="text-center py-16">
              <Bell size={32} className="text-slate-700 mx-auto mb-3" />
              <p className="mono text-slate-400 text-sm">NO_NOTIFICATIONS_YET</p>
              <p className="text-slate-600 text-xs mt-1">When someone forks, likes, or comments, you'll see it here</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
