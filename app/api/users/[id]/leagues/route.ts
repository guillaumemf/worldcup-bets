import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/users/[id]/leagues — ligues d'un utilisateur
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const memberships = await prisma.leagueMember.findMany({
    where: { userId: params.id },
    include: {
      league: {
        include: {
          members: { include: { user: true } },
        },
      },
    },
  });

  const leagues = memberships.map((m) => m.league);
  return NextResponse.json(leagues);
}
