import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/matches?userId=xxx — matchs à venir + paris de l'utilisateur
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  const matches = await prisma.match.findMany({
    where: { status: { in: ["UPCOMING", "LIVE"] as string[] } },
    orderBy: { kickoffAt: "asc" },
    take: 20,
    include: userId
      ? { bets: { where: { userId } } }
      : undefined,
  });

  return NextResponse.json(matches);
}
