import { NextRequest, NextResponse } from "next/server";
import { requireControlCentre } from "@/lib/control-centre";
import { validUuid } from "@/lib/job-opportunities";

export async function GET(request: NextRequest) {
  const auth = await requireControlCentre();
  if (!auth) return NextResponse.json({ error: "Owner Control Centre access required." }, { status: 403 });
  const id = request.nextUrl.searchParams.get("applicationId");
  const index = Number(request.nextUrl.searchParams.get("index") || "0");
  if (!validUuid(id) || !Number.isInteger(index) || index < 0 || index > 9)
    return NextResponse.json({ error: "Invalid private-document request." }, { status: 400 });
  const { data } = await auth.admin.from("verification_applications").select("document_references").eq("id", id).maybeSingle();
  const path = data?.document_references?.[index];
  if (!path) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  const { data: signed, error } = await auth.admin.storage.from("verification-private").createSignedUrl(path, 60);
  if (error || !signed?.signedUrl) return NextResponse.json({ error: "Could not open this private document." }, { status: 400 });
  return NextResponse.redirect(signed.signedUrl);
}
