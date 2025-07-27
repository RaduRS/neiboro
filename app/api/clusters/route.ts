import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizePostcode } from "@/lib/postcode-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postcode = searchParams.get("postcode");

    if (!postcode) {
      return NextResponse.json(
        { error: "Postcode is required" },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Admin client not available" },
        { status: 500 }
      );
    }

    const normalizedPostcode = normalizePostcode(postcode);

    const { data, error } = await supabaseAdmin
      .from("clusters")
      .select("*")
      .eq("postcode", normalizedPostcode)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ cluster: null });
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ cluster: data });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
