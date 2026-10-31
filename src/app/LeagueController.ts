import type { ArrowData } from '../core/types';
import type { DayClock } from '../daily/dayKey';
import { CHALLENGES_PER_DAY, ENERGY_PER_CHALLENGE, MAX_DAILY_POINTS, type DailyChallenge } from '../league/challenges';
import { collectedIn, points } from '../league/League';
import { league } from '../league/leagues';
import { LEAGUE_UNLOCK_LEVEL, type LeagueService } from '../league/LeagueService';
import { completedCount, type Progress } from '../progress/Progress';
import type { HomeScreen } from '../ui/HomeScreen';
import type { Hud } from '../ui/Hud';
import { noticeKind, noticeText, type LeagueResultDialog } from '../ui/LeagueResultDialog';
import type { LeagueScreen } from '../ui/LeagueScreen';
import type { ProfileScreen } from '../ui/ProfileScreen';
import type { Screens } from '../ui/Screens';
import type { Toast } from '../ui/Toast';
import type { FeedbackEvent } from './Feedback';

/** What the league needs from the rest of the app (a subset of AppParts). */
export interface LeagueParts {
  readonly league: LeagueService;
  readonly dayClock: DayClock;
  readonly screens: Screens;
  readonly toast: Toast;
  readonly feedback: (event: FeedbackEvent) => void;
  readonly hud: Hud;
  readonly home: HomeScreen;
  readonly leagueScreen: LeagueScreen;
  readonly profileScreen: ProfileScreen;
  readonly leagueResult: LeagueResultDialog;
}

/** The app state the league reads (owned by App). */
export interface LeagueHost {
  /** The Daily League challenge loaded on the game screen, or null for a regular level. */
  challenge(): DailyChallenge | null;
  /** True while the open attempt is a challenge. */
  attemptIsChallenge(): boolean;
  /** True once Level 10 is completed. */
  unlocked(): boolean;
  progress(): Progress;
  /** True while something covers the screen a notice would appear on (a transition, the startup intro). */
  busy(): boolean;
}

/**
 * The Daily League as the app shows it: settling days, awarding Energy
 * Points as Energy Arrows leave, the result notices, and the league parts
 * of Home, the League screen, Profile and the challenge HUD. Rules live in
 * league/League.ts; this class only sequences and renders.
 */
export class LeagueController {
  constructor(
    private readonly parts: LeagueParts,
    private readonly host: LeagueHost,
  ) {}

  /** Settles finished league days and opens today's (idempotent), then shows any new result. */
  settle(): void {
    const today = this.parts.dayClock.today;
    this.parts.league.settle(today, this.host.unlocked());
    const challenge = this.host.challenge();
    if (challenge && challenge.date !== today && this.parts.screens.active === 'game') {
      this.parts.toast.show('A new league day has started: this challenge no longer earns points', 2600);
    }
    this.showNotice();
  }

  /** The rules removed an arrow: if it is an Energy Arrow in a challenge, award its point now (saved at once). */
  collect(arrow: ArrowData): void {
    const challenge = this.host.challenge();
    if (!challenge || !this.host.attemptIsChallenge() || !arrow.energy) return;
    const status = this.parts.league.collect(this.parts.dayClock.refresh(), challenge, arrow.id);
    if (status === 'awarded') this.parts.feedback({ type: 'energy' });
  }

  /** The next challenge to offer after the current one: the next unfinished number, wrapping around; null when all are done. */
  nextChallengeNumber(completed: readonly number[]): number | null {
    for (let n = (this.host.challenge()?.number ?? 0) + 1; n <= CHALLENGES_PER_DAY; n++) if (!completed.includes(n)) return n;
    for (let n = 1; n <= CHALLENGES_PER_DAY; n++) if (!completed.includes(n)) return n;
    return null;
  }

  renderChallengeHud(): void {
    const ch = this.host.challenge();
    if (!ch) {
      this.parts.hud.setChallenge(null);
      return;
    }
    const state = this.parts.league.current;
    this.parts.hud.setChallenge({
      number: ch.number,
      collected: collectedIn(state, ch),
      perChallenge: ENERGY_PER_CHALLENGE,
      today: state.current?.date === ch.date ? points(state.current) : 0,
      maxToday: MAX_DAILY_POINTS,
      leagueName: league(state.tier).name,
    });
  }

  render(): void {
    const { league: service, dayClock, home, leagueScreen, profileScreen } = this.parts;
    const state = service.current;
    const today = dayClock.today;
    const unlocked = this.host.unlocked();
    const live = state.current?.date === today ? state.current : null;
    const todayPoints = unlocked ? points(live) : 0;
    const levelsDone = Math.min(LEAGUE_UNLOCK_LEVEL, completedCount(this.host.progress(), LEAGUE_UNLOCK_LEVEL));
    home.renderLeague({ unlocked, levelsDone, unlockAt: LEAGUE_UNLOCK_LEVEL, tier: state.tier, today: todayPoints, maxToday: MAX_DAILY_POINTS });
    leagueScreen.render({
      unlocked,
      levelsDone,
      unlockAt: LEAGUE_UNLOCK_LEVEL,
      tier: state.tier,
      today: todayPoints,
      maxToday: MAX_DAILY_POINTS,
      perChallenge: ENERGY_PER_CHALLENGE,
      challenges: service.challenges(today).map((challenge) => ({
        challenge,
        collected: collectedIn(state, challenge),
        completed: live?.completed.includes(challenge.number) ?? false,
      })),
      history: state.history,
      clockBack: state.lastDay !== null && today < state.lastDay,
    });
    profileScreen.renderLeague(state);
    this.renderChallengeHud();
  }

  /**
   * Shows what settling changed, once: a dialog for a promotion or a move
   * down, a short toast when the league was simply kept. Never during play,
   * and never twice (acknowledging clears it from the saved record).
   */
  showNotice(): void {
    const { league: service, leagueResult, screens, toast, feedback } = this.parts;
    const notice = service.current.notice;
    if (!notice || this.host.busy() || screens.active === 'game' || leagueResult.isOpen) return;
    const kind = noticeKind(notice);
    if (kind === 'retained') {
      toast.show(noticeText(notice), 3200);
      service.acknowledge();
      return;
    }
    leagueResult.show(notice, () => service.acknowledge());
    if (kind === 'promoted') feedback({ type: 'promoted' });
  }
}
