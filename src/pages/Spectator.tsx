import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CLUB_NAME } from '../club';
import { fetchLiveMatch, type PublicLivePayload } from '../sync';
import { formatTime } from '../store';
import { getScoreboard } from '../matchDisplay';
import { getMatchElapsedSeconds } from '../time';

export function Spectator() {
  const { id } = useParams<{ id: string }>();
  const [payload, setPayload] = useState<PublicLivePayload | null>(null);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      const data = await fetchLiveMatch(id);
      if (cancelled) return;
      if (!data) {
        setError(true);
        return;
      }
      setError(false);
      setPayload(data);
    };

    load();
    const poll = window.setInterval(load, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [id]);

  // Smooth local clock between polls when running
  useEffect(() => {
    if (!payload?.match.periodRunning || payload.match.status !== 'live') return;
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [payload?.match.periodRunning, payload?.match.status, payload?.updatedAt]);

  const playerName = useMemo(() => {
    const map = new Map((payload?.players ?? []).map((p) => [p.id, p.name]));
    return (pid?: string) => (pid ? map.get(pid) ?? '?' : undefined);
  }, [payload?.players]);

  if (error && !payload) {
    return (
      <div className="app-shell">
        <div className="page">
          <div className="empty">
            Wedstrijd nog niet beschikbaar.
            <br />
            Zodra Rian of Wim de match opent, verschijnt de live-stand hier.
            <br />
            <br />
            <Link to="/login">Admin login</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="app-shell">
        <div className="page">
          <div className="empty">Laden…</div>
        </div>
      </div>
    );
  }

  const { match } = payload;
  const board = getScoreboard(match);
  const periodLimit = match.periodMinutes * 60;
  const displaySeconds = getMatchElapsedSeconds(match);
  void tick;
  const overtime = displaySeconds > periodLimit;

  const statusLabel =
    match.status === 'live' ? 'Live' : match.status === 'finished' ? 'Eindstand' : 'Gepland';

  return (
    <div className="app-shell">
      <div className="page page-tight" style={{ paddingBottom: '1.5rem' }}>
        <div className="topbar">
          <div className="brand-row">
            <img
              className="brand-logo"
              src="/logo-excelsior-mariaburg.png"
              alt=""
              width={40}
              height={40}
            />
            <div>
              <h1>{statusLabel}</h1>
              <div className="sub">Excelsior Mariaburg U11 · toeschouwer</div>
            </div>
          </div>
          {match.status === 'live' && <span className="badge badge-live">Live</span>}
        </div>

        <div className="live-hero">
          <div className="scoreboard">
            <div className="team-name">{board.leftName}</div>
            <div className="score">
              {board.leftScore}:{board.rightScore}
            </div>
            <div className="team-name">{board.rightName}</div>
          </div>

          <div className="timer-block">
            <div className="clock">
              {formatTime(displaySeconds)}
              {overtime && match.status === 'live' ? '+' : ''}
            </div>
            <div className="period">
              Periode {match.currentPeriod}/{match.totalPeriods}
              {match.status === 'live' && !match.periodRunning ? ' · gepauzeerd' : ''}
            </div>
            <div className="period-bar">
              {Array.from({ length: match.totalPeriods }, (_, i) => {
                const n = i + 1;
                let cls = 'period-dot';
                if (n < match.currentPeriod || match.status === 'finished') cls += ' done';
                else if (n === match.currentPeriod && match.status === 'live') cls += ' active';
                return <div key={n} className={cls} />;
              })}
            </div>
          </div>
        </div>

        <div className="events">
          <h3>Goals</h3>
          {match.goals.length === 0 && (
            <div className="empty" style={{ padding: '1.25rem' }}>
              Nog geen goals.
            </div>
          )}
          {[...match.goals].reverse().map((g) => {
            const ours = g.team === 'home';
            const scorer = playerName(g.scorerId);
            const assist = playerName(g.assistId);
            return (
              <div key={g.id} className="event-row">
                <div className="time">
                  P{g.period}
                  <br />
                  {g.clockLabel}
                </div>
                <div className="detail">
                  <strong>⚽ {ours ? CLUB_NAME : match.opponent}</strong>
                  {ours && scorer && (
                    <>
                      <br />
                      Goal: {scorer}
                      {assist ? ` · Assist: ${assist}` : ''}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
