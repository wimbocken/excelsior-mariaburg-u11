import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { setLineupSlot } from '../store';
import { POSITIONS, type PositionId } from '../types';
import { useAppStore } from '../useAppStore';

const PITCH_LAYOUT: { id: PositionId; row: number; col: number }[] = [
  { id: 'spits', row: 1, col: 2 },
  { id: 'linkerFlank', row: 2, col: 1 },
  { id: 'centraalMidden', row: 2, col: 2 },
  { id: 'rechterFlank', row: 2, col: 3 },
  { id: 'linksVerdediger', row: 3, col: 1 },
  { id: 'centraleVerdediger', row: 3, col: 2 },
  { id: 'rechtsVerdediger', row: 3, col: 3 },
  { id: 'keeper', row: 4, col: 2 },
];

export function Lineup() {
  const { id } = useParams<{ id: string }>();
  const { matches, players } = useAppStore();
  const match = matches.find((m) => m.id === id);
  const [picking, setPicking] = useState<PositionId | null>(null);

  const activePlayers = useMemo(() => players.filter((p) => p.active), [players]);
  const lineup = match?.lineup ?? {};

  const playerById = useMemo(() => {
    const map = new Map(players.map((p) => [p.id, p]));
    return (pid?: string) => (pid ? map.get(pid) : undefined);
  }, [players]);

  const usedIds = new Set(Object.values(lineup).filter(Boolean) as string[]);
  const bench = activePlayers.filter((p) => !usedIds.has(p.id));

  if (!match || !id) {
    return (
      <div className="page">
        <div className="empty">
          Wedstrijd niet gevonden.
          <br />
          <Link to="/wedstrijden">Terug</Link>
        </div>
      </div>
    );
  }

  const labelOf = (pos: PositionId) => POSITIONS.find((p) => p.id === pos)?.label ?? pos;
  const shortOf = (pos: PositionId) => POSITIONS.find((p) => p.id === pos)?.short ?? pos;

  return (
    <div className="page">
      <div className="topbar" style={{ paddingRight: '3.5rem' }}>
        <div>
          <h1>Opstelling</h1>
          <div className="sub">vs {match.opponent}</div>
        </div>
      </div>

      <div className="pitch">
        <div className="pitch-half-circle" />
        <div className="pitch-box" />
        {PITCH_LAYOUT.map((slot) => {
          const player = playerById(lineup[slot.id]);
          return (
            <button
              key={slot.id}
              type="button"
              className={`pitch-slot row-${slot.row} col-${slot.col}${player ? ' filled' : ''}`}
              onClick={() => setPicking(slot.id)}
            >
              <span className="pitch-pos">{shortOf(slot.id)}</span>
              <span className="pitch-name">{player ? player.name : 'Kies'}</span>
            </button>
          );
        })}
      </div>

      <div className="stack" style={{ marginTop: '0.85rem' }}>
        <div className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
          <strong>Bank ({bench.length})</strong>
          {bench.length === 0 ? (
            <div className="meta">Alle actieve spelers staan in de elftal.</div>
          ) : (
            <div className="bench-chips">
              {bench.map((p) => (
                <span key={p.id} className="bench-chip">
                  {p.number != null ? `#${p.number} ` : ''}
                  {p.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <Link to={`/live/${id}`} className="btn btn-primary btn-block" style={{ textAlign: 'center' }}>
          Naar wedstrijd
        </Link>
        <Link to="/wedstrijden" className="btn btn-secondary btn-block" style={{ textAlign: 'center' }}>
          Terug naar wedstrijden
        </Link>
      </div>

      {picking && (
        <div className="modal-backdrop" onClick={() => setPicking(null)} role="presentation">
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2>{labelOf(picking)}</h2>
            <p className="hint">Kies een speler of maak de positie leeg.</p>
            <div className="picker-grid">
              <button
                type="button"
                className="picker-btn"
                onClick={() => {
                  setLineupSlot(id, picking, undefined);
                  setPicking(null);
                }}
              >
                Leeg
              </button>
              {activePlayers.map((p) => {
                const takenElsewhere =
                  usedIds.has(p.id) && lineup[picking] !== p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`picker-btn${lineup[picking] === p.id ? ' selected' : ''}${
                      takenElsewhere ? ' muted' : ''
                    }`}
                    onClick={() => {
                      setLineupSlot(id, picking, p.id);
                      setPicking(null);
                    }}
                  >
                    {p.number != null ? `#${p.number} ` : ''}
                    {p.name}
                    {takenElsewhere ? ' · verplaats' : ''}
                  </button>
                );
              })}
            </div>
            <button type="button" className="btn btn-secondary btn-block" onClick={() => setPicking(null)}>
              Annuleer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
