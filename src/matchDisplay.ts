import { CLUB_NAME } from './club';
import type { GoalEvent, Match } from './types';

/** Played time per period */
const PLAY_SECS = 15 * 60;
/** Rest between periods */
const REST_SECS = 2 * 60;
/** Gaps longer than this = phone sleep / app closed */
const PHONE_PAUSE_SECS = 10 * 60;

export const CLOCK_REPAIR_VERSION = 2;

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Map session wall time (play + 2' rests, no phone-sleep) → period clock */
function sessionWallToPeriodClock(sessionWallSec: number): {
  period: number;
  periodClock: number;
  matchSeconds: number;
} {
  let rem = Math.max(0, sessionWallSec);
  let matchSeconds = 0;

  for (let p = 1; p <= 4; p++) {
    const playTake = Math.min(rem, PLAY_SECS);
    matchSeconds += playTake;
    rem -= playTake;
    if (rem <= 0) {
      return {
        period: p,
        periodClock: matchSeconds - (p - 1) * PLAY_SECS,
        matchSeconds,
      };
    }
    if (p < 4) {
      rem -= Math.min(rem, REST_SECS);
      if (rem <= 0) {
        // Rust voorbij → start volgende periode
        return {
          period: p + 1,
          periodClock: 0,
          matchSeconds,
        };
      }
    } else {
      // Extra wall time = overtime in P4
      matchSeconds += rem;
      return {
        period: 4,
        periodClock: matchSeconds - 3 * PLAY_SECS,
        matchSeconds,
      };
    }
  }

  return { period: 4, periodClock: matchSeconds - 3 * PLAY_SECS, matchSeconds };
}

/**
 * Rebuild goal clocks from createdAt.
 * Model: 4 × 15' with ~2' rust between periods.
 * Long gaps (gsm dicht) tellen niet mee als speeltijd.
 */
export function reconstructGoalTimes(goals: GoalEvent[]): GoalEvent[] {
  if (goals.length === 0) return goals;

  const sorted = [...goals].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const first = sorted[0];
  let sessionWall = Math.max(0, first.matchTimeSeconds);
  let lastEventMs =
    new Date(first.createdAt).getTime() - Math.max(0, first.matchTimeSeconds) * 1000;

  const out: GoalEvent[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const g = sorted[i];
    const at = new Date(g.createdAt).getTime();
    const wallGap = Math.max(0, Math.floor((at - lastEventMs) / 1000));

    if (i === 0) {
      sessionWall = Math.max(0, g.matchTimeSeconds);
    } else if (wallGap > PHONE_PAUSE_SECS) {
      const block = PLAY_SECS + REST_SECS;
      const skipped = Math.max(1, Math.min(3, Math.floor(wallGap / block)));
      const current = sessionWallToPeriodClock(sessionWall);
      const targetPeriod = Math.min(4, current.period + skipped);
      // Start of that period on the session timeline, then residual play after wake
      sessionWall = (targetPeriod - 1) * block;
      const residual = wallGap - skipped * block;
      if (residual > 0) {
        sessionWall += Math.min(residual, PLAY_SECS + 5 * 60);
      }
    } else {
      sessionWall += wallGap;
    }

    const { period, periodClock } = sessionWallToPeriodClock(sessionWall);

    out.push({
      ...g,
      period,
      matchTimeSeconds: Math.max(0, periodClock),
      clockLabel: formatClock(Math.max(0, periodClock)),
    });

    lastEventMs = at;
  }

  return out;
}

export function repairMatchGoalClocks(match: Match): Match {
  if (!match.goals?.length) return match;
  const needsRepair =
    (match as Match & { clockRepairVersion?: number }).clockRepairVersion !== CLOCK_REPAIR_VERSION;
  if (!needsRepair) return match;
  return {
    ...match,
    goals: reconstructGoalTimes(match.goals),
    clockRepairVersion: CLOCK_REPAIR_VERSION,
  } as Match;
}

export function getScoreboard(match: Match) {
  if (match.isHome) {
    return {
      leftName: CLUB_NAME,
      rightName: match.opponent,
      leftScore: match.homeScore,
      rightScore: match.awayScore,
    };
  }
  return {
    leftName: match.opponent,
    rightName: CLUB_NAME,
    leftScore: match.awayScore,
    rightScore: match.homeScore,
  };
}

export function formatMatchScoreLine(match: Match): string {
  const b = getScoreboard(match);
  return `${b.leftName} ${b.leftScore}–${b.rightScore} ${b.rightName}`;
}
