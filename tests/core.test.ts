import test from "node:test"; import assert from "node:assert/strict";
import { generateKey, signingSecret, sign, handleEvent, sha256 } from "../src/lib/integrations/core.ts";
const master = "m".repeat(32), k = generateKey(), it = { id: "int-1", product_id: "p1", key_hash: k.hash, revoked_at: null as string | null };
const seen = new Set<string>(), fails: string[] = [];
const deps = { master, findByPrefix: async (p: string) => (p === k.prefix ? it : null),
  record: async ({ event }: any) => { if (event.data?.boom) throw new Error("erro de banco"); const id = event.id; if (seen.has(id)) return "duplicate" as const; seen.add(id); return "processed" as const; },
  fail: async ({ error }: any) => { fails.push(error); } };
const send = (body: any, o: any = {}) => { const raw = JSON.stringify(body), ts = o.ts ?? String(Math.floor(Date.now() / 1000));
  const sig = o.sig ?? sign(signingSecret(master, "int-1"), ts, raw); const H: any = { "x-sc-key": o.key ?? k.key, "x-sc-timestamp": ts, "x-sc-signature": sig };
  return handleEvent((n) => H[n] ?? null, raw, deps); };
const ping = (id: string) => ({ id, type: "ping", data: {} });
test("chave: só o hash é guardado e o formato é sck_prefixo_segredo", () => { assert.equal(k.hash, sha256(k.key)); assert.match(k.key, /^sck_[0-9a-f]{8}_/); assert.ok(!k.hash.includes(k.key)); });
test("evento válido é processado", async () => { const r = await send(ping("e1")); assert.equal(r.status, 200); assert.equal((r.body as any).processed, 1); });
test("evento repetido é ignorado (idempotência)", async () => { const r = await send(ping("e1")); assert.equal((r.body as any).duplicates, 1); assert.equal((r.body as any).processed, 0); });
test("assinatura HMAC errada é negada", async () => assert.equal((await send(ping("e2"), { sig: "0".repeat(64) })).status, 401));
test("timestamp antigo é negado (anti-replay)", async () => assert.equal((await send(ping("e3"), { ts: String(Math.floor(Date.now() / 1000) - 3600) })).status, 401));
test("chave desconhecida ou adulterada é negada", async () => { assert.equal((await send(ping("e4"), { key: "sck_deadbeef_x" })).status, 401); assert.equal((await send(ping("e4"), { key: k.key + "x" })).status, 401); });
test("chave revogada é negada", async () => { it.revoked_at = "agora"; assert.equal((await send(ping("e5"))).status, 401); it.revoked_at = null; });
test("payload inválido é registrado como falha", async () => { const n = fails.length; const r = await send({ id: "e6", type: "subscriber.upserted", data: { name: "A" } }); assert.equal(r.status, 422); assert.equal(fails.length, n + 1); });
test("erro de banco vira falha registrada", async () => { const r = await send({ id: "e7", type: "ping", data: { boom: 1 } }); assert.equal(r.status, 422); assert.ok(fails.includes("erro de banco")); });
test("lote (sync) mistura novos, duplicados e inválidos sem duplicar", async () => { const r: any = await send({ events: [ping("e1"), ping("e8"), { id: "e9", type: "x" }] }); assert.deepEqual([r.body.processed, r.body.duplicates, r.body.failed], [1, 1, 1]); });
