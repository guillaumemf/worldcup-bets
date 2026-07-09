"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MatchCard from "@/components/MatchCard";
import Standings from "@/components/Standings";
import LeagueManager from "@/components/LeagueManager";
import LeagueBetsPanel from "@/components/LeagueBetsPanel";

type League = { id: string; name: string; code: string; ownerId: string };
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
  points: number | null;
};
type MatchBets = {
  id: string;
  status: string;
  memberBets: MemberBet[];
};

export default function Dashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [liveMatchBets, setLiveMatchBets] = useState<Map<string, MemberBet[]>>(new Map());

  useEffect(() => {
    const id = localStorage.getItem("userId");
    const name = localStorage.getItem("username");
    if (!id) { router.push("/login"); return; }
    setUserId(id);
    setUsername(name);
  }, [router]);

  const fetchLeagues = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/users/${userId}/leagues`);
    const data = await res.json();
    setLeagues(data);
    if (data.length > 0 && !selectedLeague) {
      setSelectedLeague(data[0]);
    }
  }, [userId, selectedLeague]);

  const fetchMatches = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/matches?userId=${userId}`);
    const data = await res.json();
    setMatches(data);
  }, [userId]);

  const fetchStandings = useCallback(async () => {
    if (!selectedLeague) return;
    const res = await fetch(`/api/leagues/${selectedLeague.id}/standings`);
    const data = await res.json();
    setStandings(data);
  }, [selectedLeague]);

  const fetchLiveMatchBets = useCallback(async () => {
    if (!selectedLeague) return;
    // On passe status=LIVE pour récupérer les LIVE + les UPCOMING dont le coup d'envoi est passé
    const res = await fetch(`/api/leagues/${selectedLeague.id}/match-bets?status=LIVE`);
    if (!res.ok) return;
    const data: MatchBets[] = await res.json();
    const map = new Map<string, MemberBet[]>();
    for (const m of data) map.set(m.id, m.memberBets);
    setLiveMatchBets(map);
  }, [selectedLeague]);

  useEffect(() => { if (userId) { fetchLeagues(); fetchMatches(); } }, [userId]);
  useEffect(() => {
    if (selectedLeague) {
      fetchStandings();
      fetchLiveMatchBets();
    }
  }, [selectedLeague]);

  if (!userId) return null;

  return (
    <div className="flex flex-col gap-8">
      {/* Header utilisateur */}
      <div className="flex items-center justify-between">
        <p className="text-gray-400">
          Bonjour, <span className="font-semibold text-gray-100">{username}</span> 👋
        </p>
        <div className="flex items-center gap-4">
          <Link href="/results" className="text-sm text-red-400 font-medium hover:underline">
            Mes résultats →
          </Link>
          <button
            onClick={() => { localStorage.clear(); router.push("/login"); }}
            className="text-sm text-gray-400 hover:text-gray-400"
          >
            Changer d'utilisateur
          </button>
        </div>
      </div>

      {/* Ligues */}
      <section>
        <h2 className="text-lg font-bold mb-3">Mes ligues</h2>
        <LeagueManager userId={userId} onLeagueJoined={fetchLeagues} />

        {leagues.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {leagues.map((l) => (
              <div key={l.id} className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedLeague(l)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    selectedLeague?.id === l.id
                      ? "bg-red-700 text-white"
                      : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                  }`}
                >
                  {l.name}
                </button>
                {l.ownerId === userId && (
                  <Link
                    href={`/league/${l.id}/admin`}
                    className="text-xs text-gray-400 hover:text-red-400 transition"
                    title="Gérer la ligue"
                  >
                    ⚙️
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Classement */}
      {selectedLeague && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Classement — {selectedLeague.name}</h2>
            <div className="flex items-center gap-3">
              <Link
                href={`/league/${selectedLeague.id}`}
                className="text-xs text-red-400 hover:underline font-medium"
              >
                Voir la ligue →
              </Link>
              <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded font-mono">
                {selectedLeague.code}
              </span>
            </div>
          </div>
          <Standings standings={standings} currentUserId={userId} />
        </section>
      )}

      {/* Matchs à parier */}
      <section>
        <h2 className="text-lg font-bold mb-3">Prochains matchs</h2>
        {matches.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">
            Aucun match à venir pour le moment.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {matches.map((m) => {
              const locked = new Date() >= new Date(m.kickoffAt) || m.status !== "UPCOMING";
              const liveBets = locked ? liveMatchBets.get(m.id) : undefined;
              return (
                <div key={m.id} className="bg-gray-900 rounded-xl border border-gray-700 shadow-sm overflow-hidden">
                  <MatchCard
                    match={m}
                    userId={userId}
                    onBetSaved={() => { fetchStandings(); fetchLiveMatchBets(); }}
                    noBorder
                  />
                  {liveBets && liveBets.length > 0 && (
                    <div className="px-4 pb-4">
                      <LeagueBetsPanel
                        memberBets={liveBets}
                        currentUserId={userId}
                        showPoints={false}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
