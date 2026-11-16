
import { admin } from "@/lib/supabase";

const stageLabels: Record<string, string> = {
  development: "Desenvolvimento",
  testing: "Teste",
  production: "Produção",
};

export default async function Saas() {
  const { data: products, error } = await admin()
    .from("products")
    .select("id, name, slug, domain, stage")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Meus SaaS</h1>
        <p className="text-red-400">
          Erro ao carregar produtos: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Meus SaaS</h1>

      <div className="overflow-x-auto rounded-lg border border-line bg-card">
        <table className="w-full text-sm">
          <thead className="text-muted text-left">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">Domínio</th>
              <th className="p-3">Status</th>
              <th className="p-3">Identificador</th>
            </tr>
          </thead>

          <tbody>
            {products?.map((product) => (
              <tr key={product.id} className="border-t border-line">
                <td className="p-3 font-medium">{product.name}</td>
                <td className="p-3">{product.domain || "Não informado"}</td>
                <td className="p-3">
                  {stageLabels[product.stage] || product.stage}
                </td>
                <td className="p-3">{product.slug}</td>
              </tr>
            ))}

            {products?.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-muted">
                  Nenhum SaaS cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
