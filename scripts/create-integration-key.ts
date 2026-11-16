// Gera a primeira chave de um produto sem precisar de login no painel (o painel ainda não tem tela de login).
// Uso: node --env-file=.env --experimental-strip-types --no-warnings scripts/create-integration-key.ts <slug-do-produto>
import { createClient } from "@supabase/supabase-js";
import { generateKey, signingSecret } from "../src/lib/integrations/core.ts";
const slug = process.argv[2];
const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: sk, INTEGRATION_MASTER_SECRET: master } = process.env;
if (!slug || !url || !sk || !master) { console.error("Informe o slug do produto e preencha o .env (URL, service role e INTEGRATION_MASTER_SECRET)."); process.exit(1); }
const db = createClient(url, sk, { auth: { persistSession: false } });
const { data: p } = await db.from("products").select("id,name").eq("slug", slug).maybeSingle();
if (!p) { console.error(`Produto com slug "${slug}" não encontrado na tabela products.`); process.exit(1); }
await db.from("product_integrations").update({ revoked_at: new Date().toISOString() }).eq("product_id", p.id).is("revoked_at", null);
const k = generateKey();
const { data, error } = await db.from("product_integrations").insert({ product_id: p.id, key_prefix: k.prefix, key_hash: k.hash }).select("id").single();
if (error) { console.error("Falha ao gravar:", error.message); process.exit(1); }
console.log(`Produto: ${p.name}\nSC_KEY=${k.key}\nSC_SECRET=${signingSecret(master, data.id)}\nGuarde agora: estes valores não serão exibidos novamente.`);
