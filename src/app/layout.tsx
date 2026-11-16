import "./globals.css";
import Sidebar from "@/components/sidebar";
export const metadata = { title: "SaaS Control" };
export default function Root({ children }: { children: React.ReactNode }) {
  return (<html lang="pt-BR"><body className="md:flex min-h-screen"><Sidebar /><main className="flex-1 p-5 md:p-8">{children}</main></body></html>);
}
