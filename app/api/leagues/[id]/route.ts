import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/leagues/[id] — détails d'une ligue avec ses membres
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const league = await prisma.league.findUnique({
    where: { id: params.id },
    include: {
      members: { include: { user: true } },
    },
  });

  if (!league) {
    return NextResponse.json({ error: "Ligue introuvable" }, { status: 404 });
  }

  return NextResponse.json(league);
}

// PATCH /api/leagues/[id] — modifier les règles de points (admin seulement)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const {
    pointsExactScore,
    pointsCorrectWinner,
    pointsCorrectDiff,
    knockoutPointsExactScore,
    knockoutPointsCorrectOutcome,
    knockoutPointsETBonus,
    knockoutPointsETExact,
    knockoutPointsTABBonus,
    requesterId,
  } = await req.json();

  // Vérifier que le demandeur est bien l'admin
  const league = await prisma.league.findUnique({ where: { id: params.id } });
  if (!league) {
    return NextResponse.json({ error: "Ligue introuvable" }, { status: 404 });
  }
  if (league.ownerId !== requesterId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const updated = await prisma.league.update({
    where: { id: params.id },
    data: {
      ...(pointsExactScore !== undefined && { pointsExactScore }),
      ...(pointsCorrectWinner !== undefined && { pointsCorrectWinner }),
      ...(pointsCorrectDiff !== undefined && { pointsCorrectDiff }),
      ...(knockoutPointsExactScore !== undefined && { knockoutPointsExactScore }),
      ...(knockoutPointsCorrectOutcome !== undefined && { knockoutPointsCorrectOutcome }),
      ...(knockoutPointsETBonus !== undefined && { knockoutPointsETBonus }),
      ...(knockoutPointsETExact !== undefined && { knockoutPointsETExact }),
      ...(knockoutPointsTABBonus !== undefined && { knockoutPointsTABBonus }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/leagues/[id] — retirer un membre
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { memberUserId, requesterId } = await req.json();

  const league = await prisma.league.findUnique({ where: { id: params.id } });
  if (!league) {
    return NextResponse.json({ error: "Ligue introuvable" }, { status: 404 });
  }
  if (league.ownerId !== requesterId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  if (memberUserId === league.ownerId) {
    return NextResponse.json(
      { error: "L'admin ne peut pas se retirer" },
      { status: 400 }
    );
  }

  await prisma.leagueMember.delete({
    where: { userId_leagueId: { userId: memberUserId, leagueId: params.id } },
  });

  return NextResponse.json({ success: true });
}
