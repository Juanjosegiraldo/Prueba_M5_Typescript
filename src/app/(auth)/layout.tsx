import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Access", template: "%s | CasaHub" },
  description: "Sign in or create your CasaHub account to start managing real estate listings.",
  robots: { index: false, follow: false }, // auth pages not indexed
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      {children}
    </div>
  );
}
