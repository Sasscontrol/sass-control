"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const items = [["Visão geral","/"],["Meus SaaS","/saas"],["Assinantes",""],["Assinaturas",""],["Financeiro",""],["Monitoramento",""],["Alertas",""],["Relatórios",""],["Configurações",""]];
export default function Sidebar() {
  const path = usePathname();
  return (<aside className="md:w-56 md:min-h-screen border-b md:border-r border-line bg-card p-3 md:p-4">
    <div className="font-semibold mb-3 md:mb-6 text-brand-soft">SaaS Control</div>
    <nav className="flex md:flex-col gap-1 overflow-x-auto">{items.map(([l,h]) => h
      ? <Link key={l} href={h} className={`px-3 py-2 rounded-md text-sm whitespace-nowrap ${path===h?"bg-brand/15 text-brand-soft":"text-muted hover:text-white"}`}>{l}</Link>
      : <span key={l} title="Ainda não implementado" className="px-3 py-2 text-sm text-zinc-600 whitespace-nowrap cursor-not-allowed">{l}</span>)}</nav></aside>);
}
