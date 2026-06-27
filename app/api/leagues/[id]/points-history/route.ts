import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/leagues/[id]/points-history
// Retourne les points cumulés par joueur, match après match (triés par kickoffAt)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const league = await prisma.league.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: { user: true },
      },
    },
  });

  if (!league) {
    return NextResponse.json({ error: "Ligue introuvable" }, { status: 404 });
  }

  const memberUserIds = league.members.map((m) => m.userId);

  // Récupère tous les matchs terminés qui ont au moins un pari d'un membre
  const matches = await prisma.match.findMany({
    where: {
      status: "FINISHED",
      bets: {
        some: { userId: { in: memberUserIds } },
      },
    },
    include: {
      bets: {
        where: { userId: { in: memberUserIds } },
      },
    },
    orderBy: { kickoffAt: "asc" },
  });

  // Construit les points cumulés
  const cumulative: Record<string, number> = {};
  for (const uid of memberUserIds) cumulative[uid] = 0;

  const data = matches.map((match) => {
    for (const bet of match.bets) {
      cumulative[bet.userId] = (cumulative[bet.userId] ?? 0) + (bet.points ?? 0);
    }

    const label =
      match.homeTeam.substring(0, 3).toUpperCase() +
      "-" +
      match.awayTeam.substring(0, 3).toUpperCase();

    const points: Record<string, number> = {};
    for (const uid of memberUserIds) {
      points[uid] = cumulative[uid] ?? 0;
    }

    return {
      label,
      kickoffAt: match.kickoffAt,
      points,
    };
  });

  const users = league.members.map((m) => ({
    userId: m.userId,
    username: m.user.username,
  }));

  return NextResponse.json({ users, data });
}
