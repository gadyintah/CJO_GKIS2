import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CJO GYM - Management System",
  description: "CJO Gym Membership Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
