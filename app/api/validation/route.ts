import { NextResponse } from "next/server";
import { runValidation } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = runValidation();
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
