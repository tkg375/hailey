import { getSession, type SessionPayload } from "./session";
import { redirect } from "next/navigation";

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireSuperAdmin(): Promise<void> {
  const cookieStore = await import("next/headers").then(m => m.cookies());
  const token = (await cookieStore).get("hailey_admin_session")?.value;
  if (!token || token !== process.env.SUPER_ADMIN_SECRET) {
    redirect("/admin/login");
  }
}
