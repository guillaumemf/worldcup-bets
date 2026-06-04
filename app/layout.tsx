import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Matchguess Contest",
  description: "Fais tes pronostics avec tes amis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-950 text-gray-100">
        <header className="bg-red-700 text-white py-4 px-6 shadow">
          <h1 className="text-xl font-bold tracking-tight">
            Matchguess Contest
          </h1>
          <p className="text-xs italic text-red-200 mt-0.5">by Rayure, 21Ch211</p>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
