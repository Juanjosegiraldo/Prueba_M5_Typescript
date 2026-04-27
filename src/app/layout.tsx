import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "CasaHub", template: "%s | CasaHub" },
  description: "Real estate listing platform — manage, publish and explore properties with role-based access.",
  keywords: ["real estate", "casas", "inmobiliaria", "propiedades", "Colombia"],
  authors: [{ name: "CasaHub Team" }],
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "CasaHub",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
