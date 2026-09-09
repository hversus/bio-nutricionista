import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Converse com Luana Turque | Nutrição",
  description: "Uma conversa confidencial para entender como Luana Turque pode te acompanhar.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="pt-BR"><body>{children}</body></html>; }
