import type { Admin, AppState, GoalEvent, Match, Player, PositionId } from './types';
import { repairMatchGoalClocks } from './matchDisplay';
import { fetchSharedState, publishLiveMatch, publishSharedState } from './sync';
import { freezeTimerFields, getMatchElapsedSeconds } from './time';

const STORAGE_KEY = 'excelsior-u11-v2';
const lastPublishAt = new Map<string, number>();
let remoteUpdatedAt = '';
let syncReady = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let applyingRemote = false;

function maybePublish(id: string, force = false) {
  const m = getMatch(id);
  if (!m) return;
  const now = Date.now();
  const last = lastPublishAt.get(id) ?? 0;
  if (!force && now - last < 2000) return;
  lastPublishAt.set(id, now);
  void publishLiveMatch(m, state.players);
}

const DEFAULT_PLAYERS: Player[] = [
  { id: 'p1', name: 'Jon', active: true },
  { id: 'p2', name: 'Tijs', active: true },
  { id: 'p3', name: 'Felix', active: true },
  { id: 'p4', name: 'Mathis', active: true },
  { id: 'p5', name: 'Quinn', active: true },
  { id: 'p6', name: 'Lenn', active: true },
  { id: 'p7', name: 'Kerim', active: true },
  { id: 'p8', name: 'Adam', active: true },
  { id: 'p9', name: 'Summer', active: true },
  { id: 'p10', name: 'Lars', active: true },
  { id: 'p11', name: 'Jules', active: true },
  { id: 'p12', name: 'Nathan K', active: true },
  { id: 'p13', name: 'Linus', active: true },
  { id: 'p14', name: 'Sepp', active: true },
];

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeMatches(matches: Match[] | undefined): Match[] {
  return (matches ?? []).map((m) => {
    const runningSince =
      m.runningSince ??
      (m.periodRunning && m.status === 'live' ? new Date().toISOString() : null);
    const normalized: Match = {
      ...m,
      lineup: m.lineup ?? {},
      goals: m.goals ?? [],
      runningSince,
    };
    return repairMatchGoalClocks(normalized);
  });
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      return {
        currentUser: parsed.currentUser ?? null,
        players: parsed.players?.length ? parsed.players : DEFAULT_PLAYERS,
        matches: normalizeMatches(parsed.matches),
      };
    }
  } catch {
    /* ignore */
  }
  return { currentUser: null, players: DEFAULT_PLAYERS, matches: [] };
}

let state = load();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function writeLocal() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      currentUser: state.currentUser,
      players: state.players,
      matches: state.matches,
    }),
  );
}

function scheduleRemotePersist() {
  if (applyingRemote || !syncReady) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void publishSharedState(state.players, state.matches).then((saved) => {
      if (saved?.updatedAt) remoteUpdatedAt = saved.updatedAt;
    });
  }, 400);
}

function persist() {
  writeLocal();
  notify();
  scheduleRemotePersist();
}

function applyRemote(players: Player[], matches: Match[], updatedAt: string) {
  applyingRemote = true;
  remoteUpdatedAt = updatedAt;
  state = {
    ...state,
    players: players.length ? players : DEFAULT_PLAYERS,
    matches: normalizeMatches(matches),
  };
  writeLocal();
  notify();
  applyingRemote = false;
}

export async function initSharedSync(): Promise<void> {
  const remote = await fetchSharedState();
  if (remote) {
    if (remote.matches.length > 0 || remote.players.length > 0) {
      const before = JSON.stringify(remote.matches.map((m) => m.goals));
      applyRemote(remote.players, remote.matches, remote.updatedAt);
      const after = JSON.stringify(state.matches.map((m) => m.goals));
      syncReady = true;
      if (before !== after) scheduleRemotePersist();
    } else if (state.matches.length > 0) {
      const saved = await publishSharedState(state.players, state.matches);
      if (saved?.updatedAt) remoteUpdatedAt = saved.updatedAt;
    }
  }
  syncReady = true;

  window.setInterval(() => {
    void pullRemoteIfNewer();
  }, 2500);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void pullRemoteIfNewer();
  });
}

