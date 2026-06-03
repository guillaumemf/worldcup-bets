import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/leagues/join — rejoindre une ligue via son code
export async function POST(req: NextRequest) {
  const { code, userId } = await req.json();

  const league = await prisma.league.findUnique({ where: { code } });
  if (!league) {
    return NextResponse.json({ error: "Code invalide" }, { status: 404 });
  }

  // Vérifier si déjà membre
  const existing = await prisma.leagueMember.findUnique({
    where: { userId_leagueId: { userId, leagueId: league.id } },
  });
  if (existing) {
    return NextResponse.json(league); // déjà membre, on renvoie la ligue
  }

  await prisma.leagueMember.create({
    data: { userId, leagueId: league.id },
  });

  return NextResponse.json(league, { status: 201 });
}
