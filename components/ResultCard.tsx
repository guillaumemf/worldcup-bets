type Match = {
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  kickoffAt: string;
  stage: string;
};

type BetWithMatch = {
  id: string;
  predictedHome: number;
  predictedAway: number;
  points: number | null;
  match: Match;
};

function getPointsBadge(points: number): { label: string; color: string } {
  if (points > 3) return { label: `+${points} pts`, color: "text-green-400 bg-green-950" };
  if (points === 3) return { label: "Score exact", color: "text-green-400 bg-green-950" };
  if (points === 2) return { label: "Bonne diff.", color: "text-blue-400 bg-blue-950" };
  if (points === 1) return { label: "Bon vainqueur", color: "text-yellow-400 bg-yellow-950" };
  if (points === 0) return { label: "Raté", color: "text-gray-400 bg-gray-800" };
  return { label: `${points} pts`, color: "text-red-400 bg-red-950" }; // négatif
}

export default function ResultCard({ bet }: { bet: BetWithMatch }) {
  const { match, predictedHome, predictedAway, points } = bet;
  const badge = points !== null ? getPointsBadge(points) : null;

  const kickoff = new Date(match.kickoffAt);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs text-gray-400">
          {kickoff.toLocaleDateString("fr-FR", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </span>
        {badge && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.color}`}>
            +{points} pt{points !== 1 ? "s" : ""} — {badge.label}
          </span>
        )}
      </div>

      {/* Équipes + scores */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-right flex-1">{match.homeTeam}</span>

        <div className="flex flex-col items-center gap-1">
          {/* Score réel */}
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-bold w-8 text-center">{match.homeScore ?? "?"}</span>
            <span className="text-gray-400">–</span>
            <span className="text-2xl font-bold w-8 text-center">{match.awayScore ?? "?"}</span>
          </div>
          {/* Pronostic */}
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <span className="w-8 text-center">{predictedHome}</span>
            <span>–</span>
            <span className="w-8 text-center">{predictedAway}</span>
          </div>
          <span className="text-xs text-gray-500">ton pari</span>
        </div>

        <span className="font-semibold text-left flex-1">{match.awayTeam}</span>
      </div>
    </div>
  );
}
