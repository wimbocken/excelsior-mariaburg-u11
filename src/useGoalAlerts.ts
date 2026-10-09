import { useCallback, useEffect, useRef, useState } from 'react';
import type { GoalEvent } from './types';

type SeenGoals = {
  matchId: string;
  ids: Set<string>;
};

/**
 * Fires when a goal id appears that was not in the first snapshot for this match.
 * Opening a match that already has goals does not replay them — only goals that
 * arrive afterwards (local save on the coach screen, or a live poll on the
 * spectator screen) raise an alert.
 */
export function useGoalAlerts(matchId: string | undefined, goals: GoalEvent[] | undefined) {
  const seen = useRef<SeenGoals | null>(null);
  const [celebration, setCelebration] = useState<GoalEvent | null>(null);
  const [notice, setNotice] = useState<GoalEvent | null>(null);
  const [trackedMatchId, setTrackedMatchId] = useState(matchId);

  if (matchId !== trackedMatchId) {
    setTrackedMatchId(matchId);
    setCelebration(null);
    setNotice(null);
  }

  if (celebration && goals && !goals.some((goal) => goal.id === celebration.id)) {
    setCelebration(null);
  }
  if (notice && goals && !goals.some((goal) => goal.id === notice.id)) {
    setNotice(null);
  }

  useEffect(() => {
    if (!matchId || !goals) return;

    if (!seen.current || seen.current.matchId !== matchId) {
      seen.current = { matchId, ids: new Set(goals.map((goal) => goal.id)) };
      return;
    }

    const fresh = goals.filter((goal) => !seen.current!.ids.has(goal.id));
    if (fresh.length === 0) return;

    for (const goal of fresh) seen.current.ids.add(goal.id);

    const home = [...fresh].reverse().find((goal) => goal.team === 'home');
    if (home) {
      setNotice(null);
      setCelebration(home);
      return;
    }

    const away = [...fresh].reverse().find((goal) => goal.team === 'away');
    if (away) setNotice(away);
  }, [matchId, goals]);

  const dismissCelebration = useCallback(() => setCelebration(null), []);
  const dismissNotice = useCallback(() => setNotice(null), []);

  return { celebration, notice, dismissCelebration, dismissNotice };
}
