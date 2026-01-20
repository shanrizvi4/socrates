import type { Metadata } from "next";
import "./globals.css";
import "../styles/graph.css";
import "../styles/cards.css";
import "../styles/popups.css";

export const metadata: Metadata = {
  title: "Socrates",
  description: "A recursive knowledge graph.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}