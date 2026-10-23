import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Météo GIF — Atelier Nullschool",
  description: "Animations météo automatiques.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
