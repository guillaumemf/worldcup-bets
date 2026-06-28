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
    { headers: { "X-Auth-Token": API_KEY } }
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

    const homeScore = apiMatch.score?.fullTime?.home ?? null;
    const awayScore = apiMatch.score?.fullTime?.away ?? null;

    // Prolongations et TAB (phase éliminatoire)
    const aetHomeScore = apiMatch.score?.extraTime?.home ?? null;
    const aetAwayScore = apiMatch.score?.extraTime?.away ?? null;

    // Vainqueur aux tirs au but
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
        homeScore,
        awayScore,
        aetHomeScore,
        aetAwayScore,
        penaltyWinner,
        status: isFinished ? "FINISHED" : isLive ? "LIVE" : "UPCOMING",
        ...(homeTeamName && homeTeamName !== "TBD" ? { homeTeam: homeTeamName } : {}),
        ...(awayTeamName && awayTeamName !== "TBD" ? { awayTeam: awayTeamName } : {}),
      },
    });

    if (isFinished && homeScore !== null && awayScore !== null) {
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
