import { writeFileSync } from "fs";

const res = await fetch(
  "https://api.football-data.org/v4/competitions/WC/matches?season=2026",
  { headers: { "X-Auth-Token": "bdb4fde15a4144b9b18e89dc3266b063" } }
);
const data = await res.json();

const lines = data.matches.map((m) => {
  const home = m.homeTeam?.name ?? "TBD";
  const away = m.awayTeam?.name ?? "TBD";
  return `${m.id} | ${home} vs ${away} | ${m.utcDate.slice(0, 10)} | ${m.stage}`;
});

const output = lines.join("\n");
console.log(output);
writeFileSync("api-matches.txt", output);
console.log("\n✅ Fichier api-matches.txt créé");
