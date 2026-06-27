/**
 * Script de mapping des externalId football-data.org
 * Appelle l'API une fois, croise avec notre DB, et remplit les externalId.
 * Gère aussi les matchs de phase finale (TBD) en matchant par timestamp exact.
 *
 * Usage : npm run db:map-ids
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const API_KEY = process.env.FOOTBALL_DATA_API_KEY!;

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[-_'.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

// Vérifie si un nom d'équipe est un placeholder (pas encore connu)
function isPlaceholder(name: string): boolean {
  return /^(TBD|tbd|[0-9][A-Z]|1[A-Z]|2[A-Z]|QF|SF|Vainqueur|Perdant|qualifié)/i.test(name.trim());
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
    console.error(await res.text());
    process.exit(1);
  }

  const data = await res.json();
  const apiMatches = data.matches as Array<{
    id: number;
    homeTeam: { name: string };
    awayTeam: { name: string };
    utcDate: string;
    status: string;
    stage: string;
  }>;

  console.log(`✅ ${apiMatches.length} matchs récupérés depuis l'API`);

  const dbMatches = await prisma.match.findMany();
  console.log(`📦 ${dbMatches.length} matchs en base\n`);

  let matched = 0;
  let skipped = 0;
  const unmatched: string[] = [];

  for (const apiMatch of apiMatches) {
    const apiTime = new Date(apiMatch.utcDate).getTime();
    const apiHome = resolveAlias(apiMatch.homeTeam?.name ?? "");
    const apiAway = resolveAlias(apiMatch.awayTeam?.name ?? "");
    const apiIsKnockout = apiMatch.homeTeam?.name === null || apiMatch.homeTeam?.name === "TBD" || apiMatch.homeTeam?.name === undefined;

    let found = dbMatches.find((m) => {
      // Stratégie 1 : match par noms d'équipes + même jour (phase de groupes)
      if (!isPlaceholder(m.homeTeam) && !apiIsKnockout) {
        const dbHome = resolveAlias(m.homeTeam);
        const dbAway = resolveAlias(m.awayTeam);
        const dbDate = new Date(m.kickoffAt);
        const apiDate = new Date(apiMatch.utcDate);
        const sameDay =
          dbDate.getUTCFullYear() === apiDate.getUTCFullYear() &&
          dbDate.getUTCMonth() === apiDate.getUTCMonth() &&
          dbDate.getUTCDate() === apiDate.getUTCDate();
        return dbHome === apiHome && dbAway === apiAway && sameDay;
      }
      return false;
    });

    // Stratégie 2 : match par timestamp exact (phase finale, équipes TBD)
    if (!found && apiIsKnockout) {
      found = dbMatches.find((m) => {
        if (!isPlaceholder(m.homeTeam)) return false; // ne pas écraser les matchs déjà identifiés
        const dbTime = new Date(m.kickoffAt).getTime();
        return Math.abs(dbTime - apiTime) < 60 * 1000; // tolérance 1 minute
      });
    }

    if (found) {
      if (found.externalId === String(apiMatch.id)) {
        skipped++;
        continue;
      }
      await prisma.match.update({
        where: { id: found.id },
        data: { externalId: String(apiMatch.id) },
      });
      console.log(`  ✓ [${apiMatch.stage}] ${found.homeTeam} vs ${found.awayTeam} → externalId=${apiMatch.id}`);
      matched++;
    } else {
      unmatched.push(
        `  ✗ [${apiMatch.stage}] "${apiMatch.homeTeam?.name ?? "TBD"}" vs "${apiMatch.awayTeam?.name ?? "TBD"}" (${apiMatch.utcDate})`
      );
    }
  }

  console.log(`\n📊 Résultat :`);
  console.log(`  ${matched} matchs mappés`);
  console.log(`  ${skipped} déjà à jour`);
  console.log(`  ${unmatched.length} non trouvés en DB`);

  if (unmatched.length > 0) {
    console.log(`\n⚠️  Non trouvés :`);
    unmatched.forEach((m) => console.log(m));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
