import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vitória Serafim | Nutricionista",
  description:
    "Conheça a nutricionista Vitória Serafim. Conte o que você vem sentindo em uma conversa rápida e conheça o acompanhamento nutricional.",
  keywords: [
    "Vitória Serafim",
    "acompanhamento nutricional",
    "nutricionista online",
    "alimentação",
    "emagrecimento",
  ],
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
