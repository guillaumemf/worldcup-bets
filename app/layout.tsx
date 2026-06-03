import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pronostics Coupe du Monde 2026",
  description: "Fais tes pronostics avec tes amis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-green-700 text-white py-4 px-6 shadow">
          <h1 className="text-xl font-bold tracking-tight">
            ⚽ Pronostics CM 2026
          </h1>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
