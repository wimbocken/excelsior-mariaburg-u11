import type { Match } from './types';

/** Elapsed period time using wall-clock so it keeps going if the phone sleeps */
export function getMatchElapsedSeconds(m: Match, now = Date.now()): number {
  if (m.periodRunning && m.runningSince) {
    const started = new Date(m.runningSince).getTime();
    if (!Number.isNaN(started)) {
      return m.elapsedSeconds + Math.max(0, Math.floor((now - started) / 1000));
    }
  }
  return m.elapsedSeconds;
}

export function freezeTimerFields(m: Match, now = Date.now()): Pick<Match, 'elapsedSeconds' | 'periodRunning' | 'runningSince'> {
  return {
    elapsedSeconds: getMatchElapsedSeconds(m, now),
    periodRunning: false,
    runningSince: null,
  };
}
