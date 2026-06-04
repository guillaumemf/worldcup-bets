"use client";

import { useState } from "react";

const STAGE_LABELS: Record<string, string> = {
  GROUP: "Groupes",
  ROUND_OF_32: "32es",
  ROUND_OF_16: "8es",
  QUARTER_FINAL: "Quarts",
  SEMI_FINAL: "Demis",
  THIRD_PLACE: "3e place",
  FINAL: "Finale",
};

const STATUS_LABELS: Record<string, string> = {
  UPCOMING: "À venir",
  LIVE: "En cours",
  FINISHED: "Terminé",
};

type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  stage: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  _count: { bets: number };
};

type EditState = {
  homeScore: string;
  awayScore: string;
  status: string;
  saving: boolean;
  saved: boolean;
  error: string | null;
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [filterStage, setFilterStage] = useState<string>("ALL");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setAuthError("");

    const res = await fetch("/api/admin/matches", {
      headers: { "x-admin-password": password },
    });

    if (res.ok) {
      const data = await res.json();
      setMatches(data);
      setAuthenticated(true);
      // Initialiser l'état d'édition pour chaque match
      const initialEdits: Record<string, EditState> = {};
      for (const m of data) {
        initialEdits[m.id] = {
          homeScore: m.homeScore?.toString() ?? "",
          awayScore: m.awayScore?.toString() ?? "",
          status: m.status,
          saving: false,
          saved: false,
          error: null,
        };
      }
      setEdits(initialEdits);
    } else {
      setAuthError("Mot de passe incorrect.");
    }

    setLoading(false);
  }

  async function handleSave(matchId: string) {
    const edit = edits[matchId];
    if (!edit) return;

    setEdits((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], saving: true, error: null },
    }));

    const res = await fetch(`/api/admin/matches/${matchId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify({
        homeScore: Number(edit.homeScore),
        awayScore: Number(edit.awayScore),
        status: edit.status,
      }),
    });

    if (res.ok) {
      const { betsUpdated } = await res.json();
      setEdits((prev) => ({
        ...prev,
        [matchId]: { ...prev[matchId], saving: false, saved: true, error: null },
      }));
      // Mettre à jour le match dans la liste
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId
            ? {
                ...m,
                homeScore: Number(edit.homeScore),
                awayScore: Number(edit.awayScore),
                status: edit.status,
              }
            : m
        )
      );
      setTimeout(() => {
        setEdits((prev) => ({ ...prev, [matchId]: { ...prev[matchId], saved: false } }));
      }, 2000);
      console.log(`${betsUpdated} paris mis à jour.`);
    } else {
      setEdits((prev) => ({
        ...prev,
        [matchId]: { ...prev[matchId], saving: false, error: "Erreur lors de la sauvegarde." },
      }));
    }
  }

  function updateEdit(matchId: string, field: keyof EditState, value: string) {
    setEdits((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [field]: value } }));
  }

  const stages = ["ALL", ...Array.from(new Set(matches.map((m) => m.stage)))];
  const filtered = filterStage === "ALL" ? matches : matches.filter((m) => m.stage === filterStage);

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <h2 className="text-2xl font-bold">Administration</h2>
        <form onSubmit={handleLogin} className="w-full max-w-xs flex flex-col gap-3">
          <input
            type="password"
            placeholder="Mot de passe admin"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-red-700 text-white rounded-lg px-4 py-3 font-semibold hover:bg-red-800 disabled:opacity-40 transition"
          >
            {loading ? "Connexion…" : "Accéder"}
          </button>
          {authError && <p className="text-red-500 text-sm text-center">{authError}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Admin — Scores</h2>
        <span className="text-sm text-gray-400">{matches.length} matchs</span>
      </div>

      {/* Filtre par phase */}
      <div className="flex flex-wrap gap-2">
        {stages.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStage(s)}
            className={`px-3 py-1 rounded-full text-sm transition ${
              filterStage === s
                ? "bg-red-700 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {s === "ALL" ? "Tous" : STAGE_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      {/* Liste des matchs */}
      <div className="flex flex-col gap-3">
        {filtered.map((match) => {
          const edit = edits[match.id];
          if (!edit) return null;
          const kickoff = new Date(match.kickoffAt);

          return (
            <div key={match.id} className="bg-gray-900 rounded-xl border border-gray-700 p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-xs text-gray-400">
                    {kickoff.toLocaleDateString("fr-FR", {
                      weekday: "short", day: "numeric", month: "short",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">
                    · {match._count.bets} pari{match._count.bets !== 1 ? "s" : ""}
                  </span>
                </div>
                <select
                  value={edit.status}
                  onChange={(e) => updateEdit(match.id, "status", e.target.value)}
                  className="text-xs border border-gray-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex-1 font-semibold text-right text-sm">{match.homeTeam}</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={edit.homeScore}
                    onChange={(e) => updateEdit(match.id, "homeScore", e.target.value)}
                    className="w-12 text-center border border-gray-600 rounded-lg py-1.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="–"
                  />
                  <span className="text-gray-400 font-bold">–</span>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={edit.awayScore}
                    onChange={(e) => updateEdit(match.id, "awayScore", e.target.value)}
                    className="w-12 text-center border border-gray-600 rounded-lg py-1.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="–"
                  />
                </div>
                <span className="flex-1 font-semibold text-left text-sm">{match.awayTeam}</span>
              </div>

              <div className="mt-3 flex justify-between items-center">
                {edit.error && <p className="text-red-500 text-xs">{edit.error}</p>}
                {!edit.error && <span />}
                <button
                  onClick={() => handleSave(match.id)}
                  disabled={edit.saving || edit.homeScore === "" || edit.awayScore === ""}
                  className="text-sm px-4 py-1.5 bg-red-700 text-white rounded-lg hover:bg-red-800 disabled:opacity-40 transition"
                >
                  {edit.saving ? "Sauvegarde…" : edit.saved ? "✓ Sauvegardé" : "Enregistrer"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
