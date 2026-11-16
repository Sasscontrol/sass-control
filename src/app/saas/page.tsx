// DADOS DE DEMONSTRAÇÃO: CRUD com Supabase ainda não implementado.
const rows = [["Produto A","a.exemplo.com","Produção",640],["Produto B","b.exemplo.com","Teste",212],["Produto C","c.exemplo.com","Desenvolvimento",0]];
export default function Saas() {
  return (<div className="space-y-4"><h1 className="text-xl font-semibold">Meus SaaS <span className="ml-2 text-xs text-amber-400">dados de demonstração</span></h1>
    <div className="overflow-x-auto rounded-lg border border-line bg-card"><table className="w-full text-sm"><thead className="text-muted text-left"><tr><th className="p-3">Nome</th><th>Domínio</th><th>Status</th><th>Assinantes</th></tr></thead>
    <tbody>{rows.map(r => <tr key={r[0]} className="border-t border-line">{r.map((c,i) => <td key={i} className="p-3">{c}</td>)}</tr>)}</tbody></table></div></div>);
}
