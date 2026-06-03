"use client";

type Standing = {
  rank: number;
  userId: string;
  username: string;
  totalPoints: number;
  exactScores: number;
  betsCount: number;
};

export default function Standings({
  standings,
  currentUserId,
}: {
  standings: Standing[];
  currentUserId: string;
}) {
  if (standings.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-4">Aucun pari joué pour l'instant.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
            <th className="py-2 px-3 text-left w-8">#</th>
            <th className="py-2 px-3 text-left">Joueur</th>
            <th className="py-2 px-3 text-right">Pts</th>
            <th className="py-2 px-3 text-right">Exact</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => (
            <tr
              key={s.userId}
              className={`border-t border-gray-100 ${
                s.userId === currentUserId ? "bg-green-50 font-semibold" : "bg-white"
              }`}
            >
              <td className="py-2 px-3 text-gray-400">{s.rank}</td>
              <td className="py-2 px-3">
                {s.username}
                {s.userId === currentUserId && (
                  <span className="ml-1 text-xs text-green-600">(toi)</span>
                )}
              </td>
              <td className="py-2 px-3 text-right font-bold">{s.totalPoints}</td>
              <td className="py-2 px-3 text-right text-gray-500">{s.exactScores}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
