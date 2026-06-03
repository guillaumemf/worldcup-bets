/**
 * Calcule les points obtenus pour un pari.
 * Les règles de points sont configurables par ligue.
 */
export function calculatePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
  rules = { exactScore: 3, correctDiff: 2, correctWinner: 1 }
): number {
  // Score exact
  if (predictedHome === actualHome && predictedAway === actualAway) {
    return rules.exactScore;
  }

  const predictedDiff = predictedHome - predictedAway;
  const actualDiff = actualHome - actualAway;
  const predictedWinner = Math.sign(predictedDiff);
  const actualWinner = Math.sign(actualDiff);

  // Bon vainqueur + bonne différence de buts
  if (predictedDiff === actualDiff) {
    return rules.correctDiff;
  }

  // Bon vainqueur (ou nul correct)
  if (predictedWinner === actualWinner) {
    return rules.correctWinner;
  }

  return 0;
}
