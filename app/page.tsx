"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim() }),
    });

    if (res.ok) {
      const user = await res.json();
      // Persistance locale de l'utilisateur
      localStorage.setItem("userId", user.id);
      localStorage.setItem("username", user.username);
      router.push("/dashboard");
    } else {
      alert("Ce nom d'utilisateur est déjà pris.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Bienvenue !</h2>
        <p className="text-gray-500">
          Entre ton nom pour rejoindre ou créer une ligue avec tes amis.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm flex flex-col gap-4"
      >
        <input
          type="text"
          placeholder="Ton nom d'utilisateur"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          maxLength={30}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-green-700 text-white rounded-lg px-4 py-3 text-lg font-semibold hover:bg-green-800 disabled:opacity-50 transition"
        >
          {loading ? "Chargement…" : "Continuer →"}
        </button>
      </form>
    </div>
  );
}
