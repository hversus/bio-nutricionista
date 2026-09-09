import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Luana Turque | Nutricionista do seu intestino",
  description:
    "Me conta o que você sente. Oito perguntas rápidas com a Lu, nutricionista especialista em saúde intestinal, e no fim você escolhe o próximo passo.",
  keywords: [
    "nutricionista intestinal",
    "saúde intestinal",
    "nutricionista online",
    "inchaço abdominal",
    "candidíase de repetição",
    "intestino preso",
    "SIBO",
    "disbiose",
    "nutricionista funcional",
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
