export type Admin = 'Rian' | 'Wim';

export interface Player {
  id: string;
  name: string;
  number?: number;
  active: boolean;
}

export type PositionId =
  | 'keeper'
  | 'linksVerdediger'
  | 'centraleVerdediger'
  | 'rechtsVerdediger'
  | 'linkerFlank'
  | 'centraalMidden'
  | 'rechterFlank'
  | 'spits';

export type Lineup = Partial<Record<PositionId, string>>;

export const POSITIONS: { id: PositionId; label: string; short: string }[] = [
  { id: 'keeper', label: 'Keeper', short: 'KEEP' },
  { id: 'linksVerdediger', label: 'Links verdediger', short: 'LV' },
  { id: 'centraleVerdediger', label: 'Centrale verdediger', short: 'CV' },
  { id: 'rechtsVerdediger', label: 'Rechts verdediger', short: 'RV' },
  { id: 'linkerFlank', label: 'Linker flank', short: 'LF' },
  { id: 'centraalMidden', label: 'Centraal middenvelder', short: 'CM' },
  { id: 'rechterFlank', label: 'Rechter flank', short: 'RF' },
  { id: 'spits', label: 'Spits', short: 'SP' },
];

export interface GoalEvent {
  id: string;
  team: 'home' | 'away';
  scorerId?: string;
  assistId?: string;
  period: number;
  matchTimeSeconds: number;
  clockLabel: string;
  createdAt: string;
}

export interface Match {
  id: string;
  opponent: string;
  date: string;
  location: string;
  isHome: boolean;
  periodMinutes: number;
  totalPeriods: number;
  status: 'planned' | 'live' | 'finished';
  currentPeriod: number;
  /** Accumulated seconds while paused / frozen */
  elapsedSeconds: number;
  periodRunning: boolean;
  /** ISO time when the current running segment started (wall-clock) */
  runningSince: string | null;
  homeScore: number;
  awayScore: number;
  goals: GoalEvent[];
  lineup: Lineup;
  notes?: string;
  /** Bumps when goal clocks are recalculated from createdAt */
  clockRepairVersion?: number;
}

export interface AppState {
  currentUser: Admin | null;
  players: Player[];
  matches: Match[];
}
