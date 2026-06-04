import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePoints } from "@/lib/points";

export const dynamic = "force-dynamic";

// POST /api/leagues/[id]/recalculate — recalcule tous les points avec le barème de la ligue
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { requesterId } = await req.json();

  // Vérifier que le demandeur est l'admin
  const league = await prisma.league.findUnique({
    where: { id: params.id },
    include: { members: true },
  });

  if (!league) {
    return NextResponse.json({ error: "Ligue introuvable" }, { status: 404 });
  }
  if (league.ownerId !== requesterId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const rules = {
    exactScore: league.pointsExactScore,
    correctDiff: league.pointsCorrectDiff,
    correctWinner: league.pointsCorrectWinner,
  };

  // Récupérer tous les paris des membres de cette ligue sur des matchs terminés
  const memberIds = league.members.map((m) => m.userId);

  const bets = await prisma.bet.findMany({
    where: {
      userId: { in: memberIds },
      match: { status: "FINISHED" },
    },
    include: { match: true },
  });

  let updated = 0;
  for (const bet of bets) {
    if (bet.match.homeScore === null || bet.match.awayScore === null) continue;

    const points = calculatePoints(
      bet.predictedHome,
      bet.predictedAway,
      bet.match.homeScore,
      bet.match.awayScore,
      rules
    );

    await prisma.bet.update({ where: { id: bet.id }, data: { points } });
    updated++;
  }

  return NextResponse.json({ updated });
}
