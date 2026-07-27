import { NextRequest, NextResponse } from "next/server";
import { Business } from "@/types";
import { generateAllSalesTools } from "@/lib/ai-tools";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { business } = body as { business: Business };

    if (!business) {
      return NextResponse.json(
        { error: "Business data is required" },
        { status: 400 }
      );
    }

    const tools = generateAllSalesTools(business);
    return NextResponse.json({ tools });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate sales tools" },
      { status: 500 }
    );
  }
}
