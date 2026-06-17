/**
 * Script de mapping des externalId football-data.org
 * Appelle l'API une fois, croise avec notre DB, et remplit les externalId.
 *
 * Usage : npm run db:map-ids
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const API_KEY = process.env.FOOTBALL_DATA_API_KEY!;

// Normalise un nom d'équipe pour la comparaison (minuscules, sans accents, sans tirets)
function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[-_'\.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Quelques alias connus entre notre seed et football-data.org
const ALIASES: Record<string, string> = {
  "united states": "usa",
  "dr congo": "congo dr",
  "democratic republic of congo": "congo dr",
  "bosnia & herzegovina": "bosnia-herzegovina",
  "bosnia and herzegovina": "bosnia-herzegovina",
  "czech republic": "czechia",
  "ivory coast": "cote d'ivoire",
  "south korea": "korea republic",
  "north korea": "korea dpr",
  "trinidad & tobago": "trinidad and tobago",
};

function resolveAlias(name: string): string {
  const n = normalize(name);
  return ALIASES[n] ?? n;
}

async function main() {
  if (!API_KEY) {
    console.error("❌ FOOTBALL_DATA_API_KEY manquante dans .env");
    process.exit(1);
  }

  console.log("📡 Appel football-data.org...");
  const res = await fetch(
    "https://api.football-data.org/v4/competitions/WC/matches?season=2026",
    { headers: { "X-Auth-Token": API_KEY } }
  );

  if (!res.ok) {
    console.error(`❌ Erreur API: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.error(text);
    process.exit(1);
  }

  const data = await res.json();
  const apiMatches = data.matches as Array<{
    id: number;
    homeTeam: { name: string; shortName: string };
    awayTeam: { name: string; shortName: string };
    utcDate: string;
    status: string;
  }>;

  console.log(`✅ ${apiMatches.length} matchs récupérés depuis l'API`);

  const dbMatches = await prisma.match.findMany();
  console.log(`📦 ${dbMatches.length} matchs en base`);

  let matched = 0;
  let skipped = 0;
  const unmatched: string[] = [];

  for (const apiMatch of apiMatches) {
    const apiHome = resolveAlias(apiMatch.homeTeam.name);
    const apiAway = resolveAlias(apiMatch.awayTeam.name);
    const apiDate = new Date(apiMatch.utcDate);

    // Cherche le match en DB par équipes normalisées + même jour
    const found = dbMatches.find((m) => {
      const dbHome = resolveAlias(m.homeTeam);
      const dbAway = resolveAlias(m.awayTeam);
      const dbDate = new Date(m.kickoffAt);

      const sameTeams = dbHome === apiHome && dbAway === apiAway;
      const sameDay =
        dbDate.getUTCFullYear() === apiDate.getUTCFullYear() &&
        dbDate.getUTCMonth() === apiDate.getUTCMonth() &&
        dbDate.getUTCDate() === apiDate.getUTCDate();

      return sameTeams && sameDay;
    });

    if (found) {
      if (found.externalId === String(apiMatch.id)) {
        skipped++;
        continue;
      }
      await prisma.match.update({
        where: { id: found.id },
        data: { externalId: String(apiMatch.id) },
      });
      console.log(
        `  ✓ ${found.homeTeam} - ${found.awayTeam} → externalId=${apiMatch.id}`
      );
      matched++;
    } else {
      unmatched.push(
        `  ✗ API: "${apiMatch.homeTeam.name}" - "${apiMatch.awayTeam.name}" (${apiMatch.utcDate.slice(0, 10)})`
      );
    }
  }

  console.log(`\n📊 Résultat :`);
  console.log(`  ${matched} matchs mappés`);
  console.log(`  ${skipped} déjà à jour`);
  console.log(`  ${unmatched.length} non trouvés en DB`);

  if (unmatched.length > 0) {
    console.log(`\n⚠️  Matchs API sans correspondance en DB :`);
    unmatched.forEach((m) => console.log(m));
    console.log(
      "\nPour ces matchs, vérifie les noms d'équipes dans le seed et ajoute un alias dans ALIASES si besoin."
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
