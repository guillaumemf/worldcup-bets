import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePoints, calculateKnockoutPoints, KNOCKOUT_STAGES } from "@/lib/points";

export const dynamic = "force-dynamic";

// PATCH /api/admin/matches/[id] — mise à jour manuelle du score
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminPassword = req.headers.get("x-admin-password");
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { homeScore, awayScore, status, aetHomeScore, aetAwayScore, penaltyWinner } =
    await req.json();

  if (homeScore === undefined || awayScore === undefined) {
    return NextResponse.json({ error: "Scores manquants" }, { status: 400 });
  }

  const match = await prisma.match.update({
    where: { id: params.id },
    data: {
      homeScore,
      awayScore,
      status: status ?? "FINISHED",
      aetHomeScore: aetHomeScore ?? null,
      aetAwayScore: aetAwayScore ?? null,
      penaltyWinner: penaltyWinner ?? null,
    },
  });

  // Recalculer les points de tous les paris sur ce match
  const isKnockout = KNOCKOUT_STAGES.has(match.stage);
  const bets = await prisma.bet.findMany({ where: { matchId: match.id } });

  let betsUpdated = 0;

  if (isKnockout) {
    // Pour les matchs knockout, on cherche le barème de chaque joueur via sa ligue
    const leagues = await prisma.league.findMany({ include: { members: true } });

    for (const bet of bets) {
      const league = leagues.find((l) => l.members.some((m: { userId: string }) => m.userId === bet.userId));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const l = league as any;
      const knockoutRules = l
        ? {
            exactScore: l.knockoutPointsExactScore ?? 4,
            correctOutcome: l.knockoutPointsCorrectOutcome ?? 2,
            etBonus: l.knockoutPointsETBonus ?? 1,
            etExact: l.knockoutPointsETExact ?? 2,
            tabBonus: l.knockoutPointsTABBonus ?? 1,
          }
        : undefined;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = bet as any;
      const points = calculateKnockoutPoints(
        bet.predictedHome, bet.predictedAway,
        homeScore, awayScore,
        b.predictedETHome ?? null, b.predictedETAway ?? null,
        b.predictedPenaltyWinner ?? null,
        aetHomeScore ?? null, aetAwayScore ?? null,
        penaltyWinner ?? null,
        knockoutRules
      );
      await prisma.bet.update({ where: { id: bet.id }, data: { points } });
      betsUpdated++;
    }
  } else {
    for (const bet of bets) {
      const points = calculatePoints(bet.predictedHome, bet.predictedAway, homeScore, awayScore);
      await prisma.bet.update({ where: { id: bet.id }, data: { points } });
      betsUpdated++;
    }
  }

  return NextResponse.json({ match, betsUpdated });
}
