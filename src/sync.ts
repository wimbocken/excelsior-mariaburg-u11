import type { Match, Player } from './types';

export type PublicLivePayload = {
  match: Match;
  players: Pick<Player, 'id' | 'name' | 'number'>[];
  updatedAt: string;
};

export type SharedAppState = {
  players: Player[];
  matches: Match[];
  updatedAt: string;
};

export async function publishLiveMatch(match: Match, players: Player[]): Promise<void> {
  const payload: PublicLivePayload = {
    match,
    players: players.map((p) => ({ id: p.id, name: p.name, number: p.number })),
    updatedAt: new Date().toISOString(),
  };

  try {
    await fetch(`/api/live/${encodeURIComponent(match.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    /* ignore */
  }
}

export async function fetchLiveMatch(id: string): Promise<PublicLivePayload | null> {
  try {
    const res = await fetch(`/api/live/${encodeURIComponent(id)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicLivePayload;
  } catch {
    return null;
  }
}

export async function fetchSharedState(): Promise<SharedAppState | null> {
  try {
    const res = await fetch('/api/state', { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as SharedAppState;
  } catch {
    return null;
  }
}

export async function publishSharedState(
  players: Player[],
  matches: Match[],
): Promise<SharedAppState | null> {
  try {
    const res = await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players, matches }),
    });
    if (!res.ok) return null;
    return (await res.json()) as SharedAppState;
  } catch {
    return null;
  }
}

export function spectatorUrl(matchId: string): string {
  return `${window.location.origin}/volgen/${matchId}`;
}
