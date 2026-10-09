import { useMemo, useState } from 'react';
import { addGoal } from '../store';
import { useAppStore } from '../useAppStore';

type Props = {
  matchId: string;
  team: 'home' | 'away';
  teamLabel: string;
  onClose: () => void;
};

export function GoalModal({ matchId, team, teamLabel, onClose }: Props) {
  const { players } = useAppStore();
  const active = useMemo(() => players.filter((p) => p.active), [players]);
  const [scorerId, setScorerId] = useState<string | undefined>();
  const [assistId, setAssistId] = useState<string | undefined>();
  const isOurs = team === 'home';

  const save = () => {
    addGoal(matchId, team, isOurs ? scorerId : undefined, isOurs ? assistId : undefined);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-title"
      >
        <h2 id="goal-title">Goal · {teamLabel}</h2>
        <p className="hint">
          {isOurs
            ? 'Kies wie scoorde en (optioneel) de assist. Daarna opslaan.'
            : 'Tegenstander scoorde. Bevestig om de score bij te werken.'}
        </p>

        {isOurs && (
          <>
            <div className="step-label">Wie scoorde?</div>
            <div className="picker-grid">
              {active.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`picker-btn${scorerId === p.id ? ' selected' : ''}${
                    assistId === p.id ? ' muted' : ''
                  }`}
                  onClick={() => {
                    setScorerId(p.id);
                    if (assistId === p.id) setAssistId(undefined);
                  }}
                >
                  {p.number != null ? `#${p.number} ` : ''}
                  {p.name}
                </button>
              ))}
            </div>

            <div className="step-label">Assist (optioneel)</div>
            <div className="picker-grid">
              <button
                type="button"
                className={`picker-btn${!assistId ? ' selected' : ''}`}
                onClick={() => setAssistId(undefined)}
              >
                Geen assist
              </button>
              {active.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`picker-btn${assistId === p.id ? ' selected' : ''}${
                    scorerId === p.id ? ' muted' : ''
                  }`}
                  disabled={scorerId === p.id}
                  onClick={() => setAssistId(p.id)}
                >
                  {p.number != null ? `#${p.number} ` : ''}
                  {p.name}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="btn-row" style={{ marginTop: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Annuleer
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={save}
            disabled={isOurs && !scorerId}
          >
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}
