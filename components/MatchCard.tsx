"use client";

import { useState } from "react";

type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  stage: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  aetHomeScore?: number | null;
  aetAwayScore?: number | null;
  penaltyWinner?: string | null;
  bets?: {
    predictedHome: number;
    predictedAway: number;
    predictedETHome?: number | null;
    predictedETAway?: number | null;
    predictedPenaltyWinner?: string | null;
  }[];
};

const STAGE_LABELS: Record<string, string> = {
  GROUP: "Phase de groupes",
  ROUND_OF_32: "16èmes de finale",
  ROUND_OF_16: "Huitièmes de finale",
  QUARTER_FINAL: "Quarts de finale",
  SEMI_FINAL: "Demi-finales",
  THIRD_PLACE: "Petite finale",
  FINAL: "Finale",
};

const KNOCKOUT_STAGES = new Set([
  "ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "THIRD_PLACE", "FINAL",
]);

export default function MatchCard({
  match,
  userId,
  onBetSaved,
  noBorder = false,
}: {
  match: Match;
  userId: string;
  onBetSaved?: () => void;
  noBorder?: boolean;
}) {
  const existingBet = match.bets?.[0];
  const isKnockout = KNOCKOUT_STAGES.has(match.stage);

  const [home, setHome] = useState(existingBet?.predictedHome?.toString() ?? "");
  const [away, setAway] = useState(existingBet?.predictedAway?.toString() ?? "");
  const [etHome, setEtHome] = useState(existingBet?.predictedETHome?.toString() ?? "");
  const [etAway, setEtAway] = useState(existingBet?.predictedETAway?.toString() ?? "");
  const [tabWinner, setTabWinner] = useState(existingBet?.predictedPenaltyWinner ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const kickoff = new Date(match.kickoffAt);
  const locked = new Date() >= kickoff || match.status !== "UPCOMING";
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const hasAET = match.aetHomeScore !== null && match.aetAwayScore !== null && match.aetHomeScore !== undefined;
  const hasPenalties = !!match.penaltyWinner;

  // Saisie : nul à 90 min prédit → montrer les champs ET
  const predictedDraw = home !== "" && away !== "" && home === away;
  // Saisie : nul en prolongation prédit → montrer le sélecteur TAB
  const predictedETDraw = etHome !== "" && etAway !== "" && etHome === etAway;

  async function handleSave() {
    if (home === "" || away === "") return;
    if (isKnockout && predictedDraw && (etHome === "" || etAway === "")) return;
    setSaving(true);

    await fetch("/api/bets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        matchId: match.id,
        predictedHome: Number(home),
        predictedAway: Number(away),
        predictedETHome: isKnockout && predictedDraw ? Number(etHome) : null,
        predictedETAway: isKnockout && predictedDraw ? Number(etAway) : null,
        predictedPenaltyWinner:
          isKnockout && predictedDraw && predictedETDraw ? tabWinner || null : null,
      }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onBetSaved?.();
  }

  return (
    <div className={`bg-gray-900 p-4 ${noBorder ? "" : "rounded-xl border border-gray-700 shadow-sm"}`}>
      {/* En-tête */}
      <div className="text-xs text-gray-400 mb-2 flex justify-between">
        <span>{STAGE_LABELS[match.stage] ?? match.stage}</span>
        <span>
          {kickoff.toLocaleDateString("fr-FR", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* Score 90 min */}
      <div className="flex items-center gap-3 justify-between">
        <span className="font-semibold text-right w-1/3">{match.homeTeam}</span>

        <div className="flex items-center gap-2">
          {locked && hasScore ? (
            <>
              <span className="w-12 text-center text-2xl font-bold">{match.homeScore}</span>
              <span className="text-gray-400 font-bold">–</span>
              <span className="w-12 text-center text-2xl font-bold">{match.awayScore}</span>
            </>
          ) : locked ? (
            <>
              <span className="w-12 text-center text-lg font-bold text-gray-500">?</span>
              <span className="text-gray-400 font-bold">–</span>
              <span className="w-12 text-center text-lg font-bold text-gray-500">?</span>
            </>
          ) : (
            <>
              <input
                type="number" min={0} max={99} value={home}
                onChange={(e) => { setHome(e.target.value); setEtHome(""); setEtAway(""); setTabWinner(""); }}
                className="w-12 text-center border border-gray-600 rounded-lg py-1 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <span className="text-gray-400 font-bold">–</span>
              <input
                type="number" min={0} max={99} value={away}
                onChange={(e) => { setAway(e.target.value); setEtHome(""); setEtAway(""); setTabWinner(""); }}
                className="w-12 text-center border border-gray-600 rounded-lg py-1 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </>
          )}
        </div>

        <span className="font-semibold text-left w-1/3">{match.awayTeam}</span>
      </div>

      {/* Prolongations (si match knockout) */}
      {isKnockout && (
        <>
          {/* Résultat réel AET (après le match) */}
          {locked && hasAET && (
            <div className="mt-2 flex items-center justify-center gap-2 text-sm text-gray-400">
              <span>Prolong. :</span>
              <span className="font-semibold text-gray-200">
                {match.aetHomeScore} – {match.aetAwayScore}
              </span>
              {hasPenalties && (
                <span className="ml-1">
                  · TAB : <span className="font-semibold text-gray-200">
                    {match.penaltyWinner === "home" ? match.homeTeam : match.awayTeam}
                  </span>
                </span>
              )}
            </div>
          )}

          {/* Saisie ET (uniquement si nul prédit à 90 min, match non verrouillé) */}
          {!locked && predictedDraw && (
            <div className="mt-3 border-t border-gray-800 pt-3">
              <p className="text-xs text-gray-400 text-center mb-2">Prolongations</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs text-gray-500 w-1/3 text-right">{match.homeTeam}</span>
                <input
                  type="number" min={0} max={99} value={etHome}
                  onChange={(e) => { setEtHome(e.target.value); setTabWinner(""); }}
                  className="w-12 text-center border border-gray-600 rounded-lg py-1 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <span className="text-gray-400 font-bold">–</span>
                <input
                  type="number" min={0} max={99} value={etAway}
                  onChange={(e) => { setEtAway(e.target.value); setTabWinner(""); }}
                  className="w-12 text-center border border-gray-600 rounded-lg py-1 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <span className="text-xs text-gray-500 w-1/3">{match.awayTeam}</span>
              </div>

              {/* Saisie TAB (si nul prédit en prolongation aussi) */}
              {predictedETDraw && (
                <div className="mt-2">
                  <p className="text-xs text-gray-400 text-center mb-1.5">Vainqueur aux TAB</p>
                  <div className="flex justify-center gap-2">
                    {[
                      { value: "home", label: match.homeTeam },
                      { value: "away", label: match.awayTeam },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTabWinner(value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                          tabWinner === value
                            ? "bg-red-700 border-red-600 text-white"
                            : "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Bouton sauvegarder */}
      {!locked && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={handleSave}
            disabled={
              saving ||
              home === "" || away === "" ||
              (isKnockout && predictedDraw && (etHome === "" || etAway === ""))
            }
            className="text-sm px-4 py-1.5 bg-red-700 text-white rounded-lg hover:bg-red-800 disabled:opacity-40 transition"
          >
            {saving ? "Enregistrement…" : saved ? "✓ Enregistré" : existingBet ? "Modifier" : "Parier"}
          </button>
        </div>
      )}

      {/* Résumé du pari (verrouillé) */}
      {locked && existingBet && (
        <div className="mt-2 text-center text-sm text-gray-400">
          <span>
            Ton pari : {existingBet.predictedHome} – {existingBet.predictedAway}
          </span>
          {isKnockout && existingBet.predictedETHome !== null && existingBet.predictedETHome !== undefined && (
            <span className="ml-2">
              · Prolong. : {existingBet.predictedETHome} – {existingBet.predictedETAway}
            </span>
          )}
          {isKnockout && existingBet.predictedPenaltyWinner && (
            <span className="ml-2">
              · TAB : {existingBet.predictedPenaltyWinner === "home" ? match.homeTeam : match.awayTeam}
            </span>
          )}
        </div>
      )}
      {locked && !existingBet && (
        <p className="text-center text-sm text-red-400 mt-2">Pas de pari soumis</p>
      )}
    </div>
  );
}
