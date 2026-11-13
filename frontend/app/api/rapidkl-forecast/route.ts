import { NextResponse } from "next/server";
import { getRapidKlForecast } from "@/lib/rapidkl-forecast";

// Serves the latest Rapid KL ridership forecast to the demo chart. The upstream file changes once a day, so half an hour of caching is plenty.
export const revalidate = 1800;

export async function GET() {
  const forecast = await getRapidKlForecast();
  return NextResponse.json(forecast, { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400" } });
}
