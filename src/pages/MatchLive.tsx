import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CLUB_NAME, CLUB_SHORT } from '../club';
import { GoalCelebration, OpponentGoalNotice } from '../components/GoalCelebration';
import { GoalModal } from '../components/GoalModal';
import { getScoreboard } from '../matchDisplay';
import {
  addGoal,
  finishMatch,
  formatTime,
  getMatchElapsedSeconds,
  nextPeriod,
  startMatch,
  toggleTimer,
  undoLastGoal,
} from '../store';
import { publishLiveMatch, spectatorUrl } from '../sync';
import { useGoalAlerts } from '../useGoalAlerts';
import { useAppStore } from '../useAppStore';

const DOUBLE_TAP_MS = 400;

export function MatchLive() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { matches, players } = useAppStore();
  const match = matches.find((m) => m.id === id);
  const [goalTeam, setGoalTeam] = useState<'home' | 'away' | null>(null);
  const [shareMsg, setShareMsg] = useState('');
  const [quickFlash, setQuickFlash] = useState<'home' | 'away' | null>(null);
  const [, setClockTick] = useState(0);
  const lastTapRef = useRef<{ team: 'home' | 'away'; at: number } | null>(null);
  const singleTapTimerRef = useRef<number | null>(null);

  // UI-only tick — real time comes from wall-clock (keeps going if phone sleeps)
  useEffect(() => {
    if (!match || match.status !== 'live' || !match.periodRunning) return;
    const t = window.setInterval(() => setClockTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [match?.status, match?.periodRunning, id]);

  // Keep screen awake during a live running period (when supported)
  useEffect(() => {
    if (!match || match.status !== 'live' || !match.periodRunning) return;
    let wake: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        if ('wakeLock' in navigator) {
          wake = await navigator.wakeLock.request('screen');
        }
      } catch {
        /* unsupported / denied */
      }
    };
    void request();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void wake?.release();
    };
  }, [match?.status, match?.periodRunning]);

  useEffect(() => {
    if (match) void publishLiveMatch(match, players);
  }, [match?.id]);

  const { celebration, notice, dismissCelebration, dismissNotice } = useGoalAlerts(
    match?.id,
    match?.goals,
  );

  const playerName = useMemo(() => {
    const map = new Map(players.map((p) => [p.id, p.name]));
    return (pid?: string) => (pid ? map.get(pid) ?? '?' : undefined);
  }, [players]);

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) window.clearTimeout(singleTapTimerRef.current);
    };
  }, []);

  const onGoalTap = (team: 'home' | 'away') => {
    if (!id) return;
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.team === team && now - last.at < DOUBLE_TAP_MS) {
      if (singleTapTimerRef.current) {
        window.clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current = null;
      addGoal(id, team);
      setQuickFlash(team);
      window.setTimeout(() => setQuickFlash(null), 450);
      return;
    }
    lastTapRef.current = { team, at: now };
    if (singleTapTimerRef.current) window.clearTimeout(singleTapTimerRef.current);
    singleTapTimerRef.current = window.setTimeout(() => {
      lastTapRef.current = null;
      singleTapTimerRef.current = null;
      setGoalTeam(team);
    }, DOUBLE_TAP_MS);
  };

  const share = async () => {
    if (!id) return;
    const url = spectatorUrl(id);
    if (match) await publishLiveMatch(match, players);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${CLUB_SHORT} U11 vs ${match?.opponent ?? ''}`,
          text: 'Volg de match live',
          url,
        });
        setShareMsg('Link gedeeld');
      } else {
        await navigator.clipboard.writeText(url);
        setShareMsg('Link gekopieerd');
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setShareMsg('Link gekopieerd');
      } catch {
        setShareMsg(url);
      }
    }
    window.setTimeout(() => setShareMsg(''), 2500);
  };

  if (!match || !id) {
    return (
      <div className="page">
        <div className="empty">
          Wedstrijd niet gevonden.
          <br />
          <Link to="/wedstrijden">Terug naar wedstrijden</Link>
        </div>
      </div>
    );
  }

  const board = getScoreboard(match);
  const periodLimit = match.periodMinutes * 60;
  const displaySeconds = getMatchElapsedSeconds(match);
  const overtime = displaySeconds > periodLimit;

  return (
    <div className="page page-tight">
      <div className="topbar" style={{ paddingRight: '3.5rem' }}>
        <div>
          <h1>
            {match.status === 'planned' ? 'Wedstrijd' : match.status === 'live' ? 'Live' : 'Uitslag'}
          </h1>
          <div className="sub">
            {match.isHome ? 'Thuis' : 'Uit'} · {match.location || '—'}
          </div>
        </div>
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
            {overtime && match.status === 'live' ? ' · verlenging mogelijk' : ''}
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

      <button
        type="button"
        className="btn btn-secondary btn-block"
        style={{ marginBottom: '0.75rem' }}
        onClick={share}
      >
        {shareMsg || 'Deel volg-link met toeschouwers'}
      </button>

      {match.status === 'planned' && (
        <div className="stack">
          <p style={{ margin: 0, color: '#5a6b5e', fontSize: '0.95rem' }}>
            Standaard {match.totalPeriods} × {match.periodMinutes} min. De timer mag uitlopen — jij
            bepaalt wanneer de volgende periode start.
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => startMatch(id)}>
            Wedstrijd starten
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => navigate('/wedstrijden')}
          >
            Terug
          </button>
        </div>
      )}

      {match.status === 'live' && (
        <>
          <div className="goal-tap">
            <button
              type="button"
              className={`goal-btn home${quickFlash === 'home' ? ' flash' : ''}`}
              onClick={() => onGoalTap('home')}
            >
              Goal {CLUB_SHORT}
              <small>1× details · 2× snel</small>
            </button>
            <button
              type="button"
              className={`goal-btn away${quickFlash === 'away' ? ' flash' : ''}`}
              onClick={() => onGoalTap('away')}
            >
              Goal {match.opponent}
              <small>1× details · 2× snel</small>
            </button>
          </div>

          <div className="btn-row-3" style={{ marginBottom: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => toggleTimer(id)}>
              {match.periodRunning ? 'Pauze' : 'Hervat'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => nextPeriod(id)}>
              {match.currentPeriod >= match.totalPeriods ? 'Einde' : 'Volgende'}
            </button>
            <button type="button" className="btn btn-danger" onClick={() => finishMatch(id)}>
              Stop
            </button>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-block"
            style={{ marginBottom: '0.75rem' }}
            onClick={() => undoLastGoal(id)}
            disabled={match.goals.length === 0}
          >
            Laatste goal ←
          </button>
        </>
      )}

      {match.status === 'finished' && (
        <button
          type="button"
          className="btn btn-secondary btn-block"
          style={{ marginBottom: '0.85rem' }}
          onClick={() => navigate('/stats')}
        >
          Stats
        </button>
      )}

      <div className="events">
        <h3>Goals</h3>
        {match.goals.length === 0 && (
          <div className="empty" style={{ padding: '1.25rem' }}>
            Nog geen goals deze wedstrijd.
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

      {goalTeam && (
        <GoalModal
          matchId={id}
          team={goalTeam}
          teamLabel={goalTeam === 'home' ? CLUB_NAME : match.opponent}
          onClose={() => setGoalTeam(null)}
        />
      )}

      {celebration && (
        <GoalCelebration
          key={celebration.id}
          goal={celebration}
          match={match}
          players={players}
          onClose={dismissCelebration}
        />
      )}
      {!celebration && notice && (
        <OpponentGoalNotice key={notice.id} match={match} onClose={dismissNotice} />
      )}
    </div>
  );
}
