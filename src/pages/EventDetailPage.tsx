import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../lib/api';
import { Layout } from '../components/Layout';
import { useAuthStore } from '../store/auth';
import {
  CalendarDays, MapPin, Users, ArrowLeft, Loader2,
  Zap, Code, Trophy, Clock, ExternalLink
} from 'lucide-react';

const EVENT_TYPE_CONFIG = {
  demo_day:      { label: 'DEMO_DAY',      color: 'text-slate-400 bg-violet-400/10 border-violet-400/20', icon: Zap },
  build_session: { label: 'BUILD_SESSION', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',   icon: Code },
  hackathon:     { label: 'HACKATHON',     color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: Trophy },
} as const;

function formatDateTime(dt: string) {
  return new Date(dt).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.get(id!).then(r => r.data),
  });

  const rsvpStatusQ = useQuery({
    queryKey: ['event-rsvp', id],
    queryFn: () => eventsApi.rsvpStatus(id!).then(r => r.data.rsvped),
    enabled: !!user,
  });

  const rsvpMut = useMutation({
    mutationFn: () => eventsApi.rsvp(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event', id] });
      qc.invalidateQueries({ queryKey: ['event-rsvp', id] });
    },
  });

  if (isLoading) return (
    <Layout>
      <div className="flex justify-center py-20">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    </Layout>
  );
  if (!data) return null;

  const { event, organizer } = data;
  const cfg = EVENT_TYPE_CONFIG[event.type as keyof typeof EVENT_TYPE_CONFIG];
  const Icon = cfg.icon;
  const rsvped = rsvpStatusQ.data ?? false;
  const isPast = new Date(event.startsAt) < new Date();

  return (
    <Layout>
      <div className="max-w-[680px] mx-auto px-4 py-6">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs mono text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={14} /> BACK
        </button>

        {/* Main card */}
        <div className="rounded-2xl border p-6 mb-5" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>

          {/* Type + past badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`flex items-center gap-1.5 text-xs mono px-2.5 py-1 rounded border ${cfg.color}`}>
              <Icon size={11} /> {cfg.label}
            </span>
            {isPast && (
              <span className="text-xs mono px-2 py-0.5 rounded border text-slate-500 border-slate-500/20 bg-slate-500/10">
                PAST_EVENT
              </span>
            )}
          </div>

          <h1 className="mono text-xl font-bold text-white mb-4">{event.title}</h1>

          {event.description && (
            <p className="text-slate-300 text-sm leading-relaxed mb-5">{event.description}</p>
          )}

          {/* Meta */}
          <div className="space-y-2.5 mb-6 pb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays size={14} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-300">{formatDateTime(event.startsAt)}</span>
            </div>

            {event.endsAt && (
              <div className="flex items-center gap-2 text-sm">
                <Clock size={14} className="text-slate-500 flex-shrink-0" />
                <span className="text-slate-400">Until {formatDateTime(event.endsAt)}</span>
              </div>
            )}

            {event.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={14} className="text-cyan-400 flex-shrink-0" />
                <span className="text-slate-300">{event.location}</span>
                {event.location.startsWith('http') && (
                  <a href={event.location} target="_blank" rel="noopener noreferrer"
                     className="text-cyan-400 hover:text-cyan-300 transition-colors">
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <Users size={14} className="text-emerald-400 flex-shrink-0" />
              <span className="text-slate-300">
                <span className="text-emerald-400 font-semibold mono">{event.rsvpCount}</span>
                {' '}builder{event.rsvpCount !== 1 ? 's' : ''} attending
              </span>
            </div>
          </div>

          {/* Organizer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs mono text-slate-500">Organized by</span>
              {organizer && (
                <Link to={`/u/${organizer.username}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs mono font-bold"
                       style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))', color: 'white' }}>
                    {organizer.username[0].toUpperCase()}
                  </div>
                  <span className="text-xs mono text-slate-300">@{organizer.username}</span>
                </Link>
              )}
            </div>

            {/* RSVP */}
            {user && !isPast && (
              <button
                onClick={() => rsvpMut.mutate()}
                disabled={rsvpMut.isPending}
                className={`px-5 py-2 rounded-lg text-xs mono font-semibold transition-all ${
                  rsvped
                    ? 'border hover:border-red-500/30 hover:text-red-400 text-slate-400'
                    : 'text-white hover:opacity-90'
                }`}
                style={rsvped
                  ? { borderColor: 'var(--color-border)', backgroundColor: 'transparent' }
                  : { background: 'var(--color-accent)' }
                }
              >
                {rsvpMut.isPending ? '...' : rsvped ? 'âœ“ ATTENDING â€” CANCEL' : 'RSVP'}
              </button>
            )}

            {!user && !isPast && (
              <Link
                to="/login"
                className="px-5 py-2 rounded-lg text-xs mono font-semibold text-white hover:opacity-90 transition-all"
                style={{ background: 'var(--color-accent)' }}
              >
                SIGN_IN_TO_RSVP
              </Link>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
