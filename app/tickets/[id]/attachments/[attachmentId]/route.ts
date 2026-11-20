import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/admin";
import { ATTACHMENT_BUCKET } from "@/lib/attachments";

// Opens an attachment. The row lookup runs under the caller's RLS, so only
// the ticket's client or an admin gets past it; they are then redirected to a
// signed URL that expires in a minute. The bucket itself is never public.
export async function GET(req: NextRequest, ctx: RouteContext<"/tickets/[id]/attachments/[attachmentId]">) {
  const { id, attachmentId } = await ctx.params;
  const supabase = await createClient();
  const { data: att } = await supabase
    .from("ticket_attachments")
    .select("storage_path, file_name, mime_type")
    .eq("id", attachmentId)
    .eq("ticket_id", id)
    .maybeSingle();
  if (!att) return new NextResponse("Not found", { status: 404 });

  // Images (content already sniffed on upload) may display inline; everything else downloads.
  const inline = req.nextUrl.searchParams.has("inline") && att.mime_type.startsWith("image/");
  const { data } = await createAdmin()
    .storage.from(ATTACHMENT_BUCKET)
    .createSignedUrl(att.storage_path, 60, inline ? undefined : { download: att.file_name });
  if (!data) return new NextResponse("Attachment unavailable", { status: 502 });
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "private, no-store" } });
}