async function pullRemoteIfNewer() {
  if (!syncReady || applyingRemote) return;
  const remote = await fetchSharedState();
  if (!remote?.updatedAt) return;
  if (remote.updatedAt === remoteUpdatedAt) return;
  // Don't overwrite if we still have a pending local save in flight
  if (persistTimer) return;
  applyRemote(remote.players, remote.matches, remote.updatedAt);
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState(): AppState {
  return state;
}

export function login(user: Admin) {
  state = { ...state, currentUser: user };
  persist();
}

export function logout() {
  state = { ...state, currentUser: null };
  persist();
}

export function addPlayer(name: string, number?: number) {
  const player: Player = {
    id: uid('p'),
    name: name.trim(),
    number,
    active: true,
  };
  state = { ...state, players: [...state.players, player] };
  persist();
  return player;
}

export function updatePlayer(id: string, patch: Partial<Player>) {
  state = {
    ...state,
    players: state.players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  };
  persist();
}

export function deletePlayer(id: string) {
  state = { ...state, players: state.players.filter((p) => p.id !== id) };
  persist();
}

export function createMatch(input: {
  opponent: string;
  date: string;
  location: string;
  isHome: boolean;
  periodMinutes?: number;
  totalPeriods?: number;
}) {
  const match: Match = {
    id: uid('m'),
    opponent: input.opponent.trim(),
    date: input.date,
    location: input.location.trim(),
    isHome: input.isHome,
    periodMinutes: input.periodMinutes ?? 15,
    totalPeriods: input.totalPeriods ?? 4,
    status: 'planned',
    currentPeriod: 1,
    elapsedSeconds: 0,
    periodRunning: false,
    runningSince: null,
    homeScore: 0,
    awayScore: 0,
    goals: [],
    lineup: {},
  };
  state = { ...state, matches: [match, ...state.matches] };
  persist();
  maybePublish(match.id, true);
  return match;
}

export function updateMatch(id: string, patch: Partial<Match>, opts?: { forcePublish?: boolean }) {
  state = {
    ...state,
    matches: state.matches.map((m) => (m.id === id ? { ...m, ...patch } : m)),
  };
  persist();
  maybePublish(id, opts?.forcePublish ?? true);
}

export function deleteMatch(id: string) {
  state = { ...state, matches: state.matches.filter((m) => m.id !== id) };
  persist();
  void fetch(`/api/live/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => undefined);
}

export function setLineupSlot(matchId: string, position: PositionId, playerId: string | undefined) {
  const m = getMatch(matchId);
  if (!m) return;
  const lineup = { ...m.lineup };

  if (playerId) {
    for (const key of Object.keys(lineup) as PositionId[]) {
      if (lineup[key] === playerId) delete lineup[key];
    }
    lineup[position] = playerId;
  } else {
    delete lineup[position];
  }

  updateMatch(matchId, { lineup });
}

export function getMatch(id: string): Match | undefined {
  return state.matches.find((m) => m.id === id);
}

export function startMatch(id: string) {
  updateMatch(id, {
    status: 'live',
    periodRunning: true,
    currentPeriod: 1,
    elapsedSeconds: 0,
    runningSince: new Date().toISOString(),
  });
}

export function toggleTimer(id: string) {
  const m = getMatch(id);
  if (!m || m.status !== 'live') return;
  if (m.periodRunning) {
    updateMatch(id, freezeTimerFields(m));
  } else {
    updateMatch(id, {
      periodRunning: true,
      runningSince: new Date().toISOString(),
    });
  }
}

export function nextPeriod(id: string) {
  const m = getMatch(id);
  if (!m) return;
  if (m.currentPeriod >= m.totalPeriods) {
    updateMatch(id, {
      status: 'finished',
      ...freezeTimerFields(m),
    });
    return;
  }
  updateMatch(id, {
    currentPeriod: m.currentPeriod + 1,
    elapsedSeconds: 0,
    periodRunning: false,
    runningSince: null,
  });
}

export function finishMatch(id: string) {
  const m = getMatch(id);
  if (!m) return;
  updateMatch(id, {
    status: 'finished',
    ...freezeTimerFields(m),
  });
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function addGoal(
  matchId: string,
  team: 'home' | 'away',
  scorerId?: string,
  assistId?: string,
) {
  const m = getMatch(matchId);
  if (!m) return;
  const at = getMatchElapsedSeconds(m);

  const goal: GoalEvent = {
    id: uid('g'),
    team,
    scorerId,
    assistId,
    period: m.currentPeriod,
    matchTimeSeconds: at,
    clockLabel: formatClock(at),
    createdAt: new Date().toISOString(),
  };

  updateMatch(matchId, {
    goals: [...m.goals, goal],
    homeScore: team === 'home' ? m.homeScore + 1 : m.homeScore,
    awayScore: team === 'away' ? m.awayScore + 1 : m.awayScore,
  });
}

export function undoLastGoal(matchId: string) {
  const m = getMatch(matchId);
  if (!m || m.goals.length === 0) return;
  const goals = [...m.goals];
  const last = goals.pop()!;
  updateMatch(matchId, {
    goals,
    homeScore: last.team === 'home' ? Math.max(0, m.homeScore - 1) : m.homeScore,
    awayScore: last.team === 'away' ? Math.max(0, m.awayScore - 1) : m.awayScore,
  });
}

export function formatTime(seconds: number): string {
  return formatClock(seconds);
}

export { getMatchElapsedSeconds } from './time';

export type PlayerStats = {
  playerId: string;
  name: string;
  number?: number;
  goals: number;
  assists: number;
};

export type FormResult = 'W' | 'D' | 'L';

export type SeasonStats = {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  form: { result: FormResult; opponent: string; score: string }[];
};

export function getPlayerStats(): PlayerStats[] {
  const map = new Map<string, PlayerStats>();
  for (const p of state.players) {
    map.set(p.id, {
      playerId: p.id,
      name: p.name,
      number: p.number,
      goals: 0,
      assists: 0,
    });
  }
  for (const match of state.matches) {
    if (match.status === 'planned') continue;
    for (const g of match.goals) {
      if (g.team !== 'home') continue;
      if (g.scorerId && map.has(g.scorerId)) {
        map.get(g.scorerId)!.goals += 1;
      }
      if (g.assistId && map.has(g.assistId)) {
        map.get(g.assistId)!.assists += 1;
      }
    }
  }
  return [...map.values()].sort((a, b) => b.goals - a.goals || b.assists - a.assists);
}

export function getSeasonStats(): SeasonStats {
  const finished = [...state.matches]
    .filter((m) => m.status === 'finished')
    .sort((a, b) => a.date.localeCompare(b.date));

  let won = 0;
  let drawn = 0;
  let lost = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  const form: SeasonStats['form'] = [];

  for (const m of finished) {
    goalsFor += m.homeScore;
    goalsAgainst += m.awayScore;
    let result: FormResult;
    if (m.homeScore > m.awayScore) {
      won += 1;
      result = 'W';
    } else if (m.homeScore < m.awayScore) {
      lost += 1;
      result = 'L';
    } else {
      drawn += 1;
      result = 'D';
    }
    form.push({
      result,
      opponent: m.opponent,
      score: `${m.homeScore}–${m.awayScore}`,
    });
  }

  return {
    played: finished.length,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    form: form.slice(-5),
  };
}
