"use client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }
  return (
    <button
      onClick={logout}
      className="w-full text-left text-xs font-bold uppercase tracking-widest px-3 py-2.5 rounded-xl transition-colors hover:bg-white/5"
      style={{ color: "rgba(255,255,255,0.3)" }}
    >
      ↩ Sign out
    </button>
  );
}
