import type { GameSnapshot } from '../core/types';

/** An attempt has something to lose once the player has made a move or a mistake and the level is still going. */
export function hasProgress(snapshot: Pick<GameSnapshot, 'moves' | 'mistakes'>, isPlaying: boolean): boolean {
  return isPlaying && (snapshot.moves > 0 || snapshot.mistakes > 0);
}

/** Restart asks first only with "Confirm restart" on and progress to lose; an untouched level restarts at once. */
export function restartNeedsConfirm(snapshot: Pick<GameSnapshot, 'moves' | 'mistakes'>, isPlaying: boolean, confirmRestart: boolean): boolean {
  return confirmRestart && hasProgress(snapshot, isPlaying);
}
