import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderKanban, Star, Heart, MessageSquare, Quote, ExternalLink, Users2 } from 'lucide-react';
import { projectsApi, type AuthorSnippet, type Project } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { useComposeStore } from '../store/compose';
import { timeAgo } from '../lib/utils';
import { CommentBody, CommentInput } from './CommentInput';

interface ProjectCardProps {
  project: Project;
  author: AuthorSnippet | null;
}

export function ProjectCard({ project, author }: ProjectCardProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { setQuoteProject } = useComposeStore();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  const followStatusQ = useQuery({
    queryKey: ['project-follow', project.id],
    queryFn: () => projectsApi.followStatus(project.id).then(r => r.data.following),
    enabled: !!user,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['feed'] });
    qc.invalidateQueries({ queryKey: ['project', project.id] });
    qc.invalidateQueries({ queryKey: ['projects'] });
  };

  const followMut = useMutation({
    mutationFn: () => projectsApi.follow(project.id),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['project-follow', project.id] });
    },
  });

  const likeMut = useMutation({ mutationFn: () => projectsApi.like(project.id), onSuccess: invalidate });
  const commentMut = useMutation({
    mutationFn: () => projectsApi.comment(project.id, commentText),
    onSuccess: (res) => {
      setComments(prev => [...prev, res.data]);
      setCommentText('');
      invalidate();
    },
  });
  const deleteCommentMut = useMutation({
    mutationFn: (id: string) => projectsApi.deleteComment(id),
    onSuccess: (_data, id) => {
      setComments(prev => prev.filter((c: any) => c.comment.id !== id));
      invalidate();
    },
  });

  const act = (fn: () => void) => {
    if (!user) { navigate('/login'); return; }
    fn();
  };

  const loadComments = async () => {
    if (!commentsLoaded) {
      const res = await projectsApi.comments(project.id);
      setComments(res.data.comments ?? []);
      setCommentsLoaded(true);
    }
    setShowComments(p => !p);
  };

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
        <div className="flex-shrink-0 flex flex-col items-center pt-3 pb-3 w-[64px] md:w-[72px]">
          <div
            className="w-12 h-12 md:w-[52px] md:h-[52px] rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(145deg, #051F0E 0%, #0D4A22 55%, #136E30 100%)',
              boxShadow: '0 0 14px rgba(52,211,153,0.3), 0 0 28px rgba(52,211,153,0.12)',
            }}
          >
            <FolderKanban
              size={22}
              style={{ color: '#6EE7B7', filter: 'drop-shadow(0 0 5px rgba(52,211,153,0.85))' }}
            />
          </div>
          <div className="flex-1 mt-2 w-px min-h-[12px]" style={{ backgroundColor: 'var(--color-border)' }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 pr-3 pt-3 pb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wide badge-project flex-shrink-0">
              PROJECT
            </span>
            {project.status === 'launched' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0" style={{ backgroundColor: 'rgba(0,217,126,0.1)', color: 'var(--color-success)' }}>
                LAUNCHED
              </span>
            )}
            <span className="text-xs text-slate-600 flex-shrink-0">{timeAgo(project.createdAt)}</span>
          </div>

          <div className="pr-4 pb-1">
            <Link to={`/projects/${project.id}`} className="text-base font-semibold text-white hover:text-slate-200 transition-colors leading-snug block">
              {project.name}
            </Link>
          </div>

          <div className="pr-4 pb-2 flex gap-3 items-start">
            <div className="flex-1 min-w-0">
              {project.description && (
                <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">{project.description}</p>
              )}
              {project.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {project.tags.slice(0, 4).map((tag: string) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-md" style={{ backgroundColor: 'var(--color-elevated)', color: 'var(--color-muted)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {project.websiteUrl && (
              <a href={project.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ backgroundColor: 'rgba(0,217,126,0.1)', color: 'var(--color-success)' }}>
                Demo <ExternalLink size={11} className="inline ml-1" />
              </a>
            )}
          </div>

          <div className="flex items-center gap-1 pr-3 py-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            {author && (
              <Link to={`/u/${author.username}`} className="flex items-center gap-1.5 mr-2 hover:opacity-80 transition-opacity flex-shrink-0">
                <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold" style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))', color: 'white' }}>
                  {author.avatar
                    ? <img src={author.avatar} alt="" className="w-full h-full object-cover" />
                    : author.username?.[0]?.toUpperCase()}
                </div>
                <span className="text-xs text-slate-500 max-w-[72px] truncate hidden sm:block">{author.displayName || author.username}</span>
              </Link>
            )}

            <button onClick={() => act(() => likeMut.mutate())} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-pink-400 hover:bg-white/5 transition-all">
              <Heart size={13} />
              {(project.likeCount ?? 0) > 0 && <span>{project.likeCount}</span>}
            </button>

            <button onClick={() => act(loadComments)} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all">
              <MessageSquare size={13} />
              {(project.commentCount ?? 0) > 0 && <span>{project.commentCount}</span>}
            </button>

            <button onClick={() => act(() => setQuoteProject({ project, owner: author! }))} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-violet-400 hover:bg-white/5 transition-all" title="Quote project">
              <Quote size={13} />
            </button>

            <div className="hidden sm:flex items-center gap-1 text-xs text-slate-600 ml-1">
              <Users2 size={12} />
              <span>{project.followerCount ?? 0}</span>
            </div>

            <button
              onClick={() => act(() => followMut.mutate())}
              disabled={followMut.isPending}
              className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border disabled:opacity-50"
              style={isFollowing
                ? { borderColor: 'rgba(52,211,153,0.25)', color: 'var(--color-success)', backgroundColor: 'rgba(52,211,153,0.06)' }
                : { borderColor: 'rgba(52,211,153,0.35)', color: 'var(--color-success)', backgroundColor: 'rgba(52,211,153,0.08)' }
              }
            >
              {isFollowing ? 'Following' : <><Star size={11} />Follow</>}
            </button>
          </div>

          {showComments && (
            <div className="pr-4 pb-4 border-t space-y-3 pt-3" style={{ borderColor: 'var(--color-border)' }}>
              {comments.map((c: any) => (
                <div key={c.comment.id} className="flex gap-2.5">
                  <Link to={`/u/${c.author?.username}`} className="flex-shrink-0">
                    <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold" style={{ background: 'var(--color-accent)', color: 'white' }}>
                      {c.author?.avatar
                        ? <img src={c.author.avatar} alt="" className="w-full h-full object-cover" />
                        : c.author?.username?.[0]?.toUpperCase()}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-500 mb-0.5">
                      <span className="font-semibold text-slate-300">{c.author?.displayName || c.author?.username}</span>
                      {' - '}{timeAgo(c.comment.createdAt)}
                    </div>
                    <CommentBody content={c.comment.content} />
                    {user?.id === c.comment.userId && (
                      <button onClick={() => deleteCommentMut.mutate(c.comment.id)} className="text-xs text-slate-600 hover:text-red-400 transition-colors mt-0.5">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {user && (
                <CommentInput
                  value={commentText}
                  onChange={setCommentText}
                  onSubmit={() => { if (commentText.trim()) commentMut.mutate(); }}
                  placeholder="Write a project reply..."
                  isPending={commentMut.isPending}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
