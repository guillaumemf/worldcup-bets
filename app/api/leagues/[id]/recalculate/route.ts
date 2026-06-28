import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePoints, calculateKnockoutPoints, KNOCKOUT_STAGES } from "@/lib/points";

export const dynamic = "force-dynamic";

// POST /api/leagues/[id]/recalculate — recalcule tous les points avec le barème de la ligue
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { requesterId } = await req.json();

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

  const groupRules = {
    exactScore: league.pointsExactScore,
    correctDiff: league.pointsCorrectDiff,
    correctWinner: league.pointsCorrectWinner,
  };

  const knockoutRules = {
    exactScore: league.knockoutPointsExactScore,
    correctOutcome: league.knockoutPointsCorrectOutcome,
    etBonus: league.knockoutPointsETBonus,
    etExact: league.knockoutPointsETExact,
    tabBonus: league.knockoutPointsTABBonus,
  };

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

    let points: number;

    if (KNOCKOUT_STAGES.has(bet.match.stage)) {
      points = calculateKnockoutPoints(
        bet.predictedHome,
        bet.predictedAway,
        bet.match.homeScore,
        bet.match.awayScore,
        bet.predictedETHome,
        bet.predictedETAway,
        bet.predictedPenaltyWinner,
        bet.match.aetHomeScore,
        bet.match.aetAwayScore,
        bet.match.penaltyWinner,
        knockoutRules
      );
    } else {
      points = calculatePoints(
        bet.predictedHome,
        bet.predictedAway,
        bet.match.homeScore,
        bet.match.awayScore,
        groupRules
      );
    }

    await prisma.bet.update({ where: { id: bet.id }, data: { points } });
    updated++;
  }

  return NextResponse.json({ updated });
}
