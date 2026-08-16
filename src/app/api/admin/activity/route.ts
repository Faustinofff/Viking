import { NextRequest, NextResponse } from "next/server";
import { loadRawSnapshot, computeSnapshot, buildFeed } from "@/lib/admin-data";
import { activityGroup } from "@/lib/admin-types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const raw = await loadRawSnapshot();
    const computed = computeSnapshot(raw);
    let feed = buildFeed(computed);

    const group = req.nextUrl.searchParams.get("group") ?? "all";
    const range = req.nextUrl.searchParams.get("range") ?? "all";

    if (group && group !== "all") {
      feed = feed.filter((e) => activityGroup(e.type) === group);
    }

    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const since =
      range === "today"
        ? (() => {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            return d.getTime();
          })()
        : range === "7d"
        ? now - 7 * DAY
        : range === "30d"
        ? now - 30 * DAY
        : null;

    if (since !== null) {
      feed = feed.filter((e) => {
        const t = new Date(e.ts).getTime();
        return !isNaN(t) && t >= since;
      });
    }

    return NextResponse.json({ feed });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
