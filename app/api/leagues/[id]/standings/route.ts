import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/leagues/[id]/standings — classement d'une ligue
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const members = await prisma.leagueMember.findMany({
    where: { leagueId: params.id },
    include: {
      user: {
        include: {
          bets: {
            where: { points: { not: null } },
          },
        },
      },
    },
  });

  const standings = members
    .map((m) => {
      const bets = m.user.bets;
      const totalPoints = bets.reduce((sum, b) => sum + (b.points ?? 0), 0);
      const exactScores = bets.filter((b) => b.points === 3).length;
      const correctWinners = bets.filter(
        (b) => b.points !== null && b.points > 0
      ).length;

      return {
        userId: m.user.id,
        username: m.user.username,
        totalPoints,
        exactScores,
        correctWinners,
        betsCount: bets.length,
      };
    })
    .sort((a, b) => {
      // Tri : points → scores exacts → bons vainqueurs
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
      return b.correctWinners - a.correctWinners;
    })
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return NextResponse.json(standings);
}
