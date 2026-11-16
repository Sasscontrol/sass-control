import { generateKey, signingSecret } from "@/lib/integrations/core";
import { admin, requireAdmin } from "@/lib/supabase";
const no = () => Response.json({ error: "não autorizado" }, { status: 401 });
// GET ?product_id= → status, último evento, histórico e erros (sem payload e sem segredos)
export async function GET(req: Request) {
  if (!(await requireAdmin())) return no();
  const pid = new URL(req.url).searchParams.get("product_id"); if (!pid) return Response.json({ error: "product_id obrigatório" }, { status: 400 });
  const db = admin();
  const { data: it } = await db.from("product_integrations").select("key_prefix,created_at,revoked_at,last_event_at").eq("product_id", pid).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: events } = await db.from("integration_events").select("event_id,type,status,error,received_at").eq("product_id", pid).order("received_at", { ascending: false }).limit(50);
  return Response.json({ status: !it ? "sem_chave" : it.revoked_at ? "revogada" : it.last_event_at ? "conectada" : "aguardando_evento", integration: it, events, errors: (events ?? []).filter((e) => e.status === "failed") });
}
// POST {product_id} → gera nova chave (revoga a anterior). Chave e segredo só aparecem nesta resposta.
export async function POST(req: Request) {
  const u = await requireAdmin(); if (!u) return no();
  const { product_id } = await req.json().catch(() => ({}));
  if (!product_id) return Response.json({ error: "product_id obrigatório" }, { status: 400 });
  const db = admin();
  await db.from("product_integrations").update({ revoked_at: new Date().toISOString() }).eq("product_id", product_id).is("revoked_at", null);
  const k = generateKey();
  const { data, error } = await db.from("product_integrations").insert({ product_id, key_prefix: k.prefix, key_hash: k.hash }).select("id").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ api_key: k.key, signing_secret: signingSecret(process.env.INTEGRATION_MASTER_SECRET!, data.id), aviso: "Guarde agora: não será exibido novamente." }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
// DELETE ?product_id= → revoga a chave ativa
export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return no();
  const pid = new URL(req.url).searchParams.get("product_id"); if (!pid) return Response.json({ error: "product_id obrigatório" }, { status: 400 });
  await admin().from("product_integrations").update({ revoked_at: new Date().toISOString() }).eq("product_id", pid).is("revoked_at", null);
  return Response.json({ ok: true });
}
