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
  bets?: { predictedHome: number; predictedAway: number }[];
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
  const [home, setHome] = useState(existingBet?.predictedHome ?? "");
  const [away, setAway] = useState(existingBet?.predictedAway ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const kickoff = new Date(match.kickoffAt);
  const locked = new Date() >= kickoff || match.status !== "UPCOMING";
  const hasScore = match.homeScore !== null && match.awayScore !== null;

  async function handleSave() {
    if (home === "" || away === "") return;
    setSaving(true);

    await fetch("/api/bets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        matchId: match.id,
        predictedHome: Number(home),
        predictedAway: Number(away),
      }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onBetSaved?.();
  }

  return (
    <div className={`bg-gray-900 p-4 ${noBorder ? "" : "rounded-xl border border-gray-700 shadow-sm"}`}>
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

      <div className="flex items-center gap-3 justify-between">
        <span className="font-semibold text-right w-1/3">{match.homeTeam}</span>

        <div className="flex items-center gap-2">
          {locked && hasScore ? (
            /* Score réel du match */
            <>
              <span className="w-12 text-center text-2xl font-bold">{match.homeScore}</span>
              <span className="text-gray-400 font-bold">–</span>
              <span className="w-12 text-center text-2xl font-bold">{match.awayScore}</span>
            </>
          ) : locked ? (
            /* Match verrouillé mais pas encore de score */
            <>
              <span className="w-12 text-center text-lg font-bold text-gray-500">?</span>
              <span className="text-gray-400 font-bold">–</span>
              <span className="w-12 text-center text-lg font-bold text-gray-500">?</span>
            </>
          ) : (
            /* Match ouvert — saisie du pari */
            <>
              <input
                type="number"
                min={0}
                max={99}
                value={home}
                onChange={(e) => setHome(e.target.value)}
                className="w-12 text-center border border-gray-600 rounded-lg py-1 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <span className="text-gray-400 font-bold">–</span>
              <input
                type="number"
                min={0}
                max={99}
                value={away}
                onChange={(e) => setAway(e.target.value)}
                className="w-12 text-center border border-gray-600 rounded-lg py-1 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </>
          )}
        </div>

        <span className="font-semibold text-left w-1/3">{match.awayTeam}</span>
      </div>

      {!locked && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={handleSave}
            disabled={saving || home === "" || away === ""}
            className="text-sm px-4 py-1.5 bg-red-700 text-white rounded-lg hover:bg-red-800 disabled:opacity-40 transition"
          >
            {saving ? "Enregistrement…" : saved ? "✓ Enregistré" : existingBet ? "Modifier" : "Parier"}
          </button>
        </div>
      )}

      {locked && existingBet && (
        <p className="text-center text-sm text-gray-400 mt-2">
          Ton pari : {existingBet.predictedHome} – {existingBet.predictedAway}
        </p>
      )}
      {locked && !existingBet && (
        <p className="text-center text-sm text-red-400 mt-2">Pas de pari soumis</p>
      )}
    </div>
  );
}
