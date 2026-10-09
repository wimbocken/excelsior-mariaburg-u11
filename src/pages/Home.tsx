import { Link } from 'react-router-dom';
import { formatMatchScoreLine } from '../matchDisplay';
import { useAppStore } from '../useAppStore';

export function Home() {
  const { currentUser, matches, players } = useAppStore();
  const live = matches.find((m) => m.status === 'live');
  const upcoming = matches
    .filter((m) => m.status === 'planned')
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const finished = matches.filter((m) => m.status === 'finished').length;

  return (
    <div className="page">
      <div className="topbar">
        <div className="brand-row">
          <img
            className="brand-logo"
            src="/logo-excelsior-mariaburg.png"
            alt=""
            width={44}
            height={44}
          />
          <div>
            <h1>Hallo {currentUser}</h1>
            <div className="sub">Excelsior Mariaburg U11</div>
          </div>
        </div>
      </div>

      {live ? (
        <Link to={`/live/${live.id}`} className="home-cta">
          <div className="label">Live wedstrijd</div>
          <h2>{formatMatchScoreLine(live)}</h2>
          <p>
            Periode {live.currentPeriod}/{live.totalPeriods} · tik om verder te gaan
          </p>
        </Link>
      ) : upcoming ? (
        <Link to={`/live/${upcoming.id}`} className="home-cta">
          <div className="label">Volgende wedstrijd</div>
          <h2>vs {upcoming.opponent}</h2>
          <p>
            {new Date(upcoming.date).toLocaleString('nl-BE', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            · {upcoming.location || 'Locatie n.n.b.'}
          </p>
        </Link>
      ) : (
        <Link to="/wedstrijden" className="home-cta">
          <div className="label">Aan de slag</div>
          <h2>Plan een wedstrijd</h2>
          <p>Maak een match aan en start de timer wanneer het fluitje gaat.</p>
        </Link>
      )}

      <div className="stack">
        <div className="list-item">
          <div>
            <strong>{players.filter((p) => p.active).length} spelers</strong>
            <div className="meta">Actieve selectie</div>
          </div>
          <Link to="/spelers" className="btn btn-secondary" style={{ padding: '0.55rem 0.8rem' }}>
            Beheer
          </Link>
        </div>
        <div className="list-item">
          <div>
            <strong>{finished} gespeeld</strong>
            <div className="meta">{matches.length} wedstrijden in totaal</div>
          </div>
          <Link to="/stats" className="btn btn-secondary" style={{ padding: '0.55rem 0.8rem' }}>
            Stats
          </Link>
        </div>
        <div className="list-item">
          <div>
            <strong>Snel scoren</strong>
            <div className="meta">1 tik op de ploeg tijdens een live match</div>
          </div>
          <Link
            to={live ? `/live/${live.id}` : '/wedstrijden'}
            className="btn btn-primary"
            style={{ padding: '0.55rem 0.8rem' }}
          >
            Open
          </Link>
        </div>
      </div>
    </div>
  );
}
