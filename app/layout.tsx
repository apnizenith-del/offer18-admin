import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offer18 Command Center",
  description: "Admin panel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
