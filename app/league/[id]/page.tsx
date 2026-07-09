"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Standings from "@/components/Standings";
import LeagueBetsPanel from "@/components/LeagueBetsPanel";
import PointsChart from "@/components/PointsChart";

const STAGE_LABELS: Record<string, string> = {
  GROUP: "Phase de groupes",
  ROUND_OF_32: "16èmes de finale",
  ROUND_OF_16: "Huitièmes de finale",
  QUARTER_FINAL: "Quarts de finale",
  SEMI_FINAL: "Demi-finales",
  THIRD_PLACE: "Petite finale",
  FINAL: "Finale",
};

const STAGE_ORDER = [
  "FINAL", "THIRD_PLACE", "SEMI_FINAL", "QUARTER_FINAL",
  "ROUND_OF_16", "ROUND_OF_32", "GROUP",
];

type Standing = {
  rank: number;
  userId: string;
  username: string;
  totalPoints: number;
  exactScores: number;
  betsCount: number;
};

type MemberBet = {
  userId: string;
  username: string;
  predictedHome: number | null;
  predictedAway: number | null;
  predictedETHome: number | null;
  predictedETAway: number | null;
  predictedPenaltyWinner: string | null;
  points: number | null;
};

type MatchWithBets = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  stage: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  aetHomeScore: number | null;
  aetAwayScore: number | null;
  penaltyWinner: string | null;
  memberBets: MemberBet[];
};

const KNOCKOUT_STAGES = new Set([
  "ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "THIRD_PLACE", "FINAL",
]);

type League = {
  id: string;
  name: string;
  code: string;
  ownerId: string;
};

export default function LeaguePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [userId, setUserId] = useState<string | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [matchBets, setMatchBets] = useState<MatchWithBets[]>([]);
  const [chartUsers, setChartUsers] = useState<{ userId: string; username: string }[]>([]);
  const [chartData, setChartData] = useState<{ label: string; kickoffAt: string; points: Record<string, number> }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = localStorage.getItem("userId");
    if (!uid) { router.push("/login"); return; }
    setUserId(uid);
  }, [router]);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    const [leagueRes, standingsRes, matchBetsRes, historyRes] = await Promise.all([
      fetch(`/api/leagues/${id}`),
      fetch(`/api/leagues/${id}/standings`),
      fetch(`/api/leagues/${id}/match-bets?status=LIVE,FINISHED`),
      fetch(`/api/leagues/${id}/points-history`),
    ]);
    const [leagueData, standingsData, matchBetsData, historyData] = await Promise.all([
      leagueRes.json(),
      standingsRes.json(),
      matchBetsRes.json(),
      historyRes.json(),
    ]);
    setLeague(leagueData);
    setStandings(standingsData);
    setMatchBets(matchBetsData);
    if (historyData.users && historyData.data) {
      setChartUsers(historyData.users);
      setChartData(historyData.data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { if (userId) fetchAll(); }, [userId, fetchAll]);

  if (loading || !userId) {
    return <p className="text-center text-gray-400 py-12">Chargement…</p>;
  }

  if (!league || league.id === undefined) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Ligue introuvable.</p>
        <Link href="/dashboard" className="text-sm text-red-400 hover:underline mt-4 block">← Retour</Link>
      </div>
    );
  }

  // Grouper les matchs par phase
  const byStage: Record<string, MatchWithBets[]> = {};
  for (const m of matchBets) {
    if (!byStage[m.stage]) byStage[m.stage] = [];
    byStage[m.stage].push(m);
  }

  const hasHistory = matchBets.length > 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-red-400 hover:underline">
            ← Tableau de bord
          </Link>
          <h2 className="text-lg font-bold">{league.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded font-mono">
            {league.code}
          </span>
          {league.ownerId === userId && (
            <Link
              href={`/league/${id}/admin`}
              className="text-xs text-gray-400 hover:text-red-400 transition"
              title="Gérer la ligue"
            >
              ⚙️
            </Link>
          )}
        </div>
      </div>

      {/* Classement */}
      <section>
        <h3 className="text-base font-bold mb-3">Classement</h3>
        <Standings standings={standings} currentUserId={userId} />
      </section>

      {/* Graphe d'évolution */}
      {chartData.length > 0 && (
        <section>
          <h3 className="text-base font-bold mb-3">Évolution des points</h3>
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
            <PointsChart
              users={chartUsers}
              data={chartData}
              currentUserId={userId}
            />
          </div>
        </section>
      )}

      {/* Historique des matchs */}
      <section>
        <h3 className="text-base font-bold mb-3">Historique des paris</h3>

        {!hasHistory ? (
          <p className="text-gray-400 text-sm text-center py-8">
            Aucun match joué ou en cours pour l'instant.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {STAGE_ORDER.filter((s) => byStage[s]).map((stage) => (
              <div key={stage}>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">
                  {STAGE_LABELS[stage] ?? stage}
                </p>
                <div className="flex flex-col gap-3">
                  {byStage[stage].map((match) => {
                    const kickoff = new Date(match.kickoffAt);
                    const isLive = match.status === "LIVE";

                    return (
                      <div
                        key={match.id}
                        className="bg-gray-900 rounded-xl border border-gray-700 p-4 shadow-sm"
                      >
                        {/* En-tête du match */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-gray-400">
                            {kickoff.toLocaleDateString("fr-FR", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isLive && (
                            <span className="text-xs font-semibold text-green-400 bg-green-950 px-2 py-0.5 rounded-full animate-pulse">
                              🔴 En cours
                            </span>
                          )}
                        </div>

                        {/* Score du match */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-semibold text-right flex-1">{match.homeTeam}</span>
                          <div className="flex items-center gap-2 text-2xl font-bold">
                            <span>{match.homeScore ?? "?"}</span>
                            <span className="text-gray-500 text-lg">–</span>
                            <span>{match.awayScore ?? "?"}</span>
                          </div>
                          <span className="font-semibold text-left flex-1">{match.awayTeam}</span>
                        </div>

                        {/* Prolongations et TAB (phase éliminatoire) */}
                        {KNOCKOUT_STAGES.has(match.stage) && match.aetHomeScore !== null && (
                          <div className="flex flex-col items-center gap-0.5 mb-3">
                            <span className="text-xs text-gray-500">
                              Prolong. :&nbsp;
                              <span className="text-gray-300 font-semibold">
                                {match.aetHomeScore} – {match.aetAwayScore}
                              </span>
                            </span>
                            {match.penaltyWinner && (
                              <span className="text-xs text-gray-500">
                                TAB :&nbsp;
                                <span className="text-gray-300 font-semibold">
                                  {match.penaltyWinner === "home" ? match.homeTeam : match.awayTeam}
                                </span>
                              </span>
                            )}
                          </div>
                        )}
                        {/* Espacement si pas d'AET */}
                        {!(KNOCKOUT_STAGES.has(match.stage) && match.aetHomeScore !== null) && (
                          <div className="mb-3" />
                        )}

                        {/* Paris de tous les membres */}
                        <LeagueBetsPanel
                          memberBets={match.memberBets}
                          currentUserId={userId}
                          showPoints={!isLive}
                          homeTeam={match.homeTeam}
                          awayTeam={match.awayTeam}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
