import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = getDashboardStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load dashboard stats" }, { status: 500 });
  }
}
