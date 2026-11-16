import type { Config } from "tailwindcss";
export default { content: ["./src/**/*.{ts,tsx}"], theme: { extend: { colors: {
 bg:"#09090b", card:"#111114", line:"#232329", muted:"#8b8b96", brand:{DEFAULT:"#8b5cf6",soft:"#a78bfa"} } } }, plugins: [] } satisfies Config;
