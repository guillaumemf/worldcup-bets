import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePoints } from "@/lib/points";

// GET /api/matches/sync — appelé par le cron Vercel
// Met à jour les scores des matchs en cours/terminés via football-data.org
export async function GET() {
  const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
  if (!API_KEY) {
    return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });
  }

  // Récupérer les matchs en cours ou à venir avec un externalId
  const matches = await prisma.match.findMany({
    where: {
      status: { in: ["UPCOMING", "LIVE"] as string[] },
      externalId: { not: null },
    },
  });

  if (matches.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  // Appel football-data.org — Coupe du Monde 2026 (WC)
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
    const homeScore = apiMatch.score?.fullTime?.home ?? null;
    const awayScore = apiMatch.score?.fullTime?.away ?? null;

    await prisma.match.update({
      where: { externalId: String(apiMatch.id) },
      data: {
        homeScore,
        awayScore,
        status: isFinished ? "FINISHED" : "LIVE",
      },
    });

    // Calculer les points de tous les paris sur ce match
    if (isFinished && homeScore !== null && awayScore !== null) {
      const bets = await prisma.bet.findMany({
        where: { matchId: apiMatch.id.toString(), points: null },
      });

      for (const bet of bets) {
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

  return NextResponse.json({ updated });
}
