import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/bets — soumettre ou mettre à jour un pari
export async function POST(req: NextRequest) {
  const { userId, matchId, predictedHome, predictedAway } = await req.json();

  // Vérifier que le match existe et n'a pas encore commencé
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return NextResponse.json({ error: "Match introuvable" }, { status: 404 });
  }
  if (match.status !== "UPCOMING") { // UPCOMING, LIVE, FINISHED
    return NextResponse.json(
      { error: "Les paris sont fermés pour ce match" },
      { status: 403 }
    );
  }
  if (new Date() >= match.kickoffAt) {
    return NextResponse.json(
      { error: "Le match a déjà commencé" },
      { status: 403 }
    );
  }

  // Upsert : crée ou met à jour le pari
  const bet = await prisma.bet.upsert({
    where: { userId_matchId: { userId, matchId } },
    create: { userId, matchId, predictedHome, predictedAway },
    update: { predictedHome, predictedAway },
  });

  return NextResponse.json(bet);
}
