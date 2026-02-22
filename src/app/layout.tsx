import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CJO GYM - Membership Management System",
  description:
    "Complete gym membership management system with kiosk check-in, member registration, payment tracking, and revenue monitoring.",
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
