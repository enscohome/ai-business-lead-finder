import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: role } = await supabase
    .from("app_admins")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!role)
    return NextResponse.json(
      { error: "Administrator access required." },
      { status: 403 },
    );
  const id = request.nextUrl.searchParams.get("applicationId");
  const field =
    request.nextUrl.searchParams.get("kind") === "selfie"
      ? "selfie_storage_path"
      : "document_storage_path";
  const admin = createAdminClient();
  const { data } = await admin
    .from("freelancer_verification_applications")
    .select(field)
    .eq("id", id)
    .maybeSingle();
  const path = (data as Record<string, string | null> | null)?.[field];
  if (!path)
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  const { data: signed, error } = await admin.storage
    .from("verification-private")
    .createSignedUrl(path, 60);
  if (error || !signed?.signedUrl)
    return NextResponse.json(
      { error: "Could not open document." },
      { status: 400 },
    );
  return NextResponse.redirect(signed.signedUrl);
}
