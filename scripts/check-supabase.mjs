// TEMPORÁRIO: teste somente leitura da conexão com o Supabase. Não imprime credenciais.
// Uso: node --env-file=.env scripts/check-supabase.mjs
const need = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "INTEGRATION_MASTER_SECRET"];
const secrets = need.map((n) => process.env[n]).filter(Boolean);
const mask = (s) => secrets.reduce((t, v) => t.split(v).join("***"), String(s));
const line = (ok, t) => console.log(`${ok === null ? "[AVISO]" : ok ? "[OK]   " : "[FALHA]"} ${t}`);
let bad = 0;
console.log("1) Variáveis de ambiente (somente presença)");
for (const n of need) { const ok = !!process.env[n]; line(ok, `${n} ${ok ? "carregada" : "AUSENTE"}`); if (!ok) bad++; }
if (bad) { console.log("\nCorrija o .env e rode novamente: node --env-file=.env scripts/check-supabase.mjs"); process.exit(1); }
try { const u = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL); line(u.protocol === "https:", "URL do Supabase é válida e usa HTTPS"); } catch { line(false, "NEXT_PUBLIC_SUPABASE_URL não é uma URL válida"); process.exit(1); }
try { const role = JSON.parse(Buffer.from(process.env.SUPABASE_SERVICE_ROLE_KEY.split(".")[1], "base64url")).role; line(role === "service_role" ? true : false, `Chave tem papel "${role}" ${role === "service_role" ? "" : "(esperado: service_role; você pode ter colocado a chave anon)"}`); } catch { line(null, "Formato da chave não é JWT clássico (pode ser o novo formato sb_secret_...); seguindo"); }
let createClient;
try { ({ createClient } = await import("@supabase/supabase-js")); } catch { line(false, "@supabase/supabase-js não instalado (rode npm install)"); process.exit(1); }
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
console.log("\n2) Tabelas (consulta de contagem, somente leitura)");
for (const t of ["products", "product_integrations", "integration_events"]) {
  const { count, error, status } = await db.from(t).select("*", { count: "exact", head: true });
  if (!error) { line(true, `${t}: existe e respondeu (${count} registro${count === 1 ? "" : "s"})${count === 0 ? ", vazia não é erro" : ""}`); continue; }
  bad++; const m = mask(error.message || ""), c = error.code || "";
  if (c === "PGRST205" || c === "42P01") line(false, `${t}: tabela não existe. Aplique as migrations em ordem (0001, 0002, 0003).`);
  else if (status === 401 || status === 403 || /jwt|api key|invalid/i.test(m)) line(false, `${t}: credencial recusada (HTTP ${status}). Confira a SUPABASE_SERVICE_ROLE_KEY e se pertence a este projeto.`);
  else if (/fetch failed|ENOTFOUND|ECONNREFUSED|network|timeout/i.test(m) || status === 0) line(false, `${t}: sem resposta do servidor (rede ou URL do projeto incorreta). Detalhe: ${m.slice(0, 120)}`);
  else line(false, `${t}: erro ${c || status}: ${m.slice(0, 160)}`);
}
console.log(bad ? "\nResultado: há problemas acima." : "\nResultado: conexão e tabelas OK (nenhum dado foi alterado).");
process.exit(bad ? 1 : 0);
