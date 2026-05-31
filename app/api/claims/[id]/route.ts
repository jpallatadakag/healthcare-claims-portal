import { NextRequest, NextResponse } from "next/server";
import { getClaimById } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const claim = getClaimById(Number(id));
    if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(claim);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch claim" }, { status: 500 });
  }
}
