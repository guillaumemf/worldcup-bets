"use client";

type DataPoint = {
  label: string;
  kickoffAt: string;
  points: Record<string, number>;
};

type User = {
  userId: string;
  username: string;
};

type Props = {
  users: User[];
  data: DataPoint[];
  currentUserId: string;
};

// Palette de couleurs pour les joueurs (le joueur courant sera toujours rouge)
const COLORS = [
  "#ef4444", // rouge — réservé au joueur courant
  "#3b82f6", // bleu
  "#22c55e", // vert
  "#f59e0b", // orange
  "#a855f7", // violet
  "#06b6d4", // cyan
  "#f43f5e", // rose
  "#84cc16", // lime
];

const W = 600;
const H = 260;
const PAD = { top: 16, right: 16, bottom: 40, left: 40 };
const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;

export default function PointsChart({ users, data, currentUserId }: Props) {
  if (data.length === 0) return null;

  // Assigne une couleur à chaque joueur (le joueur courant toujours rouge = index 0)
  const colorMap: Record<string, string> = {};
  let colorIndex = 1;
  for (const u of users) {
    if (u.userId === currentUserId) {
      colorMap[u.userId] = COLORS[0];
    } else {
      colorMap[u.userId] = COLORS[colorIndex % (COLORS.length - 1) + 1];
      colorIndex++;
    }
  }

  // Calcule les bornes
  const maxPoints = Math.max(
    ...users.flatMap((u) => data.map((d) => d.points[u.userId] ?? 0))
  );
  const yMax = Math.max(maxPoints, 1);

  // Helpers de projection
  const xOf = (i: number) =>
    PAD.left + (i / Math.max(data.length - 1, 1)) * CHART_W;
  const yOf = (pts: number) =>
    PAD.top + CHART_H - (pts / yMax) * CHART_H;

  // Graduations Y (4 lignes)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * yMax));

  // Sépare le joueur courant pour le mettre en dernier (au-dessus)
  const others = users.filter((u) => u.userId !== currentUserId);
  const current = users.find((u) => u.userId === currentUserId);
  const ordered = current ? [...others, current] : others;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: 280 }}
        aria-label="Évolution des points"
      >
        {/* Grille horizontale */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={PAD.left + CHART_W}
              y1={yOf(tick)}
              y2={yOf(tick)}
              stroke="#374151"
              strokeWidth={1}
              strokeDasharray={tick === 0 ? "none" : "4 3"}
            />
            <text
              x={PAD.left - 6}
              y={yOf(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              fill="#6b7280"
            >
              {tick}
            </text>
          </g>
        ))}

        {/* Labels X : dates (max ~10 pour éviter l'encombrement) */}
        {data.map((d, i) => {
          const step = Math.ceil(data.length / 10);
          if (i % step !== 0) return null;
          const date = new Date(d.kickoffAt);
          const label = date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
          return (
            <text
              key={i}
              x={xOf(i)}
              y={H - PAD.bottom + 14}
              textAnchor="middle"
              fontSize={9}
              fill="#6b7280"
            >
              {label}
            </text>
          );
        })}

        {/* Courbes */}
        {ordered.map((u) => {
          const color = colorMap[u.userId];
          const isCurrentUser = u.userId === currentUserId;

          const points = data
            .map((d, i) => `${xOf(i)},${yOf(d.points[u.userId] ?? 0)}`)
            .join(" ");

          return (
            <g key={u.userId}>
              <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth={isCurrentUser ? 2.5 : 1.5}
                strokeOpacity={isCurrentUser ? 1 : 0.7}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {/* Point final */}
              {data.length > 0 && (
                <circle
                  cx={xOf(data.length - 1)}
                  cy={yOf(data[data.length - 1].points[u.userId] ?? 0)}
                  r={isCurrentUser ? 4 : 3}
                  fill={color}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Légende */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
        {ordered.map((u) => (
          <div key={u.userId} className="flex items-center gap-1.5">
            <span
              className="inline-block rounded-full"
              style={{
                width: 10,
                height: 10,
                background: colorMap[u.userId],
                opacity: u.userId === currentUserId ? 1 : 0.8,
              }}
            />
            <span
              className="text-xs"
              style={{
                color: u.userId === currentUserId ? "#f9fafb" : "#9ca3af",
                fontWeight: u.userId === currentUserId ? 600 : 400,
              }}
            >
              {u.username}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
