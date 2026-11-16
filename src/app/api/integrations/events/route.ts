import { handleEvent } from "@/lib/integrations/core";
import { admin } from "@/lib/supabase";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 1_000_000) return Response.json({ error: "payload grande demais" }, { status: 413 });
  const db = admin();
  const out = await handleEvent((n) => req.headers.get(n), raw, {
    master: process.env.INTEGRATION_MASTER_SECRET!,
    findByPrefix: async (p) => (await db.from("product_integrations").select("id,product_id,key_hash,revoked_at").eq("key_prefix", p).maybeSingle()).data,
    record: async ({ integration_id, product_id, event }) => {
      const { data, error } = await db.rpc("process_integration_event", { p_integration: integration_id, p_product: product_id, p_event: event });
      if (error) throw new Error(error.message);
      return data;
    },
    fail: async ({ integration_id, product_id, event, error }) => {
      await db.from("integration_events").insert({ integration_id, product_id, event_id: String(event?.id ?? "").slice(0, 128) || null, type: String(event?.type ?? "").slice(0, 60) || null, status: "failed", error, payload: event });
    },
  });
  return Response.json(out.body, { status: out.status });
}
