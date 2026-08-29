import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getHallOfFame, getMyChampionCounts, getPersonalForm } from "@/lib/archive";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const [hallOfFame, form, counts] = await Promise.all([
    getHallOfFame(),
    getPersonalForm(userId),
    getMyChampionCounts(userId),
  ]);

  return NextResponse.json({
    weeklyChampions: hallOfFame.weekly,
    seasonChampions: hallOfFame.season,
    form,
    myWeeklyTitles: counts.weeklyCount,
    mySeasonTitles: counts.seasonCount,
  });
}
