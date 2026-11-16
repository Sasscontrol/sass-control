// Uso: SC_KEY=... SC_SECRET=... node scripts/send-test-event.mjs https://painel.exemplo.com
import { createHmac } from "node:crypto";
const [url] = process.argv.slice(2), { SC_KEY, SC_SECRET } = process.env;
if (!url || !SC_KEY || !SC_SECRET) { console.error("Informe a URL e as variáveis SC_KEY e SC_SECRET."); process.exit(1); }
const body = JSON.stringify({ id: `ping-${Date.now()}`, type: "ping", data: {} }), ts = String(Math.floor(Date.now() / 1000));
const sig = createHmac("sha256", SC_SECRET).update(`${ts}.${body}`).digest("hex");
const r = await fetch(`${url.replace(/\/$/, "")}/api/integrations/events`, { method: "POST", headers: { "content-type": "application/json", "x-sc-key": SC_KEY, "x-sc-timestamp": ts, "x-sc-signature": sig }, body });
console.log(r.status === 200 ? "CONEXÃO OK" : "FALHA", r.status, await r.text()); process.exit(r.status === 200 ? 0 : 1);
