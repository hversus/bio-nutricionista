import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Seu próximo passo | Nutrição", description: "Uma conversa inicial para entender como posso te acompanhar." };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="pt-BR"><body>{children}</body></html>; }
