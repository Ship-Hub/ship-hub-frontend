import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dmApi, type DirectMessage, type Conversation } from '../lib/api';
import { Layout } from '../components/Layout';
import { useAuthStore } from '../store/auth';
import { timeAgo, processContent } from '../lib/utils';
import { PostMarkdown } from '../components/ComposeBox';
import { CommentInput } from '../components/CommentInput';
import { MessageSquare, Loader2, ArrowLeft } from 'lucide-react';

export function MessagesPage() {
  const { username } = useParams<{ username?: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const convoQ = useQuery({
    queryKey: ['conversations'],
    queryFn: () => dmApi.conversations().then(r => r.data),
    refetchInterval: 10000,
  });

  const messagesQ = useQuery({
    queryKey: ['dm', username],
    queryFn: () => dmApi.messages(username!).then(r => r.data),
    enabled: !!username,
    refetchInterval: 5000,
  });

  const sendMut = useMutation({
    mutationFn: () => dmApi.send(username!, text.trim()),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['dm', username] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesQ.data?.messages]);

  const conversations: Conversation[] = convoQ.data?.conversations ?? [];
  const messages: DirectMessage[] = messagesQ.data?.messages ?? [];
  const partner = messagesQ.data?.partner;

  return (
    <Layout>
      <div className="flex h-[calc(100vh-0px)] md:h-screen overflow-hidden" style={{ maxHeight: 'calc(100dvh - 48px)' }}>

        {/* Sidebar — conversations */}
        <div className={`w-full md:w-72 flex-shrink-0 border-r flex flex-col ${username ? 'hidden md:flex' : 'flex'}`}
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-secondary)' }}>
          <div className="px-4 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
            <MessageSquare size={16} className="text-violet-400" />
            <h1 className="mono text-sm font-bold text-white">MESSAGES</h1>
          </div>

          {convoQ.isLoading && <div className="flex justify-center py-8"><Loader2 size={16} className="animate-spin text-violet-400" /></div>}

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && !convoQ.isLoading && (
              <div className="text-center py-12 px-4">
                <MessageSquare size={28} className="text-slate-700 mx-auto mb-3" />
                <p className="mono text-xs text-slate-500">NO_CONVERSATIONS_YET</p>
                <p className="text-xs text-slate-600 mt-1">Visit someone's profile to start a DM</p>
              </div>
            )}
            {conversations.map(c => (
              <Link key={c.id} to={`/messages/${c.username}`}
                className={`flex items-center gap-3 px-4 py-3 border-b transition-all hover:bg-white/5 ${username === c.username ? 'bg-white/5' : ''}`}
                style={{ borderColor: 'var(--color-border)' }}>
                <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center mono font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg,#7C3AED,#00E5FF)', color: 'white' }}>
                  {c.avatar ? <img src={c.avatar} alt={c.username} className="w-full h-full object-cover" /> : c.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="mono text-xs font-semibold text-white">{c.displayName ?? c.username}</span>
                    <span className="text-xs mono text-slate-600">{timeAgo(c.lastMessageAt)}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {c.lastSenderId === user?.id ? 'You: ' : ''}{c.lastMessage}
                  </p>
                </div>
                {c.unread > 0 && (
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                    style={{ backgroundColor: 'var(--color-violet)', fontSize: '9px' }}>{c.unread}</span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        {username ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-secondary)' }}>
              <button onClick={() => navigate('/messages')} className="md:hidden text-slate-400 hover:text-white transition-colors">
                <ArrowLeft size={18} />
              </button>
              {partner && (
                <>
                  <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center mono font-bold text-sm"
                    style={{ background: 'linear-gradient(135deg,#7C3AED,#00E5FF)', color: 'white' }}>
                    {partner.avatar ? <img src={partner.avatar} alt={partner.username} className="w-full h-full object-cover" /> : partner.username[0].toUpperCase()}
                  </div>
                  <Link to={`/u/${partner.username}`} className="mono text-sm font-semibold text-white hover:text-violet-300 transition-colors">
                    @{partner.username}
                  </Link>
                </>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messagesQ.isLoading && <div className="flex justify-center py-8"><Loader2 size={16} className="animate-spin text-violet-400" /></div>}
              {messages.map(msg => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                      style={{
                        backgroundColor: isMe ? 'var(--color-violet)' : 'var(--color-panel)',
                        border: isMe ? 'none' : '1px solid var(--color-border)',
                        color: isMe ? 'white' : '#CBD5E1',
                      }}>
                      <PostMarkdown content={processContent(msg.content)} />
                      <span className="text-xs opacity-50 mt-1 block">{timeAgo(msg.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 pb-4 pt-2 flex-shrink-0 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <CommentInput
                value={text}
                onChange={setText}
                onSubmit={() => text.trim() && sendMut.mutate()}
                isPending={sendMut.isPending}
                placeholder={`Message @${username}...`}
              />
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageSquare size={32} className="text-slate-700 mx-auto mb-3" />
              <p className="mono text-slate-500 text-sm">SELECT_A_CONVERSATION</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
