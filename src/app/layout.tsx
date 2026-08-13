import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cantine",
  description: "Inscription et suivi de la cantine du personnel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
