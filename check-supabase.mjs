// Teste somente leitura da conexão com o Supabase. Não imprime nem registra credenciais.
// Uso (PowerShell, na raiz do projeto): node scripts/check-supabase.mjs
import { existsSync } from "node:fs";
if (existsSync(".env")) { try { process.loadEnvFile(".env"); } catch { console.log("[FALHA] Não foi possível ler o .env (exige Node 20.12 ou superior)."); process.exit(1); } }
else console.log("[AVISO] Arquivo .env não encontrado nesta pasta; usando apenas as variáveis do ambiente.");
const need = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "INTEGRATION_MASTER_SECRET"];
const secrets = need.map((n) => process.env[n]).filter(Boolean);
const mask = (s) => secrets.reduce((t, v) => t.split(v).join("***"), String(s ?? ""));
const line = (ok, t) => console.log(`${ok === null ? "[AVISO]" : ok ? "[OK]   " : "[FALHA]"} ${t}`);
const role = (jwt) => { try { return JSON.parse(Buffer.from(jwt.split(".")[1], "base64url")).role; } catch { return null; } };
let bad = 0;
console.log("1) Variáveis de ambiente (somente presença, valores nunca são exibidos)");
for (const n of need) { const ok = !!process.env[n]; line(ok, `${n} ${ok ? "configurada" : "AUSENTE"}`); if (!ok) bad++; }
if (bad) { console.log("\nPreencha as variáveis ausentes no .env e rode novamente."); process.exit(1); }
try { line(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).protocol === "https:", "URL do Supabase válida e com HTTPS"); } catch { line(false, "NEXT_PUBLIC_SUPABASE_URL não é uma URL válida"); process.exit(1); }
const rs = role(process.env.SUPABASE_SERVICE_ROLE_KEY), ra = role(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
if (rs) line(rs === "service_role", `SUPABASE_SERVICE_ROLE_KEY com papel "${rs}"${rs === "service_role" ? "" : " (esperado service_role; a chave pode estar trocada)"}`);
if (ra) line(ra === "anon", `NEXT_PUBLIC_SUPABASE_ANON_KEY com papel "${ra}"${ra === "anon" ? "" : " (esperado anon; a chave pode estar trocada)"}`);
if (process.env.INTEGRATION_MASTER_SECRET.length < 32) line(null, "INTEGRATION_MASTER_SECRET curto: use pelo menos 32 caracteres aleatórios");
let createClient;
try { ({ createClient } = await import("@supabase/supabase-js")); } catch { line(false, "@supabase/supabase-js não encontrado. Rode npm install."); process.exit(1); }
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
console.log("\n2) Conexão e tabelas (somente contagem de leitura)");
for (const t of ["products", "product_integrations", "integration_events"]) {
  let r;
  try { r = await db.from(t).select("*", { count: "exact", head: true }); } catch (e) { r = { error: { message: e?.message } , status: 0 }; }
  const { count, error, status } = r;
  if (!error) { line(true, `${t}: existe, ${count === 0 ? "vazia (isso não é erro)" : `${count} registro${count === 1 ? "" : "s"}`}`); continue; }
  bad++; const m = mask(error.message).slice(0, 160), c = error.code || "";
  if (c === "PGRST205" || c === "42P01") line(false, `${t}: tabela não existe. Aplique as migrations 0001, 0002 e 0003 nessa ordem.`);
  else if (status === 401 || status === 403 || /jwt|api key|invalid/i.test(m)) line(false, `${t}: credencial recusada (HTTP ${status}). Confira se a SUPABASE_SERVICE_ROLE_KEY é deste projeto.`);
  else if (status === 0 || /fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network/i.test(m)) line(false, `${t}: sem resposta do servidor. Verifique a internet e a NEXT_PUBLIC_SUPABASE_URL. Detalhe: ${m}`);
  else line(false, `${t}: erro ${c || status}: ${m}`);
}
console.log(bad ? "\nResultado: há problemas acima." : "\nResultado: conexão e tabelas OK. Nenhum dado foi alterado.");
process.exit(bad ? 1 : 0);
