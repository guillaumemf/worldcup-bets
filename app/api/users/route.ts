import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/users — crée ou récupère un utilisateur par son nom
export async function POST(req: NextRequest) {
  const { username } = await req.json();

  if (!username || typeof username !== "string" || username.trim().length < 2) {
    return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
  }

  const name = username.trim();

  // Si l'utilisateur existe déjà, on le retourne directement
  const existing = await prisma.user.findUnique({ where: { username: name } });
  if (existing) {
    return NextResponse.json(existing);
  }

  const user = await prisma.user.create({ data: { username: name } });
  return NextResponse.json(user, { status: 201 });
}
