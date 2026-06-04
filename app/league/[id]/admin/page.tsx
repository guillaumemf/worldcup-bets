"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type Member = {
  id: string;
  userId: string;
  user: { id: string; username: string };
};

type League = {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  pointsExactScore: number;
  pointsCorrectWinner: number;
  pointsCorrectDiff: number;
  members: Member[];
};

export default function LeagueAdminPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [userId, setUserId] = useState<string | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [notAdmin, setNotAdmin] = useState(false);

  // Règles de points
  const [exactScore, setExactScore] = useState(3);
  const [correctDiff, setCorrectDiff] = useState(2);
  const [correctWinner, setCorrectWinner] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState<string | null>(null);

  useEffect(() => {
    const uid = localStorage.getItem("userId");
    if (!uid) { router.push("/"); return; }
    setUserId(uid);

    fetch(`/api/leagues/${id}`)
      .then((r) => r.json())
      .then((data: League) => {
        if (data.ownerId !== uid) {
          setNotAdmin(true);
        } else {
          setLeague(data);
          setExactScore(data.pointsExactScore);
          setCorrectDiff(data.pointsCorrectDiff);
          setCorrectWinner(data.pointsCorrectWinner);
        }
        setLoading(false);
      });
  }, [id, router]);

  async function handleSavePoints(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    await fetch(`/api/leagues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requesterId: userId,
        pointsExactScore: exactScore,
        pointsCorrectDiff: correctDiff,
        pointsCorrectWinner: correctWinner,
      }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleRecalculate() {
    if (!confirm("Recalculer tous les points avec le barème actuel ?")) return;
    setRecalculating(true);
    setRecalcResult(null);

    const res = await fetch(`/api/leagues/${id}/recalculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterId: userId }),
    });

    const data = await res.json();
    setRecalculating(false);
    setRecalcResult(res.ok ? `✓ ${data.updated} paris recalculés.` : "Erreur lors du recalcul.");
    setTimeout(() => setRecalcResult(null), 4000);
  }

  async function handleRemoveMember(memberUserId: string, username: string) {
    if (!confirm(`Retirer ${username} de la ligue ?`)) return;

    const res = await fetch(`/api/leagues/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberUserId, requesterId: userId }),
    });

    if (res.ok) {
      setLeague((prev) =>
        prev
          ? { ...prev, members: prev.members.filter((m) => m.userId !== memberUserId) }
          : prev
      );
    }
  }

  if (loading) return <p className="text-center text-gray-400 py-12">Chargement…</p>;

  if (notAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-medium">Tu n'es pas l'admin de cette ligue.</p>
        <Link href="/dashboard" className="text-red-400 text-sm mt-4 block hover:underline">
          ← Retour au tableau de bord
        </Link>
      </div>
    );
  }

  if (!league) return null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-red-400 hover:underline">
          ← Tableau de bord
        </Link>
        <h2 className="text-lg font-bold">Admin — {league.name}</h2>
        <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded font-mono ml-auto">
          {league.code}
        </span>
      </div>

      {/* Règles de points */}
      <section className="bg-gray-900 rounded-xl border border-gray-700 p-5 shadow-sm">
        <h3 className="font-bold mb-4">Système de points</h3>
        <form onSubmit={handleSavePoints} className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {[
              { label: "Score exact", value: exactScore, setter: setExactScore },
              { label: "Bon vainqueur + bonne différence", value: correctDiff, setter: setCorrectDiff },
              { label: "Bon vainqueur (ou nul correct)", value: correctWinner, setter: setCorrectWinner },
            ].map(({ label, value, setter }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={value}
                    onChange={(e) => setter(Number(e.target.value))}
                    className="w-16 text-center border border-gray-600 rounded-lg py-1.5 font-bold bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-400">pts</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-red-800 disabled:opacity-40 transition"
            >
              {saving ? "Sauvegarde…" : saved ? "✓ Sauvegardé" : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={handleRecalculate}
              disabled={recalculating}
              className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-gray-600 disabled:opacity-40 transition"
            >
              {recalculating ? "Recalcul…" : "Recalculer les points"}
            </button>
          </div>
          {recalcResult && (
            <p className="text-sm text-center text-green-400">{recalcResult}</p>
          )}
        </form>
      </section>

      {/* Membres */}
      <section className="bg-gray-900 rounded-xl border border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="font-bold">Membres ({league.members.length})</h3>
        </div>
        <div>
          {league.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{m.user.username}</span>
                {m.userId === league.ownerId && (
                  <span className="text-xs bg-red-950 text-red-400 px-2 py-0.5 rounded-full">
                    admin
                  </span>
                )}
              </div>
              {m.userId !== league.ownerId && (
                <button
                  onClick={() => handleRemoveMember(m.userId, m.user.username)}
                  className="text-xs text-red-500 hover:text-red-700 transition"
                >
                  Retirer
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
