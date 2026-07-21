// =====================================================================
//  ELYRIA BIO  ·  RESTOCK EMAIL  (Supabase Edge Function + Resend)
//  Sends "back in stock" emails to everyone on a product's waitlist,
//  then marks them notified. Called from the admin console button.
//
//  Deploy (SETUP.md step 7):
//    supabase functions deploy send-restock --no-verify-jwt
//  Set secrets:
//    supabase secrets set RESEND_API_KEY=re_xxx
//    supabase secrets set FROM_EMAIL="Elyria Bio <alerts@elyriabio.com>"
// =====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { product_id } = await req.json();
    if (!product_id) return json({ error: "product_id required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: product } = await supabase
      .from("products").select("name, slug").eq("id", product_id).single();
    if (!product) return json({ error: "product not found" }, 404);

    const { data: signups } = await supabase
      .from("notify_signups")
      .select("id, name, email")
      .eq("product_id", product_id)
      .eq("notified", false);

    if (!signups || signups.length === 0) return json({ sent: 0 });

    const RESEND = Deno.env.get("RESEND_API_KEY")!;
    const FROM = Deno.env.get("FROM_EMAIL") || "Elyria Bio <onboarding@resend.dev>";
    const url = `https://elyriabio.com/products/${product.slug}.html`;

    let sent = 0;
    for (const s of signups) {
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1a1a1a">
          <h2 style="color:#a9792f">Back in stock</h2>
          <p>Hi ${escapeHtml(s.name || "there")},</p>
          <p><b>${escapeHtml(product.name)}</b> is available again. Supplies can move quickly —
             reserve yours below.</p>
          <p><a href="${url}" style="display:inline-block;background:#a9792f;color:#fff;
             text-decoration:none;padding:12px 22px;border-radius:24px">View ${escapeHtml(product.name)} →</a></p>
          <p style="font-size:12px;color:#888;margin-top:28px">
             Research Use Only — not for human or veterinary use.<br>
             You received this because you asked to be notified when this item restocked.</p>
        </div>`;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to: s.email, subject: `${product.name} is back in stock`, html }),
      });
      if (r.ok) {
        sent++;
        await supabase.from("notify_signups").update({ notified: true }).eq("id", s.id);
      }
    }
    return json({ sent, total: signups.length });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
