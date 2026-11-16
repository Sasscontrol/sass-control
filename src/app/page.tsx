// DADOS DE DEMONSTRAÇÃO: substituir por consultas ao Supabase.
const kpis = [["SaaS cadastrados","3"],["Assinantes","1.284"],["Assinaturas ativas","1.047"],["Em teste","96"],["MRR","R$ 38.420"],["Cancelamento","2,1%"]];
const rev = [12,15,18,22,27,31,35,38];
export default function Home() {
  const max = Math.max(...rev);
  return (<div className="space-y-6"><h1 className="text-xl font-semibold">Visão geral <span className="ml-2 text-xs text-amber-400">dados de demonstração</span></h1>
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">{kpis.map(([l,v]) => <div key={l} className="rounded-lg border border-line bg-card p-4"><div className="text-xs text-muted">{l}</div><div className="mt-1 text-2xl font-semibold">{v}</div></div>)}</div>
    <div className="rounded-lg border border-line bg-card p-4"><div className="text-sm mb-3">Receita mensal (mil R$)</div>
      <svg viewBox="0 0 160 60" className="w-full h-40">{rev.map((v,i) => <rect key={i} x={i*20+4} y={56-(v/max)*50} width="12" height={(v/max)*50} rx="2" fill="#8b5cf6" opacity={0.4+i*0.08} />)}</svg></div></div>);
}
