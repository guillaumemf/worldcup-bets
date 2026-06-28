/**
 * Calcule les points obtenus pour un pari — phase de groupes.
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

/**
 * Calcule les points pour un pari — phase éliminatoire (à partir des 16èmes).
 *
 * Barème :
 *   Base 90 min :
 *     - Score exact → exactScore pts (défaut 4)
 *     - Bon vainqueur / bon nul (mauvais score) → correctOutcome pts (défaut 2)
 *   Bonus prolongations (si le match a eu des prolong. ET le joueur avait prédit nul) :
 *     - Score exact en prolong. → +etExact pts (défaut 2)  [remplace etBonus]
 *     - Bon vainqueur / bon nul en prolong. → +etBonus pts (défaut 1)
 *   Bonus TAB (si penalties ET le joueur avait prédit le bon vainqueur TAB) :
 *     - +tabBonus pts (défaut 1)
 */
export function calculateKnockoutPoints(
  // Prédiction 90 min
  predictedHome: number,
  predictedAway: number,
  // Résultat 90 min
  actualHome: number,
  actualAway: number,
  // Prédiction prolongations (rempli seulement si le joueur a prédit nul à 90 min)
  predictedETHome: number | null,
  predictedETAway: number | null,
  // Prédiction vainqueur TAB (rempli seulement si le joueur a prédit nul en prolong.)
  predictedPenaltyWinner: string | null,
  // Résultat prolongations réel (null si pas de prolong.)
  aetHome: number | null,
  aetAway: number | null,
  // Vainqueur réel aux TAB (null si pas de TAB)
  penaltyWinner: string | null,
  rules = {
    exactScore: 4,
    correctOutcome: 2,
    etBonus: 1,
    etExact: 2,
    tabBonus: 1,
  }
): number {
  let points = 0;
  const predictedDraw90 = predictedHome === predictedAway;
  const actualDraw90 = actualHome === actualAway;
  const hasET = aetHome !== null && aetAway !== null;

  // ── Base 90 min ──────────────────────────────────────────────
  if (predictedHome === actualHome && predictedAway === actualAway) {
    points += rules.exactScore;
  } else if (predictedDraw90 && actualDraw90) {
    // Bon nul, mauvais score
    points += rules.correctOutcome;
  } else if (!predictedDraw90 && !actualDraw90) {
    // Deux victoires : vérifier même vainqueur
    const predWinner = predictedHome > predictedAway ? "home" : "away";
    const actWinner = actualHome > actualAway ? "home" : "away";
    if (predWinner === actWinner) {
      points += rules.correctOutcome;
    }
  }
  // Mauvaise issue (prédit nul mais victoire, ou vice versa) → 0

  // ── Bonus prolongations ───────────────────────────────────────
  // S'applique seulement si : match allé en prolong. + joueur avait prédit nul à 90 min
  if (hasET && predictedDraw90 && predictedETHome !== null && predictedETAway !== null) {
    if (predictedETHome === aetHome && predictedETAway === aetAway) {
      // Score exact en prolongation
      points += rules.etExact;
    } else {
      const predictedETDraw = predictedETHome === predictedETAway;
      const actualETDraw = aetHome === aetAway; // nul en prolong. = match va aux TAB

      if (predictedETDraw === actualETDraw) {
        if (!predictedETDraw) {
          // Les deux non-nul : même vainqueur en prolong. ?
          const predETWinner = predictedETHome > predictedETAway ? "home" : "away";
          const actETWinner = (aetHome as number) > (aetAway as number) ? "home" : "away";
          if (predETWinner === actETWinner) {
            points += rules.etBonus;
          }
        } else {
          // Les deux ont prédit nul en prolong. (et effectivement nul → TAB)
          points += rules.etBonus;
        }
      }
    }
  }

  // ── Bonus TAB ─────────────────────────────────────────────────
  if (penaltyWinner && predictedPenaltyWinner && predictedPenaltyWinner === penaltyWinner) {
    points += rules.tabBonus;
  }

  return points;
}

/** Stages qui suivent le barème knockout */
export const KNOCKOUT_STAGES = new Set([
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
]);
