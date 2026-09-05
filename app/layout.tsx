import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "MedLens — Clinical Information Intelligence System",
  description: "AI-Powered Clinical Workspace for Auditable Medical Record Synthesis, Strict Range Provenance, and Conflict Detection",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 antialiased text-slate-900 dark:text-slate-100 selection:bg-sky-500 selection:text-white">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
