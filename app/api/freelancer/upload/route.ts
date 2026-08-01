import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") || "profile");
  if (
    !(file instanceof File) ||
    !allowed.has(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    return NextResponse.json(
      { error: "Use a JPG, PNG or WebP image smaller than 5 MB." },
      { status: 400 },
    );
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `${user.id}/${kind}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("freelancer-media")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error)
    return NextResponse.json(
      { error: "Image storage is not configured yet." },
      { status: 503 },
    );
  const { data } = supabase.storage.from("freelancer-media").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}
export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = request.nextUrl.searchParams.get("url") || "";
  const marker = "/freelancer-media/";
  const path = decodeURIComponent(
    url.includes(marker) ? url.split(marker)[1] : "",
  );
  if (!path.startsWith(`${user.id}/`))
    return NextResponse.json({ error: "Invalid media path." }, { status: 400 });
  const { error } = await supabase.storage
    .from("freelancer-media")
    .remove([path]);
  return error
    ? NextResponse.json({ error: "Could not remove image." }, { status: 400 })
    : NextResponse.json({ removed: true });
}
