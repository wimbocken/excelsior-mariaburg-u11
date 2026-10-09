import { getPlayerStats, getSeasonStats } from '../store';
import { useAppStore } from '../useAppStore';

export function Stats() {
  useAppStore();
  const season = getSeasonStats();
  const withStats = getPlayerStats().filter((s) => s.goals > 0 || s.assists > 0);
  const saldo = season.goalsFor - season.goalsAgainst;
  const saldoLabel = saldo > 0 ? `+${saldo}` : String(saldo);

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h1>Statistieken</h1>
          <div className="sub">Seizoen · topscorers · vorm</div>
        </div>
      </div>

      <div className="season-card">
        <div className="season-card-title">Seizoen</div>
        <div className="season-grid">
          <div className="season-stat">
            <strong>{season.played}</strong>
            <span>Gespeeld</span>
          </div>
          <div className="season-stat">
            <strong>{season.won}</strong>
            <span>Winst</span>
          </div>
          <div className="season-stat">
            <strong>{season.drawn}</strong>
            <span>Gelijk</span>
          </div>
          <div className="season-stat">
            <strong>{season.lost}</strong>
            <span>Verlies</span>
          </div>
        </div>
        <div className="season-saldo">
          Doelpunten {season.goalsFor}–{season.goalsAgainst}
          <span className={saldo >= 0 ? 'plus' : 'minus'}> · saldo {saldoLabel}</span>
        </div>
        {season.form.length > 0 && (
          <div className="form-block">
            <div className="form-label">Laatste {season.form.length}</div>
            <div className="form-row">
              {season.form.map((f, i) => (
                <div key={`${f.opponent}-${i}`} className="form-item" title={`${f.opponent} ${f.score}`}>
                  <span className={`form-pill form-${f.result}`}>{f.result}</span>
                  <span className="form-opp">{f.opponent}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <h2 className="section-title">Topscorers</h2>
      {withStats.length === 0 ? (
        <div className="empty" style={{ padding: '1.25rem' }}>
          Nog geen goals of assists.
        </div>
      ) : (
        <div className="stack">
          <div className="stat-header-simple">
            <span>#</span>
            <span>Speler</span>
            <span>G</span>
            <span>A</span>
          </div>
          {withStats.map((s, i) => (
            <div key={s.playerId} className="stat-row">
              <div className="rank">{i + 1}</div>
              <div>
                <strong>
                  {s.number != null ? `#${s.number} ` : ''}
                  {s.name}
                </strong>
              </div>
              <div className="stat-num">
                <strong>{s.goals}</strong>
                <span>Goals</span>
              </div>
              <div className="stat-num">
                <strong>{s.assists}</strong>
                <span>Assists</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
