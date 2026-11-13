import { NextResponse } from "next/server";
import { getRapidKlForecast } from "@/lib/rapidkl-forecast";

// Serves the latest Rapid KL ridership forecast to the demo chart. The upstream file changes once a day; this route is regenerated at most
// every 15 minutes. No extra Cache-Control header on purpose: a second cache layer on top of this one made a new forecast take over an hour to appear.
export const revalidate = 900;

export async function GET() {
  return NextResponse.json(await getRapidKlForecast());
}
