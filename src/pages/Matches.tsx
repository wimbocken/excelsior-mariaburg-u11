import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { createMatch, deleteMatch, updateMatch } from '../store';
import { getScoreboard } from '../matchDisplay';
import type { Match } from '../types';
import { useAppStore } from '../useAppStore';

function statusBadge(status: string) {
  if (status === 'live') return <span className="badge badge-live">Live</span>;
  if (status === 'finished') return <span className="badge badge-done">Klaar</span>;
  return <span className="badge badge-planned">Gepland</span>;
}

function toLocalInput(date: string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date.slice(0, 16);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function defaultDate() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function Matches() {
  const { matches } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [location, setLocation] = useState('');
  const [isHome, setIsHome] = useState(true);
  const [periodMinutes, setPeriodMinutes] = useState(15);
  const [totalPeriods, setTotalPeriods] = useState(4);

  const resetForm = () => {
    setOpponent('');
    setDate(defaultDate());
    setLocation('');
    setIsHome(true);
    setPeriodMinutes(15);
    setTotalPeriods(4);
    setEditingId(null);
    setShowForm(false);
  };

  const startCreate = () => {
    setEditingId(null);
    setOpponent('');
    setDate(defaultDate());
    setLocation('');
    setIsHome(true);
    setPeriodMinutes(15);
    setTotalPeriods(4);
    setShowForm(true);
  };

  const startEdit = (m: Match) => {
    setEditingId(m.id);
    setOpponent(m.opponent);
    setDate(toLocalInput(m.date));
    setLocation(m.location);
    setIsHome(m.isHome);
    setPeriodMinutes(m.periodMinutes);
    setTotalPeriods(m.totalPeriods);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!opponent.trim()) return;

    if (editingId) {
      updateMatch(editingId, {
        opponent: opponent.trim(),
        date,
        location: location.trim(),
        isHome,
        periodMinutes,
        totalPeriods,
      });
    } else {
      createMatch({
        opponent,
        date,
        location,
        isHome,
        periodMinutes,
        totalPeriods,
      });
    }
    resetForm();
  };

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h1>Wedstrijden</h1>
          <div className="sub">Plannen & starten</div>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => (showForm ? resetForm() : startCreate())}
        >
          {showForm ? 'Sluit' : '+ Nieuw'}
        </button>
      </div>

      {showForm && (
        <form className="form" onSubmit={onSubmit} style={{ marginBottom: '0.85rem' }}>
          <label>
            Tegenstander
            <input
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="Naam ploeg"
              required
              autoFocus
            />
          </label>
          <label>
            Datum & uur
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Locatie
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Terrein / club"
            />
          </label>
          <div className="form-row">
            <label>
              Thuis / uit
              <select value={isHome ? 'home' : 'away'} onChange={(e) => setIsHome(e.target.value === 'home')}>
                <option value="home">Thuis</option>
                <option value="away">Uit</option>
              </select>
            </label>
            <label>
              Periodes
              <select
                value={totalPeriods}
                onChange={(e) => setTotalPeriods(Number(e.target.value))}
              >
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </label>
          </div>
          <label>
            Minuten per periode
            <input
              type="number"
              min={5}
              max={45}
              value={periodMinutes}
              onChange={(e) => setPeriodMinutes(Number(e.target.value))}
            />
          </label>
          <button type="submit" className="btn btn-primary btn-block">
            {editingId ? 'Wijzigingen opslaan' : 'Wedstrijd plannen'}
          </button>
        </form>
      )}

      <div className="stack">
        {matches.length === 0 && (
          <div className="empty">Nog geen wedstrijden. Plan de eerste match.</div>
        )}
        {matches.map((m) => (
          <div key={m.id} className="list-item" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <strong>vs {m.opponent}</strong>
              <div className="meta">
                {new Date(m.date).toLocaleString('nl-BE', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {m.location ? ` · ${m.location}` : ''}
                {' · '}
                {m.isHome ? 'Thuis' : 'Uit'}
                {' · '}
                {m.totalPeriods}×{m.periodMinutes}'
              </div>
              {(m.status === 'live' || m.status === 'finished') && (
                <div className="meta" style={{ marginTop: '0.35rem', fontWeight: 700 }}>
                  {(() => {
                    const b = getScoreboard(m);
                    return `${b.leftName} ${b.leftScore} – ${b.rightScore} ${b.rightName}`;
                  })()}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
              {statusBadge(m.status)}
              <Link
                to={`/live/${m.id}`}
                className="btn btn-primary"
                style={{ padding: '0.45rem 0.7rem', fontSize: '0.82rem' }}
              >
                {m.status === 'planned' ? 'Start' : m.status === 'live' ? 'Open' : 'Bekijk'}
              </Link>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.7rem', fontSize: '0.82rem' }}
                onClick={() => startEdit(m)}
              >
                Wijzig
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ color: 'var(--danger)', fontSize: '0.75rem' }}
                onClick={() => {
                  if (confirm('Wedstrijd verwijderen?')) deleteMatch(m.id);
                }}
              >
                Verwijder
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
