type MemberBet = {
  userId: string;
  username: string;
  predictedHome: number | null;
  predictedAway: number | null;
  points: number | null;
};

export default function LeagueBetsPanel({
  memberBets,
  currentUserId,
  showPoints,
}: {
  memberBets: MemberBet[];
  currentUserId: string;
  showPoints: boolean; // true si FINISHED, false si LIVE
}) {
  if (memberBets.length === 0) return null;

  return (
    <div className="mt-3 border-t border-gray-700 pt-3">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 font-semibold">
        Paris de la ligue
      </p>
      <div className="flex flex-col gap-1">
        {memberBets.map((m) => (
          <div
            key={m.userId}
            className={`flex items-center justify-between text-sm px-2 py-1 rounded-lg ${
              m.userId === currentUserId
                ? "bg-red-950 text-red-100"
                : "bg-gray-800 text-gray-300"
            }`}
          >
            <span className="font-medium">
              {m.username}
              {m.userId === currentUserId && (
                <span className="ml-1 text-xs text-red-400">(toi)</span>
              )}
            </span>

            <div className="flex items-center gap-3">
              {m.predictedHome !== null && m.predictedAway !== null ? (
                <span className="font-bold tabular-nums">
                  {m.predictedHome} – {m.predictedAway}
                </span>
              ) : (
                <span className="text-gray-500 italic text-xs">pas de pari</span>
              )}

              {showPoints && m.points !== null && (
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                    m.points >= 3
                      ? "text-green-400 bg-green-950"
                      : m.points > 0
                      ? "text-yellow-400 bg-yellow-950"
                      : m.points === 0
                      ? "text-gray-400 bg-gray-700"
                      : "text-red-400 bg-red-950"
                  }`}
                >
                  {m.points > 0 ? `+${m.points}` : m.points} pt{Math.abs(m.points) !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
