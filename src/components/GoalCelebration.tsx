import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { CLUB_CONFETTI_COLORS, CLUB_NAME } from '../club';
import { getScoreboard } from '../matchDisplay';
import type { GoalEvent, Match, Player } from '../types';

const CELEBRATION_MS = 5600;
const NOTICE_MS = 3400;
const CONFETTI_COLORS: string[] = [...CLUB_CONFETTI_COLORS];

type PlayerBits = Pick<Player, 'id' | 'name' | 'number'>;

type CelebrationProps = {
  goal: GoalEvent;
  match: Match;
  players: PlayerBits[];
  onClose: () => void;
};

type NoticeProps = {
  match: Match;
  onClose: () => void;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function burst(
  particleCount: number,
  origin: { x: number; y: number },
  angle: number,
  spread: number,
) {
  void confetti({
    particleCount,
    spread,
    angle,
    origin,
    startVelocity: 42,
    gravity: 0.95,
    ticks: 230,
    scalar: 0.95,
    colors: CONFETTI_COLORS,
    disableForReducedMotion: true,
    zIndex: 90,
  });
}

export function GoalCelebration({ goal, match, players, onClose }: CelebrationProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const scorer = goal.scorerId ? players.find((player) => player.id === goal.scorerId) : undefined;
  const assist = goal.assistId ? players.find((player) => player.id === goal.assistId) : undefined;
  const board = getScoreboard(match);
  const ourSide = match.isHome ? 'left' : 'right';
  const displayName = scorer?.name ?? CLUB_NAME;
  const shirt = scorer?.number;

  const label = scorer
    ? `Goal! ${scorer.name}${shirt != null ? `, nummer ${shirt}` : ''}. Stand ${board.leftScore} ${board.rightScore}. Tik om te sluiten.`
    : `Goal! Stand ${board.leftScore} ${board.rightScore}. Tik om te sluiten.`;

  useEffect(() => {
    buttonRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(onClose, CELEBRATION_MS);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    burst(80, { x: 0.5, y: 0.42 }, 90, 110);
    burst(32, { x: 0.05, y: 0.7 }, 60, 55);
    burst(32, { x: 0.95, y: 0.7 }, 120, 55);

    const followUp = window.setTimeout(() => {
      burst(26, { x: 0.18, y: 0.55 }, 68, 50);
      burst(26, { x: 0.82, y: 0.55 }, 112, 50);
    }, 420);
    const finale = window.setTimeout(() => {
      burst(48, { x: 0.5, y: 0.28 }, 90, 130);
    }, 880);

    return () => {
      window.clearTimeout(followUp);
      window.clearTimeout(finale);
      confetti.reset();
    };
  }, []);

  return createPortal(
    <button
      ref={buttonRef}
      type="button"
      className="goal-celeb"
      data-testid="goal-celebration"
      aria-label={label}
      onClick={onClose}
    >
      <span className="goal-celeb-inner">
        <img
          className="goal-celeb-logo"
          src="/logo-excelsior-mariaburg.png"
          alt=""
          width={92}
          height={92}
        />
        <span className="goal-celeb-word">GOAL!</span>
        <span className={`goal-celeb-player${scorer ? '' : ' club-only'}`}>
          {shirt != null && <span className="goal-celeb-shirt">{shirt}</span>}
          <span className="goal-celeb-name">{displayName}</span>
          {assist && <span className="goal-celeb-assist">Assist {assist.name}</span>}
        </span>
        <span className="goal-celeb-board">
          <span className="goal-celeb-team">{board.leftName}</span>
          <span className="goal-celeb-points">
            <span className={ourSide === 'left' ? 'ours' : undefined}>{board.leftScore}</span>
            <span className="goal-celeb-colon">:</span>
            <span className={ourSide === 'right' ? 'ours' : undefined}>{board.rightScore}</span>
          </span>
          <span className="goal-celeb-team">{board.rightName}</span>
        </span>
        <span className="goal-celeb-when">
          Periode {goal.period} · {goal.clockLabel}
        </span>
        <span className="goal-celeb-hint">Tik om te sluiten</span>
      </span>
      <span className="goal-celeb-timer" style={{ animationDuration: `${CELEBRATION_MS}ms` }} />
    </button>,
    document.body,
  );
}

export function OpponentGoalNotice({ match, onClose }: NoticeProps) {
  const board = getScoreboard(match);

  useEffect(() => {
    const timer = window.setTimeout(onClose, NOTICE_MS);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <button
      type="button"
      className="goal-notice"
      data-testid="opponent-goal-notice"
      aria-label={`Tegengoal ${match.opponent}. Stand ${board.leftScore} ${board.rightScore}. Tik om te sluiten.`}
      onClick={onClose}
    >
      <span className="goal-notice-copy">
        <span className="goal-notice-kicker">Tegengoal</span>
        <strong>{match.opponent}</strong>
      </span>
      <span className="goal-notice-score">
        {board.leftScore}–{board.rightScore}
      </span>
    </button>,
    document.body,
  );
}
