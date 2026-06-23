import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hailey — AI Front Desk for Local Businesses",
  description: "Replace your front desk calls, fill your calendar automatically, and follow up with every client.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-gray-900">{children}</body>
    </html>
  );
}
