import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /api/leagues — crée une nouvelle ligue
export async function POST(req: NextRequest) {
  const { name, ownerId } = await req.json();

  if (!name || !ownerId) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  let code = generateCode();
  // S'assurer que le code est unique
  while (await prisma.league.findUnique({ where: { code } })) {
    code = generateCode();
  }

  const league = await prisma.league.create({
    data: {
      name,
      code,
      ownerId,
      members: { create: { userId: ownerId } }, // l'admin est automatiquement membre
    },
    include: { members: true },
  });

  return NextResponse.json(league, { status: 201 });
}
