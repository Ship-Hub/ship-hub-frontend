import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { chatApi, type ChatChannel, type ChatMessageWithAuthor } from '../lib/api';
import { Layout } from '../components/Layout';
import { useAuthStore } from '../store/auth';
import { timeAgo } from '../lib/utils';
import { Send, Hash, Loader2, Pin } from 'lucide-react';
import { CommentBody } from '../components/CommentInput';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/v1';

export function CommunityChatPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [activeSlug, setActiveSlug] = useState('general');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessageWithAuthor[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  const channelsQ = useQuery({
    queryKey: ['chat-channels'],
    queryFn: () => chatApi.channels().then(r => r.data.channels),
    staleTime: 60_000,
  });

  const historyQ = useQuery({
    queryKey: ['chat-messages', activeSlug],
    queryFn: () => chatApi.messages(activeSlug).then(r => r.data.messages),
    staleTime: 10_000,
  });

  useEffect(() => {
    if (historyQ.data) setMessages(historyQ.data);
  }, [historyQ.data]);

  // SSE for real-time messages
  useEffect(() => {
    const token = localStorage.getItem('shiphub_token');
    const url = `${BASE_URL}/chat/channels/${activeSlug}/stream${token ? `?token=${token}` : ''}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.message) {
          setMessages(prev => [...prev, payload as ChatMessageWithAuthor]);
        }
      } catch {}
    };
    es.onerror = () => es.close();
    return () => { es.close(); esRef.current = null; };
  }, [activeSlug]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMut = useMutation({
    mutationFn: () => chatApi.send(activeSlug, input.trim()),
    onSuccess: (res) => {
      setInput('');
      setMessages(prev => [...prev, res.data]);
    },
  });
  const pinMut = useMutation({
    mutationFn: (messageId: string) => chatApi.pin(messageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-messages', activeSlug] });
      qc.invalidateQueries({ queryKey: ['chat-channels'] });
    },
  });

  const channels = channelsQ.data ?? [];
  const activeChannel = channels.find(c => c.slug === activeSlug);
  const canModerate = !!user?.isAdmin || !!user?.platformAdmin || !!user?.communityAdmin;
  const pinnedMessages = messages.filter(m => m.message?.pinnedAt);

  return (
    <Layout>
      <Helmet><title>Community Chat — ShipHub</title></Helmet>
      <div className="flex h-[calc(100vh-0px)] md:h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-base)' }}>

        {/* Channel list */}
        <div className="w-48 flex-shrink-0 border-r flex flex-col py-4"
          style={{ backgroundColor: 'var(--color-secondary)', borderColor: 'var(--color-border)' }}>
          <div className="px-4 mb-3">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Channels</p>
          </div>
          <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
            {channelsQ.isLoading && (
              <div className="flex justify-center py-8"><Loader2 size={16} className="animate-spin text-slate-600" /></div>
            )}
            {channelsQ.isError && (
              <div className="px-3 py-2 text-xs text-red-400">Could not load channels.</div>
            )}
            {!channelsQ.isLoading && channels.length === 0 && (
              <div className="px-3 py-2 text-xs text-slate-500">No channels available.</div>
            )}
            {channels.map(ch => (
              <button key={ch.slug} onClick={() => setActiveSlug(ch.slug)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                  activeSlug === ch.slug ? 'text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
                style={activeSlug === ch.slug ? { backgroundColor: 'rgba(255,138,0,0.12)', color: 'var(--color-accent)' } : {}}>
                <Hash size={14} />
                <span className="truncate">{ch.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Channel header */}
          <div className="flex items-center gap-2 px-5 py-3 border-b flex-shrink-0"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-secondary)' }}>
            <Hash size={16} className="text-slate-500" />
            <span className="font-semibold text-white">{activeChannel?.name ?? activeSlug}</span>
            {activeChannel?.description && (
              <span className="text-xs text-slate-500 ml-1">— {activeChannel.description}</span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {historyQ.isLoading && (
              <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-slate-600" /></div>
            )}
            {pinnedMessages.length > 0 && (
              <div className="mb-4 rounded-xl border p-3 space-y-2" style={{ borderColor: 'rgba(255,138,0,0.25)', backgroundColor: 'rgba(255,138,0,0.06)' }}>
                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>
                  <Pin size={12} /> PINNED_CHAT
                </div>
                {pinnedMessages.slice(0, 3).map(m => (
                  <div key={m.message.id} className="text-xs text-slate-300 line-clamp-2">
                    <span className="font-semibold text-white">@{m.author?.username}: </span>
                    {m.message.content}
                  </div>
                ))}
              </div>
            )}
            {messages.map((m, i) => {
              const prevMsg = messages[i - 1];
              const sameAuthor = prevMsg?.author?.id === m.author?.id;
              return (
                <div key={m.message?.id ?? i} className={sameAuthor ? 'pl-10' : 'flex gap-3'}>
                  {!sameAuthor && (
                    <Link to={`/u/${m.author?.username}`} className="flex-shrink-0 mt-0.5">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold"
                        style={{ background: 'var(--color-accent)', color: 'white' }}>
                        {m.author?.avatar
                          ? <img src={m.author.avatar} alt="" className="w-full h-full object-cover" />
                          : m.author?.username?.[0]?.toUpperCase()}
                      </div>
                    </Link>
                  )}
                  <div className="flex-1 min-w-0">
                    {!sameAuthor && (
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-white">{m.author?.displayName || m.author?.username}</span>
                        <span className="text-xs text-slate-600">{timeAgo(m.message?.createdAt ?? '')}</span>
                      </div>
                    )}
                    <div className="text-sm text-slate-300 leading-relaxed">
                      <CommentBody content={m.message?.content ?? ''} />
                    </div>
                    {canModerate && (
                      <button
                        onClick={() => pinMut.mutate(m.message.id)}
                        disabled={pinMut.isPending}
                        className="mt-1 inline-flex items-center gap-1 text-xs text-slate-600 hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        <Pin size={10} />
                        {m.message.pinnedAt ? 'Unpin' : 'Pin'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-5 py-3 border-t flex-shrink-0" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-secondary)' }}>
            {user ? (
              <div className="flex items-center gap-3">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && input.trim()) sendMut.mutate(); }}
                  placeholder={`Message #${activeChannel?.name ?? activeSlug}`}
                  className="flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <button onClick={() => { if (input.trim()) sendMut.mutate(); }}
                  disabled={!input.trim() || sendMut.isPending}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                  style={{ backgroundColor: 'var(--color-accent)' }}>
                  <Send size={16} className="text-white" />
                </button>
              </div>
            ) : (
              <div className="text-center py-2">
                <Link to="/login" className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
                  Sign in to chat
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
