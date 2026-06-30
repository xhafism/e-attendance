import { requireAnyRole } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAnyRole(["admin", "hr"]);
  return <>{children}</>;
}
