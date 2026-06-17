import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePoints } from "@/lib/points";

export const dynamic = "force-dynamic";

// GET /api/matches/sync — appelé par cron-job.org toutes les 5 minutes
// Met à jour les scores des matchs en cours/terminés via football-data.org
export async function GET(req: Request) {
  // Vérification du token secret pour éviter les appels non autorisés
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const token = new URL(req.url).searchParams.get("token");
    if (token !== cronSecret) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  }

  const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
  if (!API_KEY) {
    return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });
  }

  // Récupérer les matchs UPCOMING ou LIVE qui ont un externalId
  const matches = await prisma.match.findMany({
    where: {
      status: { in: ["UPCOMING", "LIVE"] as string[] },
      externalId: { not: null },
    },
  });

  if (matches.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  // Appel football-data.org avec tous les IDs en une seule requête
  const ids = matches.map((m) => m.externalId).join(",");
  const res = await fetch(
    `https://api.football-data.org/v4/matches?ids=${ids}`,
    { headers: { "X-Auth-Token": API_KEY } }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Erreur API externe" }, { status: 502 });
  }

  const data = await res.json();
  let updated = 0;

  for (const apiMatch of data.matches) {
    const isFinished = apiMatch.status === "FINISHED";
    const isLive = apiMatch.status === "IN_PLAY" || apiMatch.status === "PAUSED";
    const homeScore = apiMatch.score?.fullTime?.home ?? null;
    const awayScore = apiMatch.score?.fullTime?.away ?? null;

    // Trouver le match en DB par externalId pour récupérer son id interne
    const dbMatch = matches.find((m) => m.externalId === String(apiMatch.id));
    if (!dbMatch) continue;

    // Mettre à jour le score et le statut
    await prisma.match.update({
      where: { id: dbMatch.id }, // ✅ id interne, pas externalId
      data: {
        homeScore,
        awayScore,
        status: isFinished ? "FINISHED" : isLive ? "LIVE" : "UPCOMING",
      },
    });

    // Calculer les points de tous les paris sur ce match (une seule fois)
    if (isFinished && homeScore !== null && awayScore !== null) {
      const bets = await prisma.bet.findMany({
        where: {
          matchId: dbMatch.id, // ✅ id interne, pas externalId
          points: null,        // seulement les paris pas encore calculés
        },
      });

      for (const bet of bets) {
        // Récupérer les règles de la ligue du joueur
        // (utilise les règles par défaut — le recalcul par ligue reste disponible via /recalculate)
        const points = calculatePoints(
          bet.predictedHome,
          bet.predictedAway,
          homeScore,
          awayScore
        );
        await prisma.bet.update({ where: { id: bet.id }, data: { points } });
      }
    }

    updated++;
  }

  return NextResponse.json({ updated, total: matches.length });
}
