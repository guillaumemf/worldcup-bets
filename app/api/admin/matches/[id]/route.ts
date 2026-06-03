import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePoints } from "@/lib/points";

// PATCH /api/admin/matches/[id] — mise à jour manuelle du score
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Protection basique par mot de passe admin (variable d'environnement)
  const adminPassword = req.headers.get("x-admin-password");
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { homeScore, awayScore, status } = await req.json();

  if (homeScore === undefined || awayScore === undefined) {
    return NextResponse.json({ error: "Scores manquants" }, { status: 400 });
  }

  // Mettre à jour le match
  const match = await prisma.match.update({
    where: { id: params.id },
    data: {
      homeScore,
      awayScore,
      status: status ?? "FINISHED",
    },
  });

  // Recalculer les points de tous les paris sur ce match
  const bets = await prisma.bet.findMany({ where: { matchId: match.id } });

  for (const bet of bets) {
    const points = calculatePoints(
      bet.predictedHome,
      bet.predictedAway,
      homeScore,
      awayScore
    );
    await prisma.bet.update({ where: { id: bet.id }, data: { points } });
  }

  return NextResponse.json({ match, betsUpdated: bets.length });
}
