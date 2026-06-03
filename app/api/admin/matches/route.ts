import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/matches — tous les matchs (admin)
export async function GET(req: NextRequest) {
  const adminPassword = req.headers.get("x-admin-password");
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const matches = await prisma.match.findMany({
    orderBy: { kickoffAt: "asc" },
    include: { _count: { select: { bets: true } } },
  });

  return NextResponse.json(matches);
}
