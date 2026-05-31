import { NextRequest, NextResponse } from "next/server";
import { getClaims } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const result = getClaims({
      status:     sp.get("status")     || undefined,
      claim_type: sp.get("claim_type") || undefined,
      insurance:  sp.get("insurance")  || undefined,
      search:     sp.get("search")     || undefined,
      flagged:    sp.get("flagged") === "true",
      dateFrom:   sp.get("dateFrom")   || undefined,
      dateTo:     sp.get("dateTo")     || undefined,
      page:       Number(sp.get("page") || 1),
      pageSize:   Number(sp.get("pageSize") || 20),
      sortBy:     sp.get("sortBy")     || undefined,
      sortDir:   (sp.get("sortDir") as "asc" | "desc") || "desc",
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch claims" }, { status: 500 });
  }
}
