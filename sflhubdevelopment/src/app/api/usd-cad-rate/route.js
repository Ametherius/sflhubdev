import { NextResponse } from "next/server";

const FRANKFURTER_URL =
  "https://api.frankfurter.dev/v1/latest?base=USD&symbols=CAD";

/** Server-side USD/CAD (avoids browser CORS and deprecated .app redirects). */
export async function GET() {
  try {
    const res = await fetch(FRANKFURTER_URL, {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Exchange rate provider returned an error." },
        { status: 502 },
      );
    }
    const data = await res.json();
    const rate = data?.rates?.CAD;
    if (rate == null || !Number.isFinite(Number(rate))) {
      return NextResponse.json(
        { error: "USD/CAD rate missing from provider response." },
        { status: 502 },
      );
    }
    return NextResponse.json({
      rate: Math.round(Number(rate) * 10000) / 10000,
      date: data?.date ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the exchange rate service." },
      { status: 502 },
    );
  }
}
