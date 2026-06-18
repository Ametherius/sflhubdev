import { weekEndISO } from "@/lib/weekDates";
import { NextResponse } from "next/server";

const MOTIVE_BASE = "https://api.gomotive.com";
const TIME_ZONE = "America/Edmonton";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get("weekStart");

  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json(
      { error: "weekStart is required (YYYY-MM-DD)." },
      { status: 400 },
    );
  }

  const start = new Date(`${weekStart}T00:00:00`);
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json(
      { error: "weekStart is not a valid date" },
      { status: 400 },
    );
  }
  const weekEnd = weekEndISO(weekStart);
  if (!weekEnd) {
    return NextResponse.json(
      { error: "weekStart is not a valid date" },
      { status: 400 },
    );
  }
  const apiKey = process.env.MOTIVE_API_KEY;
}
