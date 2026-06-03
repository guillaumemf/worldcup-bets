import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/users/[id]/bets — tous les paris d'un utilisateur sur les matchs terminés
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const bets = await prisma.bet.findMany({
    where: {
      userId: params.id,
      match: { status: "FINISHED" },
    },
    include: { match: true },
    orderBy: { match: { kickoffAt: "desc" } },
  });

  return NextResponse.json(bets);
}
