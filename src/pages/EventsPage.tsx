import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { eventsApi, type EventWithOrganizer, type EventType } from '../lib/api';
import { Layout } from '../components/Layout';
import { useAuthStore } from '../store/auth';
import { timeAgo } from '../lib/utils';
import { CalendarDays, MapPin, Users, Clock, Plus, X, Loader2, Zap, Code, Trophy } from 'lucide-react';

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; color: string; icon: React.ElementType }> = {
  demo_day: { label: 'DEMO_DAY', color: 'text-slate-400 bg-violet-400/10 border-violet-400/20', icon: Zap },
  build_session: { label: 'BUILD_SESSION', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20', icon: Code },
  hackathon: { label: 'HACKATHON', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: Trophy },
};

function CreateEventModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', description: '', type: 'demo_day' as EventType, startsAt: '', endsAt: '', location: '' });

  const createMut = useMutation({
    mutationFn: () => eventsApi.create({ ...form, startsAt: new Date(form.startsAt).toISOString(), endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl border p-6" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="mono font-semibold text-white text-sm">CREATE_EVENT</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs mono text-slate-400 mb-1.5">TITLE</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-slate-500 transition-colors" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }} placeholder="Weekly Demo Day" />
          </div>
          <div>
            <label className="block text-xs mono text-slate-400 mb-1.5">TYPE</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as EventType }))} className="w-full px-3 py-2.5 rounded-lg border text-sm text-white outline-none" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}>
              <option value="demo_day">Demo Day</option>
              <option value="build_session">Build Session</option>
              <option value="hackathon">Hackathon</option>
            </select>
          </div>
          <div>
            <label className="block text-xs mono text-slate-400 mb-1.5">DESCRIPTION</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-slate-500 transition-colors resize-none" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mono text-slate-400 mb-1.5">STARTS_AT</label>
              <input type="datetime-local" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-slate-500 transition-colors" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }} />
            </div>
            <div>
              <label className="block text-xs mono text-slate-400 mb-1.5">ENDS_AT</label>
              <input type="datetime-local" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-slate-500 transition-colors" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }} />
            </div>
          </div>
          <div>
            <label className="block text-xs mono text-slate-400 mb-1.5">LOCATION (optional)</label>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border text-sm text-white bg-transparent outline-none focus:border-slate-500 transition-colors" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }} placeholder="Online / Discord / etc." />
          </div>
          <button onClick={() => createMut.mutate()} disabled={!form.title || !form.startsAt || createMut.isPending} className="w-full py-2.5 rounded-lg text-xs mono font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50" style={{ background: 'var(--color-accent)' }}>
            {createMut.isPending ? 'CREATING...' : 'CREATE_EVENT'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EventCard({ event, organizer }: EventWithOrganizer) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [rsvped, setRsvped] = useState(false);
  const cfg = EVENT_TYPE_CONFIG[event.type];
  const Icon = cfg.icon;

  const rsvpMut = useMutation({
    mutationFn: () => eventsApi.rsvp(event.id),
    onSuccess: (res) => { setRsvped(res.data.rsvped); qc.invalidateQueries({ queryKey: ['events'] }); },
  });

  return (
    <div className="rounded-xl border p-5 transition-all hover:border-slate-500/20" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--color-elevated)' }}>
            <Icon size={18} className={cfg.color.split(' ')[0]} />
          </div>
          <div>
            <Link to={`/events/${event.id}`} className="mono font-semibold text-white text-sm hover:opacity-80 transition-colors">
              {event.title}
            </Link>
            <div className="text-xs mono text-slate-500">by @{organizer?.username}</div>
          </div>
        </div>
        <span className={`text-xs mono px-2 py-0.5 rounded border flex-shrink-0 ${cfg.color}`}>{cfg.label}</span>
      </div>

      {event.description && <p className="text-slate-400 text-xs leading-relaxed mb-3 line-clamp-2">{event.description}</p>}

      <div className="flex items-center gap-4 mb-4">
        <span className="flex items-center gap-1 text-xs mono text-slate-500">
          <CalendarDays size={11} />
          {new Date(event.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
        {event.location && <span className="flex items-center gap-1 text-xs mono text-slate-500"><MapPin size={11} />{event.location}</span>}
        <span className="flex items-center gap-1 text-xs mono text-slate-500"><Users size={11} />{event.rsvpCount} RSVPs</span>
      </div>

      {user && (
        <button
          onClick={() => rsvpMut.mutate()}
          disabled={rsvpMut.isPending}
          className={`px-4 py-1.5 rounded-lg text-xs mono font-semibold transition-all ${rsvped ? 'text-slate-400 border hover:border-red-500/30 hover:text-red-400' : 'text-white hover:opacity-90'}`}
          style={rsvped ? { borderColor: 'var(--color-border)', backgroundColor: 'transparent' } : { background: 'var(--color-accent)' }}
        >
          {rsvped ? 'CANCEL_RSVP' : 'RSVP'}
        </button>
      )}
    </div>
  );
}

export function EventsPage() {
  const { user } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.list().then(r => r.data),
  });

  return (
    <Layout>
      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} />}
      <div className="max-w-[680px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="mono text-lg font-bold text-white">EVENTS</h1>
            <p className="text-xs text-slate-500 mt-0.5">Demo days, build sessions, hackathons</p>
          </div>
          {user && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs mono font-semibold text-white transition-all hover:opacity-90" style={{ background: 'var(--color-accent)' }}>
              <Plus size={13} /> CREATE_EVENT
            </button>
          )}
        </div>

        {isLoading && <div className="flex justify-center py-20"><Loader2 size={20} className="animate-spin text-slate-400" /></div>}

        <div className="grid gap-4">
          {data?.events?.map(({ event, organizer }: EventWithOrganizer) => (
            <EventCard key={event.id} event={event} organizer={organizer} />
          ))}
          {!isLoading && data?.events?.length === 0 && (
            <div className="text-center py-20">
              <CalendarDays size={32} className="text-slate-700 mx-auto mb-3" />
              <p className="mono text-slate-400 text-sm">NO_EVENTS_YET</p>
              {user && <button onClick={() => setShowCreate(true)} className="mt-3 text-xs mono text-slate-400 hover:opacity-80 transition-colors">Create the first event â†’</button>}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
