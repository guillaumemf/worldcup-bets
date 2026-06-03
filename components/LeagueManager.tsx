"use client";

import { useState } from "react";

export default function LeagueManager({
  userId,
  onLeagueJoined,
}: {
  userId: string;
  onLeagueJoined: () => void;
}) {
  const [tab, setTab] = useState<"create" | "join">("create");
  const [leagueName, setLeagueName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/leagues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: leagueName, ownerId: userId }),
    });

    const league = await res.json();
    setLoading(false);

    if (res.ok) {
      setResult(`Ligue créée ! Code d'invitation : ${league.code}`);
      setLeagueName("");
      onLeagueJoined();
    } else {
      setResult("Erreur lors de la création.");
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/leagues/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: joinCode.toUpperCase(), userId }),
    });

    setLoading(false);

    if (res.ok) {
      setResult("Tu as rejoint la ligue !");
      setJoinCode("");
      onLeagueJoined();
    } else {
      setResult("Code invalide ou ligue introuvable.");
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("create")}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${
            tab === "create"
              ? "bg-green-700 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Créer une ligue
        </button>
        <button
          onClick={() => setTab("join")}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${
            tab === "join"
              ? "bg-green-700 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Rejoindre
        </button>
      </div>

      {tab === "create" ? (
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            placeholder="Nom de la ligue"
            value={leagueName}
            onChange={(e) => setLeagueName(e.target.value)}
            required
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-40 transition"
          >
            Créer
          </button>
        </form>
      ) : (
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            type="text"
            placeholder="Code d'invitation"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            required
            maxLength={8}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-40 transition"
          >
            Rejoindre
          </button>
        </form>
      )}

      {result && (
        <p className="mt-3 text-sm text-center font-medium text-green-700">{result}</p>
      )}
    </div>
  );
}
