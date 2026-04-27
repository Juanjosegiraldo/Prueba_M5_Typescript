"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import type { AuthUser } from "@/types/auth.types";

export default function LoginForm() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res  = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { toast.error(json.error || "Invalid credentials"); return; }
      toast.success(`Welcome, ${json.data.user.name}!`);
      login(json.data.user as AuthUser);
      window.location.replace("/dashboard");
    } catch { toast.error("Connection error"); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="text-center mb-8">
          <span className="text-5xl block mb-3">🏠</span>
          <h1 className="text-2xl font-bold text-gray-900">CasaHub</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>
        <div className="mb-6 p-3 bg-emerald-50 rounded-xl text-xs text-emerald-700 border border-emerald-200">
          <p className="font-semibold mb-1">🔑 Test credentials:</p>
          <p><span className="font-medium">Admin:</span> admin@casahub.com / admin123</p>
          <p><span className="font-medium">Agent:</span> agente@casahub.com / agent123</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@casahub.com" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
          <p className="text-center text-sm text-gray-500">
            No account?{" "}
            <Link href="/register" className="text-emerald-600 font-medium hover:text-emerald-700">Register here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
