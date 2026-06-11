import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/leagues/[id]/match-bets?status=LIVE,FINISHED
// Retourne les matchs LIVE et/ou FINISHED avec les paris de tous les membres de la ligue
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const statusParam = req.nextUrl.searchParams.get("status");
  const statusFilter = statusParam
    ? statusParam.split(",")
    : ["LIVE", "FINISHED"];

  // Récupérer les membres de la ligue
  const league = await prisma.league.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: { user: { select: { id: true, username: true } } },
      },
    },
  });

  if (!league) {
    return NextResponse.json({ error: "Ligue introuvable" }, { status: 404 });
  }

  const memberMap = new Map(
    league.members.map((m) => [m.userId, m.user.username])
  );
  const memberIds = Array.from(memberMap.keys());

  // Récupérer les matchs dans les statuts demandés
  // OU les matchs UPCOMING dont le coup d'envoi est passé (verrouillés côté client)
  const now = new Date();
  const matches = await prisma.match.findMany({
    where: {
      OR: [
        { status: { in: statusFilter } },
        { status: "UPCOMING", kickoffAt: { lte: now } },
      ],
    },
    orderBy: { kickoffAt: "desc" },
    include: {
      bets: {
        where: { userId: { in: memberIds } },
        include: { user: { select: { id: true, username: true } } },
      },
    },
  });

  // Construire la réponse : pour chaque match, liste de paris de tous les membres
  const result = matches.map((match) => {
    const betsByUser = new Map(
      match.bets.map((b) => [b.userId, b])
    );

    const memberBets = league.members.map((m) => {
      const bet = betsByUser.get(m.userId);
      return {
        userId: m.userId,
        username: m.user.username,
        predictedHome: bet?.predictedHome ?? null,
        predictedAway: bet?.predictedAway ?? null,
        points: bet?.points ?? null,
      };
    });

    return {
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      kickoffAt: match.kickoffAt,
      stage: match.stage,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      memberBets,
    };
  });

  return NextResponse.json(result);
}
