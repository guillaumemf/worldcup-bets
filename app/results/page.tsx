"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ResultCard from "@/components/ResultCard";

type Match = {
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  kickoffAt: string;
  stage: string;
};

type BetWithMatch = {
  id: string;
  predictedHome: number;
  predictedAway: number;
  points: number | null;
  match: Match;
};

const STAGE_LABELS: Record<string, string> = {
  GROUP: "Phase de groupes",
  ROUND_OF_32: "32èmes de finale",
  ROUND_OF_16: "8èmes de finale",
  QUARTER_FINAL: "Quarts de finale",
  SEMI_FINAL: "Demi-finales",
  THIRD_PLACE: "Petite finale",
  FINAL: "Finale",
};

export default function ResultsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [bets, setBets] = useState<BetWithMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (!id) { router.push("/"); return; }
    setUserId(id);

    fetch(`/api/users/${id}/bets`)
      .then((r) => r.json())
      .then((data) => { setBets(data); setLoading(false); });
  }, [router]);

  // Statistiques globales
  const totalPoints = bets.reduce((s, b) => s + (b.points ?? 0), 0);
  const exactScores = bets.filter((b) => b.points === 3).length;
  const correctWinners = bets.filter((b) => (b.points ?? 0) > 0).length;

  // Grouper par phase
  const byStage = bets.reduce<Record<string, BetWithMatch[]>>((acc, bet) => {
    const stage = bet.match.stage;
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(bet);
    return acc;
  }, {});

  const stageOrder = [
    "FINAL", "THIRD_PLACE", "SEMI_FINAL", "QUARTER_FINAL",
    "ROUND_OF_16", "ROUND_OF_32", "GROUP",
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Nav */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-green-700 hover:underline">
          ← Tableau de bord
        </Link>
        <h2 className="text-lg font-bold">Mes résultats</h2>
      </div>

      {/* Statistiques */}
      {!loading && bets.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-green-700">{totalPoints}</p>
            <p className="text-xs text-gray-500 mt-1">Points totaux</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
            <p className="text-3xl font-bold">{exactScores}</p>
            <p className="text-xs text-gray-500 mt-1">Scores exacts</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
            <p className="text-3xl font-bold">{correctWinners}</p>
            <p className="text-xs text-gray-500 mt-1">Bons résultats</p>
          </div>
        </div>
      )}

      {/* Liste des paris par phase */}
      {loading ? (
        <p className="text-center text-gray-400 py-12">Chargement…</p>
      ) : bets.length === 0 ? (
        <p className="text-center text-gray-400 py-12">
          Aucun résultat pour l'instant — les matchs ne sont pas encore terminés.
        </p>
      ) : (
        stageOrder
          .filter((stage) => byStage[stage])
          .map((stage) => (
            <section key={stage}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {STAGE_LABELS[stage] ?? stage}
              </h3>
              <div className="flex flex-col gap-3">
                {byStage[stage].map((bet) => (
                  <ResultCard key={bet.id} bet={bet} />
                ))}
              </div>
            </section>
          ))
      )}
    </div>
  );
}
