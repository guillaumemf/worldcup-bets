import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePoints, calculateKnockoutPoints, KNOCKOUT_STAGES } from "@/lib/points";

export const dynamic = "force-dynamic";

// GET /api/matches/sync — appelé par cron-job.org toutes les 5 minutes
export async function GET(req: Request) {
  // Vérification du token secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const token = new URL(req.url).searchParams.get("token");
    if (token !== cronSecret) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  }

  const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
  if (!API_KEY) {
    return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });
  }

  const matches = await prisma.match.findMany({
    where: {
      status: { in: ["UPCOMING", "LIVE"] as string[] },
      externalId: { not: null },
    },
  });

  if (matches.length === 0) return NextResponse.json({ updated: 0 });

  const ids = matches.map((m) => m.externalId).join(",");
  const res = await fetch(
    `https://api.football-data.org/v4/matches?ids=${ids}`,
    {
      headers: { "X-Auth-Token": API_KEY },
      // Next.js 14 met les fetch() en cache par défaut (Data Cache Vercel, clé = URL).
      // Quand la liste d'ids ne change plus (ex: entre deux tours), la réponse reste
      // figée indéfiniment et le sync réécrit d'anciennes données. no-store = toujours frais.
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Erreur API externe" }, { status: 502 });
  }

  const data = await res.json();
  let updated = 0;
  const finishedMatchIds: string[] = [];

  for (const apiMatch of data.matches) {
    const isFinished = apiMatch.status === "FINISHED";
    const isLive = apiMatch.status === "IN_PLAY" || apiMatch.status === "PAUSED";

    const isPenaltyShootout = apiMatch.score?.duration === "PENALTY_SHOOTOUT";
    const isExtraTime = apiMatch.score?.duration === "EXTRA_TIME";

    // ── Score 90 min (temps réglementaire) ───────────────────────────────────
    //
    // REGULAR          : fullTime = score final 90 min → on l'utilise directement
    // PENALTY_SHOOTOUT : fullTime = agrégat aberrant (inclut les pens) → on utilise extraTime
    //                    extraTime = score cumulé après prolong. (= score 90 min, aucun but en prolong.)
    // EXTRA_TIME       : fullTime = score final après prolong. (ex. 3-2)
    //                    → NE PAS écraser homeScore/awayScore.
    //                    Le score 90 min (nul) a été stocké lors des syncs LIVE en temps réglementaire.
    //                    Dès que duration passe à "EXTRA_TIME", fullTime reflète le score live en prolong.
    //                    On préserve donc la valeur déjà en base (le nul à 90 min).
    let homeScore: number | null = null;
    let awayScore: number | null = null;
    const updateRegScore = !isExtraTime;

    if (updateRegScore) {
      homeScore = isPenaltyShootout
        ? (apiMatch.score?.extraTime?.home ?? null)
        : (apiMatch.score?.fullTime?.home ?? null);
      awayScore = isPenaltyShootout
        ? (apiMatch.score?.extraTime?.away ?? null)
        : (apiMatch.score?.fullTime?.away ?? null);
    }

    // ── Score après prolongations ─────────────────────────────────────────────
    // EXTRA_TIME       : fullTime = score final après prolong.
    // PENALTY_SHOOTOUT : extraTime = score cumulé après prolong. (avant TAB)
    const aetHomeScore = isExtraTime
      ? (apiMatch.score?.fullTime?.home ?? null)
      : isPenaltyShootout
      ? (apiMatch.score?.extraTime?.home ?? null)
      : null;
    const aetAwayScore = isExtraTime
      ? (apiMatch.score?.fullTime?.away ?? null)
      : isPenaltyShootout
      ? (apiMatch.score?.extraTime?.away ?? null)
      : null;

    // Vainqueur aux tirs au but (depuis score.penalties)
    let penaltyWinner: string | null = null;
    const penHome = apiMatch.score?.penalties?.home;
    const penAway = apiMatch.score?.penalties?.away;
    if (penHome != null && penAway != null) {
      penaltyWinner = penHome > penAway ? "home" : "away";
    }

    const dbMatch = matches.find((m) => m.externalId === String(apiMatch.id));
    if (!dbMatch) continue;

    const homeTeamName = apiMatch.homeTeam?.name;
    const awayTeamName = apiMatch.awayTeam?.name;

    await prisma.match.update({
      where: { id: dbMatch.id },
      data: {
        // Pour EXTRA_TIME : homeScore/awayScore intentionnellement préservés (score 90 min en base)
        ...(updateRegScore ? { homeScore, awayScore } : {}),
        aetHomeScore,
        aetAwayScore,
        penaltyWinner,
        status: isFinished ? "FINISHED" : isLive ? "LIVE" : "UPCOMING",
        ...(homeTeamName && homeTeamName !== "TBD" ? { homeTeam: homeTeamName } : {}),
        ...(awayTeamName && awayTeamName !== "TBD" ? { awayTeam: awayTeamName } : {}),
      },
    });

    // Pour EXTRA_TIME FINISHED : homeScore vient du DB (pas de la variable locale)
    const effectiveHomeScore = isExtraTime ? dbMatch.homeScore : homeScore;
    const effectiveAwayScore = isExtraTime ? dbMatch.awayScore : awayScore;
    if (isFinished && effectiveHomeScore !== null && effectiveAwayScore !== null) {
      finishedMatchIds.push(dbMatch.id);
    }

    updated++;
  }

  // Pour chaque match terminé, recalculer les points avec les règles de CHAQUE ligue
  let betsUpdated = 0;
  if (finishedMatchIds.length > 0) {
    const leagues = await prisma.league.findMany({ include: { members: true } });

    for (const matchId of finishedMatchIds) {
      const match = await prisma.match.findUnique({ where: { id: matchId } });
      if (!match || match.homeScore === null || match.awayScore === null) continue;

      const isKnockout = KNOCKOUT_STAGES.has(match.stage);

      for (const league of leagues) {
        const memberIds = league.members.map((m) => m.userId);

        const groupRules = {
          exactScore: league.pointsExactScore,
          correctDiff: league.pointsCorrectDiff,
          correctWinner: league.pointsCorrectWinner,
        };

        const knockoutRules = {
          exactScore: league.knockoutPointsExactScore,
          correctOutcome: league.knockoutPointsCorrectOutcome,
          etBonus: league.knockoutPointsETBonus,
          etExact: league.knockoutPointsETExact,
          tabBonus: league.knockoutPointsTABBonus,
        };

        const bets = await prisma.bet.findMany({
          where: { matchId, userId: { in: memberIds } },
        });

        for (const bet of bets) {
          let points: number;

          if (isKnockout) {
            points = calculateKnockoutPoints(
              bet.predictedHome,
              bet.predictedAway,
              match.homeScore,
              match.awayScore,
              bet.predictedETHome,
              bet.predictedETAway,
              bet.predictedPenaltyWinner,
              match.aetHomeScore,
              match.aetAwayScore,
              match.penaltyWinner,
              knockoutRules
            );
          } else {
            points = calculatePoints(
              bet.predictedHome,
              bet.predictedAway,
              match.homeScore,
              match.awayScore,
              groupRules
            );
          }

          await prisma.bet.update({ where: { id: bet.id }, data: { points } });
          betsUpdated++;
        }
      }
    }
  }

  return NextResponse.json({ updated, betsUpdated, total: matches.length });
}
