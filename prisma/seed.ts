import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Convertit la date + heure UTC-offset en objet Date UTC
function parseKickoff(date: string, time: string): Date {
  // Exemple : date="2026-06-11", time="13:00 UTC-6"
  const [hours, minutes] = time.split(" ")[0].split(":").map(Number);
  const offsetMatch = time.match(/UTC([+-]\d+)/);
  const offsetHours = offsetMatch ? parseInt(offsetMatch[1]) : 0;

  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCHours(hours - offsetHours); // convertit en UTC
  d.setUTCMinutes(minutes);
  return d;
}

function roundToStage(round: string): string {
  if (round.startsWith("Matchday")) return "GROUP";
  if (round === "Round of 32") return "ROUND_OF_32";
  if (round === "Round of 16") return "ROUND_OF_16";
  if (round === "Quarter-final") return "QUARTER_FINAL";
  if (round === "Semi-final") return "SEMI_FINAL";
  if (round === "Match for third place") return "THIRD_PLACE";
  if (round === "Final") return "FINAL";
  return "GROUP";
}

const matches = [
  // ── Groupe A ──────────────────────────────────────────────────────────
  { round: "Matchday 1",  date: "2026-06-11", time: "13:00 UTC-6", team1: "Mexico",            team2: "South Africa" },
  { round: "Matchday 1",  date: "2026-06-11", time: "20:00 UTC-6", team1: "South Korea",       team2: "UEFA Path D" },
  { round: "Matchday 8",  date: "2026-06-18", time: "12:00 UTC-4", team1: "UEFA Path D",       team2: "South Africa" },
  { round: "Matchday 8",  date: "2026-06-18", time: "19:00 UTC-6", team1: "Mexico",            team2: "South Korea" },
  { round: "Matchday 14", date: "2026-06-24", time: "19:00 UTC-6", team1: "UEFA Path D",       team2: "Mexico" },
  { round: "Matchday 14", date: "2026-06-24", time: "19:00 UTC-6", team1: "South Africa",      team2: "South Korea" },
  // ── Groupe B ──────────────────────────────────────────────────────────
  { round: "Matchday 2",  date: "2026-06-12", time: "15:00 UTC-4", team1: "Canada",            team2: "UEFA Path A" },
  { round: "Matchday 3",  date: "2026-06-13", time: "12:00 UTC-7", team1: "Qatar",             team2: "Switzerland" },
  { round: "Matchday 8",  date: "2026-06-18", time: "12:00 UTC-7", team1: "Switzerland",       team2: "UEFA Path A" },
  { round: "Matchday 8",  date: "2026-06-18", time: "15:00 UTC-7", team1: "Canada",            team2: "Qatar" },
  { round: "Matchday 14", date: "2026-06-24", time: "12:00 UTC-7", team1: "Switzerland",       team2: "Canada" },
  { round: "Matchday 14", date: "2026-06-24", time: "12:00 UTC-7", team1: "UEFA Path A",       team2: "Qatar" },
  // ── Groupe C ──────────────────────────────────────────────────────────
  { round: "Matchday 3",  date: "2026-06-13", time: "18:00 UTC-4", team1: "Brazil",            team2: "Morocco" },
  { round: "Matchday 3",  date: "2026-06-13", time: "21:00 UTC-4", team1: "Haiti",             team2: "Scotland" },
  { round: "Matchday 9",  date: "2026-06-19", time: "18:00 UTC-4", team1: "Scotland",          team2: "Morocco" },
  { round: "Matchday 9",  date: "2026-06-19", time: "21:00 UTC-4", team1: "Brazil",            team2: "Haiti" },
  { round: "Matchday 14", date: "2026-06-24", time: "18:00 UTC-4", team1: "Scotland",          team2: "Brazil" },
  { round: "Matchday 14", date: "2026-06-24", time: "18:00 UTC-4", team1: "Morocco",           team2: "Haiti" },
  // ── Groupe D ──────────────────────────────────────────────────────────
  { round: "Matchday 2",  date: "2026-06-12", time: "18:00 UTC-7", team1: "USA",               team2: "Paraguay" },
  { round: "Matchday 3",  date: "2026-06-13", time: "21:00 UTC-7", team1: "Australia",         team2: "UEFA Path C" },
  { round: "Matchday 9",  date: "2026-06-19", time: "12:00 UTC-7", team1: "USA",               team2: "Australia" },
  { round: "Matchday 9",  date: "2026-06-19", time: "21:00 UTC-7", team1: "UEFA Path C",       team2: "Paraguay" },
  { round: "Matchday 15", date: "2026-06-25", time: "19:00 UTC-7", team1: "UEFA Path C",       team2: "USA" },
  { round: "Matchday 15", date: "2026-06-25", time: "19:00 UTC-7", team1: "Paraguay",          team2: "Australia" },
  // ── Groupe E ──────────────────────────────────────────────────────────
  { round: "Matchday 4",  date: "2026-06-14", time: "12:00 UTC-5", team1: "Germany",           team2: "Curaçao" },
  { round: "Matchday 4",  date: "2026-06-14", time: "19:00 UTC-4", team1: "Ivory Coast",       team2: "Ecuador" },
  { round: "Matchday 10", date: "2026-06-20", time: "16:00 UTC-4", team1: "Germany",           team2: "Ivory Coast" },
  { round: "Matchday 10", date: "2026-06-20", time: "19:00 UTC-5", team1: "Ecuador",           team2: "Curaçao" },
  { round: "Matchday 15", date: "2026-06-25", time: "16:00 UTC-4", team1: "Curaçao",           team2: "Ivory Coast" },
  { round: "Matchday 15", date: "2026-06-25", time: "16:00 UTC-4", team1: "Ecuador",           team2: "Germany" },
  // ── Groupe F ──────────────────────────────────────────────────────────
  { round: "Matchday 4",  date: "2026-06-14", time: "15:00 UTC-5", team1: "Netherlands",       team2: "Japan" },
  { round: "Matchday 4",  date: "2026-06-14", time: "20:00 UTC-6", team1: "UEFA Path B",       team2: "Tunisia" },
  { round: "Matchday 10", date: "2026-06-20", time: "12:00 UTC-5", team1: "Netherlands",       team2: "UEFA Path B" },
  { round: "Matchday 10", date: "2026-06-20", time: "22:00 UTC-6", team1: "Tunisia",           team2: "Japan" },
  { round: "Matchday 15", date: "2026-06-25", time: "18:00 UTC-5", team1: "Japan",             team2: "UEFA Path B" },
  { round: "Matchday 15", date: "2026-06-25", time: "18:00 UTC-5", team1: "Tunisia",           team2: "Netherlands" },
  // ── Groupe G ──────────────────────────────────────────────────────────
  { round: "Matchday 5",  date: "2026-06-15", time: "12:00 UTC-7", team1: "Belgium",           team2: "Egypt" },
  { round: "Matchday 5",  date: "2026-06-15", time: "18:00 UTC-7", team1: "Iran",              team2: "New Zealand" },
  { round: "Matchday 11", date: "2026-06-21", time: "12:00 UTC-7", team1: "Belgium",           team2: "Iran" },
  { round: "Matchday 11", date: "2026-06-21", time: "18:00 UTC-7", team1: "New Zealand",       team2: "Egypt" },
  { round: "Matchday 16", date: "2026-06-26", time: "20:00 UTC-7", team1: "Egypt",             team2: "Iran" },
  { round: "Matchday 16", date: "2026-06-26", time: "20:00 UTC-7", team1: "New Zealand",       team2: "Belgium" },
  // ── Groupe H ──────────────────────────────────────────────────────────
  { round: "Matchday 5",  date: "2026-06-15", time: "12:00 UTC-4", team1: "Spain",             team2: "Cape Verde" },
  { round: "Matchday 5",  date: "2026-06-15", time: "18:00 UTC-4", team1: "Saudi Arabia",      team2: "Uruguay" },
  { round: "Matchday 11", date: "2026-06-21", time: "12:00 UTC-4", team1: "Spain",             team2: "Saudi Arabia" },
  { round: "Matchday 11", date: "2026-06-21", time: "18:00 UTC-4", team1: "Uruguay",           team2: "Cape Verde" },
  { round: "Matchday 16", date: "2026-06-26", time: "19:00 UTC-5", team1: "Cape Verde",        team2: "Saudi Arabia" },
  { round: "Matchday 16", date: "2026-06-26", time: "18:00 UTC-6", team1: "Uruguay",           team2: "Spain" },
  // ── Groupe I ──────────────────────────────────────────────────────────
  { round: "Matchday 6",  date: "2026-06-16", time: "15:00 UTC-4", team1: "France",            team2: "Senegal" },
  { round: "Matchday 6",  date: "2026-06-16", time: "18:00 UTC-4", team1: "IC Path 2",         team2: "Norway" },
  { round: "Matchday 12", date: "2026-06-22", time: "17:00 UTC-4", team1: "France",            team2: "IC Path 2" },
  { round: "Matchday 12", date: "2026-06-22", time: "20:00 UTC-4", team1: "Norway",            team2: "Senegal" },
  { round: "Matchday 16", date: "2026-06-26", time: "15:00 UTC-4", team1: "Norway",            team2: "France" },
  { round: "Matchday 16", date: "2026-06-26", time: "15:00 UTC-4", team1: "Senegal",           team2: "IC Path 2" },
  // ── Groupe J ──────────────────────────────────────────────────────────
  { round: "Matchday 6",  date: "2026-06-16", time: "20:00 UTC-5", team1: "Argentina",         team2: "Algeria" },
  { round: "Matchday 6",  date: "2026-06-16", time: "21:00 UTC-7", team1: "Austria",           team2: "Jordan" },
  { round: "Matchday 12", date: "2026-06-22", time: "12:00 UTC-5", team1: "Argentina",         team2: "Austria" },
  { round: "Matchday 12", date: "2026-06-22", time: "20:00 UTC-7", team1: "Jordan",            team2: "Algeria" },
  { round: "Matchday 17", date: "2026-06-27", time: "21:00 UTC-5", team1: "Algeria",           team2: "Austria" },
  { round: "Matchday 17", date: "2026-06-27", time: "21:00 UTC-5", team1: "Jordan",            team2: "Argentina" },
  // ── Groupe K ──────────────────────────────────────────────────────────
  { round: "Matchday 7",  date: "2026-06-17", time: "12:00 UTC-5", team1: "Portugal",          team2: "IC Path 1" },
  { round: "Matchday 7",  date: "2026-06-17", time: "20:00 UTC-6", team1: "Uzbekistan",        team2: "Colombia" },
  { round: "Matchday 13", date: "2026-06-23", time: "12:00 UTC-5", team1: "Portugal",          team2: "Uzbekistan" },
  { round: "Matchday 13", date: "2026-06-23", time: "20:00 UTC-6", team1: "Colombia",          team2: "IC Path 1" },
  { round: "Matchday 17", date: "2026-06-27", time: "19:30 UTC-4", team1: "Colombia",          team2: "Portugal" },
  { round: "Matchday 17", date: "2026-06-27", time: "19:30 UTC-4", team1: "IC Path 1",         team2: "Uzbekistan" },
  // ── Groupe L ──────────────────────────────────────────────────────────
  { round: "Matchday 7",  date: "2026-06-17", time: "15:00 UTC-5", team1: "England",           team2: "Croatia" },
  { round: "Matchday 7",  date: "2026-06-17", time: "19:00 UTC-4", team1: "Ghana",             team2: "Panama" },
  { round: "Matchday 13", date: "2026-06-23", time: "16:00 UTC-4", team1: "England",           team2: "Ghana" },
  { round: "Matchday 13", date: "2026-06-23", time: "19:00 UTC-4", team1: "Panama",            team2: "Croatia" },
  { round: "Matchday 17", date: "2026-06-27", time: "17:00 UTC-4", team1: "Panama",            team2: "England" },
  { round: "Matchday 17", date: "2026-06-27", time: "17:00 UTC-4", team1: "Croatia",           team2: "Ghana" },
  // ── Phase finale ──────────────────────────────────────────────────────
  { round: "Round of 32", date: "2026-06-28", time: "12:00 UTC-7", team1: "2A", team2: "2B" },
  { round: "Round of 32", date: "2026-06-29", time: "16:30 UTC-4", team1: "1E", team2: "3e qualifié" },
  { round: "Round of 32", date: "2026-06-29", time: "19:00 UTC-6", team1: "1F", team2: "2C" },
  { round: "Round of 32", date: "2026-06-29", time: "12:00 UTC-5", team1: "1C", team2: "2F" },
  { round: "Round of 32", date: "2026-06-30", time: "17:00 UTC-4", team1: "1I", team2: "3e qualifié" },
  { round: "Round of 32", date: "2026-06-30", time: "12:00 UTC-5", team1: "2E", team2: "2I" },
  { round: "Round of 32", date: "2026-06-30", time: "19:00 UTC-6", team1: "1A", team2: "3e qualifié" },
  { round: "Round of 32", date: "2026-07-01", time: "12:00 UTC-4", team1: "1L", team2: "3e qualifié" },
  { round: "Round of 32", date: "2026-07-01", time: "17:00 UTC-7", team1: "1D", team2: "3e qualifié" },
  { round: "Round of 32", date: "2026-07-01", time: "13:00 UTC-7", team1: "1G", team2: "3e qualifié" },
  { round: "Round of 32", date: "2026-07-02", time: "19:00 UTC-4", team1: "2K", team2: "2L" },
  { round: "Round of 32", date: "2026-07-02", time: "12:00 UTC-7", team1: "1H", team2: "2J" },
  { round: "Round of 32", date: "2026-07-02", time: "20:00 UTC-7", team1: "1B", team2: "3e qualifié" },
  { round: "Round of 32", date: "2026-07-03", time: "18:00 UTC-4", team1: "1J", team2: "2H" },
  { round: "Round of 32", date: "2026-07-03", time: "20:30 UTC-5", team1: "1K", team2: "3e qualifié" },
  { round: "Round of 32", date: "2026-07-03", time: "13:00 UTC-5", team1: "2D", team2: "2G" },
  { round: "Round of 16",       date: "2026-07-04", time: "17:00 UTC-4", team1: "Vainqueur M74", team2: "Vainqueur M77" },
  { round: "Round of 16",       date: "2026-07-04", time: "12:00 UTC-5", team1: "Vainqueur M73", team2: "Vainqueur M75" },
  { round: "Round of 16",       date: "2026-07-05", time: "16:00 UTC-4", team1: "Vainqueur M76", team2: "Vainqueur M78" },
  { round: "Round of 16",       date: "2026-07-05", time: "18:00 UTC-6", team1: "Vainqueur M79", team2: "Vainqueur M80" },
  { round: "Round of 16",       date: "2026-07-06", time: "14:00 UTC-5", team1: "Vainqueur M83", team2: "Vainqueur M84" },
  { round: "Round of 16",       date: "2026-07-06", time: "17:00 UTC-7", team1: "Vainqueur M81", team2: "Vainqueur M82" },
  { round: "Round of 16",       date: "2026-07-07", time: "12:00 UTC-4", team1: "Vainqueur M86", team2: "Vainqueur M88" },
  { round: "Round of 16",       date: "2026-07-07", time: "13:00 UTC-7", team1: "Vainqueur M85", team2: "Vainqueur M87" },
  { round: "Quarter-final",     date: "2026-07-09", time: "16:00 UTC-4", team1: "QF1",           team2: "QF2" },
  { round: "Quarter-final",     date: "2026-07-10", time: "12:00 UTC-7", team1: "QF3",           team2: "QF4" },
  { round: "Quarter-final",     date: "2026-07-11", time: "17:00 UTC-4", team1: "QF5",           team2: "QF6" },
  { round: "Quarter-final",     date: "2026-07-11", time: "20:00 UTC-5", team1: "QF7",           team2: "QF8" },
  { round: "Semi-final",        date: "2026-07-14", time: "14:00 UTC-5", team1: "SF1",           team2: "SF2" },
  { round: "Semi-final",        date: "2026-07-15", time: "15:00 UTC-4", team1: "SF3",           team2: "SF4" },
  { round: "Match for third place", date: "2026-07-18", time: "17:00 UTC-4", team1: "Perdant SF1", team2: "Perdant SF2" },
  { round: "Final",             date: "2026-07-19", time: "15:00 UTC-4", team1: "Vainqueur SF1", team2: "Vainqueur SF2" },
];

async function main() {
  console.log("🌱 Seeding matches...");

  // Supprimer les matchs existants pour repartir de zéro
  await prisma.bet.deleteMany();
  await prisma.match.deleteMany();

  for (const m of matches) {
    const kickoffAt = parseKickoff(m.date, m.time);
    const stage = roundToStage(m.round);
    const status: MatchStatus =
      new Date() > kickoffAt ? "FINISHED" : "UPCOMING";

    await prisma.match.create({
      data: {
        homeTeam: m.team1,
        awayTeam: m.team2,
        kickoffAt,
        stage,
        status,
      },
    });
  }

  console.log(`✅ ${matches.length} matchs insérés.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
