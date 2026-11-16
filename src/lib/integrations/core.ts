import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
export const TOLERANCE_S = 300;
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export function generateKey() {
  const prefix = randomBytes(4).toString("hex");
  const key = `sck_${prefix}_${randomBytes(24).toString("base64url")}`;
  return { key, prefix, hash: sha256(key) };
}
export const signingSecret = (master: string, integrationId: string) =>
  createHmac("sha256", master).update(integrationId).digest("hex");
export const sign = (secret: string, ts: string, body: string) =>
  createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
const safeEq = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
const TYPES = ["ping", "subscriber.upserted", "subscription.upserted", "payment.recorded"];
export function validate(e: any): string | null {
  if (!e || typeof e !== "object") return "evento inválido";
  if (typeof e.id !== "string" || !e.id || e.id.length > 128) return "id obrigatório (até 128 caracteres)";
  if (!TYPES.includes(e.type)) return `tipo desconhecido: ${String(e.type).slice(0, 40)}`;
  const d = e.data ?? {};
  if (e.type === "subscriber.upserted" && (!d.external_id || !d.name || !/^\S+@\S+\.\S+$/.test(d.email || "")))
    return "subscriber requer external_id, name e email válidos";
  if (e.type === "subscription.upserted" && (!d.external_id || !d.subscriber_external_id || !d.plan?.name ||
    !Number.isInteger(d.plan?.price_cents) || d.plan.price_cents < 0 ||
    !["trialing", "active", "past_due", "canceled"].includes(d.status))) return "subscription inválida";
  if (e.type === "payment.recorded" && (!d.subscription_external_id || !Number.isInteger(d.amount_cents) ||
    !["approved", "pending", "failed", "refunded"].includes(d.status))) return "payment inválido";
  return null;
}
export type Integration = { id: string; product_id: string; key_hash: string; revoked_at: string | null };
export type Deps = {
  master: string; now?: () => number;
  findByPrefix(prefix: string): Promise<Integration | null>;
  record(i: { integration_id: string; product_id: string; event: any }): Promise<"processed" | "duplicate">;
  fail(i: { integration_id: string; product_id: string; event: any; error: string }): Promise<void>;
};
const deny = { status: 401, body: { error: "credenciais inválidas" } };
export async function handleEvent(h: (n: string) => string | null, raw: string, d: Deps) {
  const key = h("x-sc-key") || "", ts = h("x-sc-timestamp") || "", sig = h("x-sc-signature") || "";
  const m = /^sck_([0-9a-f]{8})_/.exec(key);
  if (!m) return deny;
  const it = await d.findByPrefix(m[1]);
  if (!it || it.revoked_at || !safeEq(sha256(key), it.key_hash)) return deny;
  const now = (d.now ?? Date.now)() / 1000;
  if (!/^\d+$/.test(ts) || Math.abs(now - Number(ts)) > TOLERANCE_S) return deny;
  if (!safeEq(sign(signingSecret(d.master, it.id), ts, raw), sig)) return deny;
  let body: any;
  try { body = JSON.parse(raw); } catch { return { status: 400, body: { error: "JSON inválido" } }; }
  const events = Array.isArray(body?.events) ? body.events : [body];
  if (events.length === 0 || events.length > 500) return { status: 400, body: { error: "envie de 1 a 500 eventos" } };
  const r = { processed: 0, duplicates: 0, failed: 0, errors: [] as string[] };
  for (const event of events) {
    const ctx = { integration_id: it.id, product_id: it.product_id, event };
    const bad = validate(event);
    if (bad) { r.failed++; r.errors.push(bad); await d.fail({ ...ctx, error: bad }); continue; }
    try { (await d.record(ctx)) === "duplicate" ? r.duplicates++ : r.processed++; }
    catch (e: any) { r.failed++; r.errors.push(String(e.message)); await d.fail({ ...ctx, error: String(e.message) }); }
  }
  return { status: r.failed === events.length ? 422 : 200, body: r };
}
